import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JoinGameDto } from './dto/join-game.dto';
import { createEmptyScoreCard, reducer, isGameOver } from '@dice-app/game-core';
import { RollGameDto } from './dto/roll-game.dto'
import { ScoreGameDto } from './dto/score-game.dto'
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import { Prisma } from '../../generated/prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createGameDto: CreateGameDto, idempotencyKey?: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const existing = await this.prisma.game.findUnique({
      where: { creationKey: idempotencyKey },
    });

    if (existing) {
      return {
        game: existing,
        hostSecret: null,
      };
    }

    const hostSecret = randomBytes(32).toString('hex');
    const secretHash = createHash('sha256')
      .update(hostSecret)
      .digest('hex');

    try {
      const game = await this.prisma.game.create({
        data: {
          creationKey: idempotencyKey,

          participants: {
            create: {
              name: createGameDto.hostName,
              scoreCard: createEmptyScoreCard(),
              turnOrder: 1,
              role: 'HOST',

              identity: {
                create: {
                  secretHash,
                },
              },
            },
          },
        },

        include: {
          participants: true,
        },
      });

      return {
        game,
        hostSecret,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingGame = await this.prisma.game.findUniqueOrThrow({
          where: { creationKey: idempotencyKey },
        });

        return {
          game: existingGame,
          hostSecret: null,
        };
      }

      throw error;
    }
  }

  findAll() {
    return this.prisma.game.findMany()
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: {
            turnOrder: 'asc',
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  update(id: number, updateGameDto: UpdateGameDto) {
    return `This action updates a #${id} game`;
  }

  remove(id: number) {
    return `This action removes a #${id} game`;
  }

  async join(
    id: string,
    joinGameDto: JoinGameDto,
    idempotencyKey: string | undefined,
  ) {

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {

        const game = await tx.game.findUnique({
          where: { id },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.status !== 'LOBBY') {
          throw new BadRequestException('Players can only join a lobby');
        }

        const count = await tx.participant.count({
          where: {
            gameId: id,
          },
        });

        const player = await tx.participant.create({
          data: {
            name: joinGameDto.name,
            scoreCard: createEmptyScoreCard(),
            turnOrder: count + 1,
            gameId: id
          }
        })

        const updateResult = await tx.game.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            revision: {
              increment: 1,
            },
            lastActivity: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.game.findUniqueOrThrow({
          where: { id },
        });

        await tx.eventLog.create({
          data: {
            gameId: id,
            actionType: 'playerJoined',
            payload: {
              playerId: player.id
            },
            revisionAfter: updatedGame.revision,
            idempotencyKey,
          },
        });

        return player
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return this.findOne(id);
        }
      }
      throw error;
    }

  }

  async start(
    id: string,
    idempotencyKey: string | undefined,
    hostSecret: string,
  ) {

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    await this.verifyHost(id, hostSecret)

    try {
      return await this.prisma.$transaction(async (tx) => {

        const previousEvent = await tx.eventLog.findUnique({ where: { gameId_idempotencyKey: { gameId: id, idempotencyKey } } });
        if (previousEvent) return tx.game.findUniqueOrThrow({ where: { id } });

        const game = await tx.game.findUnique({
          where: { id },
          include: {
            participants: {
              orderBy: {
                turnOrder: 'asc',
              },
            },
          },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.participants.length === 0) {
          throw new BadRequestException('Game needs at least one player');
        }

        const firstPlayer = game.participants[0];

        const updateResult = await tx.game.updateMany({
          where: {
            id,
            revision: game.revision,
            status: 'LOBBY',
          },
          data: {
            status: 'IN_PROGRESS',
            currentPlayerId: firstPlayer.id,
            revision: {
              increment: 1,
            },
            lastActivity: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.game.findUniqueOrThrow({
          where: { id },
        });

        await tx.eventLog.create({
          data: {
            gameId: id,
            actionType: 'gameStarted',
            payload: {
              firstPlayerId: firstPlayer.id,
            },
            revisionAfter: updatedGame.revision,
            idempotencyKey,
          },
        });

        return updatedGame;

      })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return this.findOne(id);
        }
      }
      throw error;
    }
  }

  async roll(
    id: string,
    rollGameDto: RollGameDto,
    idempotencyKey: string | undefined,
    hostSecret: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    await this.verifyHost(id, hostSecret)

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previousEvent = await tx.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return tx.game.findUniqueOrThrow({ where: { id } });
        }

        const game = await tx.game.findUnique({
          where: { id },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.status !== 'IN_PROGRESS') {
          throw new BadRequestException('Game is not in progress');
        }

        if (game.currentPlayerId !== rollGameDto.playerId) {
          throw new BadRequestException('It is not this player\'s turn');
        }

        if (game.currentDice) {
          throw new BadRequestException('Roll was already made');
        }

        const updateResult = await tx.game.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            currentDice: rollGameDto.dice,
            revision: {
              increment: 1,
            },
            lastActivity: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.game.findUniqueOrThrow({
          where: { id },
        });

        await tx.eventLog.create({
          data: {
            gameId: id,
            actionType: 'diceConfirmation',
            payload: {
              playerId: rollGameDto.playerId,
              roll: rollGameDto.dice,
            },
            revisionAfter: updatedGame.revision,
            idempotencyKey,
          },
        });
        return updatedGame;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return this.findOne(id);
        }
      }
      throw error;
    }
  }

  async score(
    id: string,
    scoreGameDto: ScoreGameDto,
    idempotencyKey: string | undefined,
    hostSecret: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    await this.verifyHost(id, hostSecret)

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previousEvent = await tx.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return tx.game.findUniqueOrThrow({ where: { id } });
        }

        const game = await tx.game.findUnique({
          where: { id },
          include: {
            participants: {
              orderBy: { turnOrder: 'asc' },
            },
          },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.status !== 'IN_PROGRESS') {
          throw new BadRequestException('Game is not in progress');
        }

        if (!game.currentDice) {
          throw new BadRequestException('There is no dice roll to score');
        }

        if (game.currentPlayerId !== scoreGameDto.playerId) {
          throw new BadRequestException('It is not this player\'s turn');
        }

        const gameState = {
          players: game.participants.map((player) => ({
            id: player.id,
            name: player.name,
            card: player.scoreCard as ScoreCard,
          })),
          currentPlayerId: game.currentPlayerId!,
        };

        const newState = reducer(gameState, {
          type: 'saveCategory',
          playerId: scoreGameDto.playerId,
          category: scoreGameDto.category,
          dice: game.currentDice as DiceRoll,
        });

        const gameOver = isGameOver(newState);

        const updateResult = await tx.game.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            currentPlayerId: gameOver
              ? null
              : newState.currentPlayerId,
            currentDice: Prisma.DbNull,
            status: gameOver
              ? 'COMPLETED'
              : 'IN_PROGRESS',
            revision: {
              increment: 1,
            },
            lastActivity: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.game.findUniqueOrThrow({
          where: { id },
        });

        await Promise.all(
          newState.players.map((player) =>
            tx.participant.update({
              where: { id: player.id },
              data: {
                scoreCard: player.card,
              },
            }),
          ),
        );

        await tx.eventLog.create({
          data: {
            gameId: id,
            actionType: 'saveCategory',
            payload: {
              playerId: scoreGameDto.playerId,
              category: scoreGameDto.category,
            },
            revisionAfter: updatedGame.revision,
            idempotencyKey,
          },
        });

        return updatedGame;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.eventLog.findUnique({
          where: {
            gameId_idempotencyKey: {
              gameId: id,
              idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return this.findOne(id);
        }
      }

      throw error;
    }
  }

  private async verifyHost(gameId: string, hostSecret: string) {
    const host = await this.prisma.participant.findFirst({
      where: {
        gameId,
        role: 'HOST',
        identity: {
          secretHash: createHash('sha256')
            .update(hostSecret)
            .digest('hex'),
        },
      },
    });

    if (!host) {
      throw new ForbiddenException('Invalid host credentials');
    }

    return host;
  }
}

