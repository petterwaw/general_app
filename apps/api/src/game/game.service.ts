import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createEmptyScoreCard, reducer, isGameOver } from '@dice-app/game-core';
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import {
  MAX_PLAYERS,
  type CreateGameInput,
  type GameView,
  type JoinGameInput,
  type RollInput,
  type ScoreInput,
} from '@dice-app/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { randomBytes, createHash } from 'crypto';
import { gameInclude, toGameView, type GameWithParticipants } from './game.view';

type GameAction = {
  actionType: string;
  payload: Prisma.InputJsonValue;
  update?: Prisma.GameUncheckedUpdateInput;
};

type ActionAccess = { hostOnly: false } | { hostOnly: true; hostSecret: string | undefined };

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) { }

  async create(input: CreateGameInput, idempotencyKey: string | undefined) {
    const key = requireIdempotencyKey(idempotencyKey);
    const hostSecret = randomBytes(32).toString('hex');

    try {
      const game = await this.prisma.game.create({
        data: {
          creationKey: key,
          participants: {
            create: input.players.map((name, index) => ({
              name,
              scoreCard: createEmptyScoreCard(),
              turnOrder: index + 1,
              role: index === 0 ? 'HOST' : 'PLAYER',
              ...(index === 0 && {
                identity: { create: { secretHash: hashSecret(hostSecret) } },
              }),
            })),
          },
        },
        include: gameInclude,
      });

      return { game: toGameView(game), hostSecret };
    } catch (error) {
      // Replayed Idempotency-Key: return the game created by the first request, without its secret.
      if (isUniqueViolation(error)) {
        const existingGame = await this.prisma.game.findUniqueOrThrow({
          where: { creationKey: key },
          include: gameInclude,
        });

        return { game: toGameView(existingGame), hostSecret: null };
      }

      throw error;
    }
  }

  async findAll(): Promise<GameView[]> {
    const games = await this.prisma.game.findMany({ include: gameInclude });
    return games.map(toGameView);
  }

  async findOne(id: string): Promise<GameView> {
    return toGameView(await loadGame(this.prisma, id));
  }

  join(id: string, input: JoinGameInput, idempotencyKey: string | undefined) {
    return this.runAction(id, idempotencyKey, { hostOnly: false }, async (tx, game) => {
      if (game.status !== 'LOBBY') {
        throw new BadRequestException('Players can only join a lobby');
      }

      if (game.participants.length >= MAX_PLAYERS) {
        throw new BadRequestException(`A game can have at most ${MAX_PLAYERS} players`);
      }

      const lastTurnOrder = game.participants.at(-1)?.turnOrder ?? 0;

      const player = await tx.participant.create({
        data: {
          name: input.name,
          scoreCard: createEmptyScoreCard(),
          turnOrder: lastTurnOrder + 1,
          gameId: id,
        },
      });

      return {
        actionType: 'playerJoined',
        payload: { playerId: player.id },
      };
    });
  }

  start(id: string, idempotencyKey: string | undefined, hostSecret: string | undefined) {
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, (_tx, game) => {
      if (game.status !== 'LOBBY') {
        throw new BadRequestException('Game has already started');
      }

      const firstPlayer = game.participants[0];

      if (!firstPlayer) {
        throw new BadRequestException('Game needs at least one player');
      }

      return {
        actionType: 'gameStarted',
        payload: { firstPlayerId: firstPlayer.id },
        update: {
          status: 'IN_PROGRESS',
          currentPlayerId: firstPlayer.id,
        },
      };
    });
  }

  roll(
    id: string,
    input: RollInput,
    idempotencyKey: string | undefined,
    hostSecret: string | undefined,
  ) {
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, (_tx, game) => {
      assertPlayersTurn(game, input.playerId);

      if (game.currentDice) {
        throw new BadRequestException('Roll was already made');
      }

      return {
        actionType: 'diceConfirmation',
        payload: { playerId: input.playerId, roll: input.dice },
        update: { currentDice: input.dice },
      };
    });
  }

  score(
    id: string,
    input: ScoreInput,
    idempotencyKey: string | undefined,
    hostSecret: string | undefined,
  ) {
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, async (tx, game) => {
      assertPlayersTurn(game, input.playerId);

      if (!game.currentDice) {
        throw new BadRequestException('There is no dice roll to score');
      }

      const newState = reducer(
        {
          players: game.participants.map((player) => ({
            id: player.id,
            name: player.name,
            card: player.scoreCard as ScoreCard,
          })),
          currentPlayerId: input.playerId,
        },
        {
          type: 'saveCategory',
          playerId: input.playerId,
          category: input.category,
          dice: game.currentDice as DiceRoll,
        },
      );

      const gameOver = isGameOver(newState);

      await Promise.all(
        newState.players.map((player) =>
          tx.participant.update({
            where: { id: player.id },
            data: { scoreCard: player.card },
          }),
        ),
      );

      return {
        actionType: 'saveCategory',
        payload: { playerId: input.playerId, category: input.category },
        update: {
          currentDice: Prisma.DbNull,
          status: gameOver ? 'COMPLETED' : 'IN_PROGRESS',
          currentPlayerId: gameOver ? null : newState.currentPlayerId,
        },
      };
    });
  }

  /**
   * Runs one game action: host check (for host-only actions), then a single transaction with
   * idempotency check, action-specific
   * validation and writes, revision bump guarded by optimistic locking, and an event log
   * entry. Replaying the same idempotency key returns the current game without re-running it.
   */
  private async runAction(
    id: string,
    idempotencyKey: string | undefined,
    access: ActionAccess,
    apply: (
      tx: Prisma.TransactionClient,
      game: GameWithParticipants,
    ) => GameAction | Promise<GameAction>,
  ): Promise<GameView> {
    if (access.hostOnly) {
      await this.verifyHost(id, access.hostSecret);
    }

    const key = requireIdempotencyKey(idempotencyKey);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (await findEvent(tx, id, key)) {
          return toGameView(await loadGame(tx, id));
        }

        const game = await loadGame(tx, id);
        const { actionType, payload, update } = await apply(tx, game);

        // Optimistic lock: the update matches nothing (P2025) if another action bumped the revision.
        const updatedGame = await tx.game
          .update({
            where: { id, revision: game.revision },
            data: {
              ...update,
              revision: { increment: 1 },
              lastActivity: new Date(),
            },
            include: gameInclude,
          })
          .catch((error: unknown) => {
            if (isRecordNotFound(error)) {
              throw new ConflictException('Game state changed. Please retry the action.');
            }
            throw error;
          });

        await tx.eventLog.create({
          data: {
            gameId: id,
            actionType,
            payload,
            revisionAfter: updatedGame.revision,
            idempotencyKey: key,
          },
        });

        return toGameView(updatedGame);
      });
    } catch (error) {
      // A concurrent request with the same key won the race — return its result.
      if (isUniqueViolation(error) && (await findEvent(this.prisma, id, key))) {
        return this.findOne(id);
      }

      throw error;
    }
  }

  private async verifyHost(gameId: string, hostSecret: string | undefined) {
    if (!hostSecret) {
      throw new ForbiddenException('Invalid host credentials');
    }

    const host = await this.prisma.participant.findFirst({
      where: {
        gameId,
        role: 'HOST',
        identity: { secretHash: hashSecret(hostSecret) },
      },
    });

    if (!host) {
      throw new ForbiddenException('Invalid host credentials');
    }

    return host;
  }
}

function requireIdempotencyKey(idempotencyKey: string | undefined): string {
  if (!idempotencyKey) {
    throw new BadRequestException('Idempotency-Key header is required');
  }

  return idempotencyKey;
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isRecordNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

async function loadGame(client: Prisma.TransactionClient, id: string) {
  const game = await client.game.findUnique({ where: { id }, include: gameInclude });

  if (!game) {
    throw new NotFoundException('Game not found');
  }

  return game;
}

function findEvent(client: Prisma.TransactionClient, gameId: string, idempotencyKey: string) {
  return client.eventLog.findUnique({
    where: { gameId_idempotencyKey: { gameId, idempotencyKey } },
  });
}

function assertPlayersTurn(game: GameWithParticipants, playerId: string) {
  if (game.status !== 'IN_PROGRESS') {
    throw new BadRequestException('Game is not in progress');
  }

  if (game.currentPlayerId !== playerId) {
    throw new BadRequestException("It is not this player's turn");
  }
}
