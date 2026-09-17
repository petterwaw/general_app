import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JoinGameDto } from './dto/join-game.dto';
import { createEmptyScoreCard, reducer, isGameOver } from '@dice-app/game-core';
import { RollGameDto } from './dto/roll-game.dto'
import { ScoreGameDto } from './dto/score-game.dto'
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createGameDto: CreateGameDto) {
    const game = await this.prisma.gra.create({
      data: {},
    });

    return `Game has been created, id: ${game.id}`
  }

  findAll() {
    return this.prisma.gra.findMany()
  }

  async findOne(id: string) {
    const game = await this.prisma.gra.findUnique({
      where: { id },
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

        const game = await tx.gra.findUnique({
          where: { id },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        const count = await tx.uczestnik.count({
          where: {
            gameId: id,
          },
        });

        const player = await tx.uczestnik.create({
          data: {
            imie: joinGameDto.imie,
            kartaWynikow: createEmptyScoreCard(),
            kolejnosc: count + 1,
            gameId: id
          }
        })

        const updateResult = await tx.gra.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            revision: {
              increment: 1,
            },
            ostatniaAktywnosc: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.gra.findUniqueOrThrow({
          where: { id },
        });

        await tx.logZdarzen.create({
          data: {
            gameId: id,
            typAkcji: 'playerJoined',
            dane: {
              playerId: player.id
            },
            revisionPo: updatedGame.revision,
            kluczIdempotencji: idempotencyKey,
          },
        });

        return player
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
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
  ) {

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {

        const game = await tx.gra.findUnique({
          where: { id },
          include: {
            uczestnicy: {
              orderBy: {
                kolejnosc: 'asc',
              },
            },
          },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.uczestnicy.length === 0) {
          throw new BadRequestException('Game needs at least one player');
        }

        const firstPlayer = game.uczestnicy[0];

        const updateResult = await tx.gra.updateMany({
          where: {
            id,
            revision: game.revision,
            status: 'LOBBY',
          },
          data: {
            status: 'TRWA',
            aktualnyGraczId: firstPlayer.id,
            revision: {
              increment: 1,
            },
            ostatniaAktywnosc: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.gra.findUniqueOrThrow({
          where: { id },
        });

        await tx.logZdarzen.create({
          data: {
            gameId: id,
            typAkcji: 'gameStarted',
            dane: {
              firstPlayerId: firstPlayer.id,
            },
            revisionPo: updatedGame.revision,
            kluczIdempotencji: idempotencyKey,
          },
        });

        return updatedGame;

      })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
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
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previousEvent = await tx.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return tx.gra.findUniqueOrThrow({ where: { id } });
        }

        const game = await tx.gra.findUnique({
          where: { id },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.status !== 'TRWA') {
          throw new BadRequestException('Game is not in progress');
        }

        if (game.aktualnyGraczId !== rollGameDto.playerId) {
          throw new BadRequestException('It is not this player\'s turn');
        }

        if (game.aktualneKosci) {
          throw new BadRequestException('Roll was already made');
        }

        const updateResult = await tx.gra.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            aktualneKosci: rollGameDto.dice,
            revision: {
              increment: 1,
            },
            ostatniaAktywnosc: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.gra.findUniqueOrThrow({
          where: { id },
        });

        await tx.logZdarzen.create({
          data: {
            gameId: id,
            typAkcji: 'diceConfirmation',
            dane: {
              playerId: rollGameDto.playerId,
              roll: rollGameDto.dice,
            },
            revisionPo: updatedGame.revision,
            kluczIdempotencji: idempotencyKey,
          },
        });
        return updatedGame;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
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
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previousEvent = await tx.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
            },
          },
        });

        if (previousEvent) {
          return tx.gra.findUniqueOrThrow({ where: { id } });
        }

        const game = await tx.gra.findUnique({
          where: { id },
          include: {
            uczestnicy: true,
          },
        });

        if (!game) {
          throw new NotFoundException('Game not found');
        }

        if (game.status !== 'TRWA') {
          throw new BadRequestException('Game is not in progress');
        }

        if (!game.aktualneKosci) {
          throw new BadRequestException('There is no dice roll to score');
        }

        if (game.aktualnyGraczId !== scoreGameDto.playerId) {
          throw new BadRequestException('It is not this player\'s turn');
        }

        const gameState = {
          players: game.uczestnicy.map((player) => ({
            id: player.id,
            name: player.imie,
            card: player.kartaWynikow as ScoreCard,
          })),
          currentPlayerId: game.aktualnyGraczId!,
        };

        const newState = reducer(gameState, {
          type: 'saveCategory',
          playerId: scoreGameDto.playerId,
          category: scoreGameDto.category,
          dice: game.aktualneKosci as DiceRoll,
        });

        const gameOver = isGameOver(newState);

        const updateResult = await tx.gra.updateMany({
          where: {
            id,
            revision: game.revision,
          },
          data: {
            aktualnyGraczId: gameOver
              ? null
              : newState.currentPlayerId,
            aktualneKosci: Prisma.DbNull,
            status: gameOver
              ? 'ZAKONCZONA'
              : 'TRWA',
            revision: {
              increment: 1,
            },
            ostatniaAktywnosc: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Game state changed. Please retry the action.',
          );
        }

        const updatedGame = await tx.gra.findUniqueOrThrow({
          where: { id },
        });

        await Promise.all(
          newState.players.map((player) =>
            tx.uczestnik.update({
              where: { id: player.id },
              data: {
                kartaWynikow: player.card,
              },
            }),
          ),
        );

        await tx.logZdarzen.create({
          data: {
            gameId: id,
            typAkcji: 'saveCategory',
            dane: {
              playerId: scoreGameDto.playerId,
              category: scoreGameDto.category,
            },
            revisionPo: updatedGame.revision,
            kluczIdempotencji: idempotencyKey,
          },
        });

        return updatedGame;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previousEvent = await this.prisma.logZdarzen.findUnique({
          where: {
            gameId_kluczIdempotencji: {
              gameId: id,
              kluczIdempotencji: idempotencyKey,
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
}
