import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createEmptyScoreCard, reducer, isGameOver, totalScore, upperBonus } from '@dice-app/game-core';
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import {
  MAX_PLAYERS,
  type CreateGameInput,
  type GameEventView,
  type GameEventsQuery,
  type GameView,
  type JoinGameInput,
  type RollInput,
  type ScoreInput,
} from '@dice-app/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { randomBytes, createHash } from 'crypto';
import { gameInclude, toGameView, type GameWithParticipants } from './game.view';
import { PUBLIC_EVENT_TYPES, toGameEventView } from './game-event.view';

type GameAction = {
  actionType: string;
  payload: Prisma.InputJsonValue;
  update?: Prisma.GameUncheckedUpdateInput;
};

type ActionAccess = { hostOnly: false } | { hostOnly: true; hostSecret: string | undefined };

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Creates a game hosted by this device. A device that already has a host cookie keeps its
   * identity (no new secret), so the one-active-game-per-host index applies to it.
   */
  async create(
    input: CreateGameInput,
    idempotencyKey: string | undefined,
    currentHostSecret: string | undefined,
  ) {
    const key = requireIdempotencyKey(idempotencyKey);

    // Replayed Idempotency-Key: return the game created by the first request, without its secret.
    const replayed = await this.findCreatedGame(key);
    if (replayed) {
      return { game: replayed, hostSecret: null };
    }

    const identity = await this.findIdentity(currentHostSecret);
    if (identity && (await this.findActiveHostedGame(identity.id))) {
      throw new ConflictException('This device is already hosting a game');
    }

    const newHostSecret = identity ? null : randomBytes(32).toString('hex');

    try {
      const game = await this.prisma.$transaction(async (tx) => {
        const hostIdentityId = newHostSecret
          ? (await tx.identity.create({ data: { secretHash: hashSecret(newHostSecret) } })).id
          : identity!.id;

        return tx.game.create({
          data: {
            creationKey: key,
            hostIdentityId,
            participants: {
              create: input.players.map((name, index) => ({
                name,
                scoreCard: createEmptyScoreCard(),
                turnOrder: index + 1,
                role: index === 0 ? 'HOST' : 'PLAYER',
                ...(index === 0 && { identityId: hostIdentityId }),
              })),
            },
          },
          include: gameInclude,
        });
      });

      return { game: toGameView(game), hostSecret: newHostSecret };
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Lost a race: either to the same Idempotency-Key, or to another game of this host.
        const existingGame = await this.findCreatedGame(key);
        if (existingGame) {
          return { game: existingGame, hostSecret: null };
        }

        throw new ConflictException('This device is already hosting a game');
      }

      throw error;
    }
  }

  // The LOBBY / IN_PROGRESS game hosted by this device, or null.
  async hosted(hostSecret: string | undefined): Promise<GameView | null> {
    const identity = await this.findIdentity(hostSecret);
    const game = identity && (await this.findActiveHostedGame(identity.id));

    return game ? toGameView(game) : null;
  }

  async findAll(): Promise<GameView[]> {
    const games = await this.prisma.game.findMany({ include: gameInclude });
    return games.map(toGameView);
  }

  async findOne(id: string): Promise<GameView> {
    return toGameView(await loadGame(this.prisma, id));
  }

  async events(id: string, query: GameEventsQuery): Promise<GameEventView[]> {
    const game = await this.prisma.game.findUnique({ where: { id }, select: { id: true } });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const events = await this.prisma.eventLog.findMany({
      where: {
        gameId: id,
        actionType: { in: [...PUBLIC_EVENT_TYPES] },
        revisionAfter: { gt: query.after ?? 0 },
      },
      orderBy: { revisionAfter: 'asc' },
    });

    return events.map(toGameEventView);
  }

  join(
    id: string,
    input: JoinGameInput,
    idempotencyKey: string | undefined,
    hostSecret: string | undefined,
  ) {
    // Local mode: only the host adds players (DECYZJE.md §3).
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, async (tx, game) => {
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
      // points as the reducer computed them — never taken from the client
      const points = newState.players.find((player) => player.id === input.playerId)!.card[input.category];

      await Promise.all(
        newState.players.map((player) =>
          tx.participant.update({
            where: { id: player.id },
            data: {
              scoreCard: player.card,
              // the final result is recorded once, in the same transaction that ends the game
              ...(gameOver && {
                finalScore: totalScore(player.card),
                upperBonus: upperBonus(player.card),
              }),
            },
          }),
        ),
      );

      return {
        actionType: 'saveCategory',
        payload: { playerId: input.playerId, category: input.category, points },
        update: {
          currentDice: Prisma.DbNull,
          status: gameOver ? 'COMPLETED' : 'IN_PROGRESS',
          currentPlayerId: gameOver ? null : newState.currentPlayerId,
        },
      };
    });
  }

  // Host leaves: the game is abandoned, which frees the host's active-game slot; abandoned games
  // never count towards statistics. Players leaving on their own comes with accounts.
  leave(id: string, idempotencyKey: string | undefined, hostSecret: string | undefined) {
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, (_tx, game) => {
      if (game.status !== 'LOBBY' && game.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Game is already over');
      }

      return {
        actionType: 'hostLeft',
        payload: {},
        update: {
          status: 'ABANDONED',
          currentPlayerId: null,
          currentDice: Prisma.DbNull,
        },
      };
    });
  }

  // The host removes a player — only in the lobby, before the game starts.
  removePlayer(
    id: string,
    participantId: string,
    idempotencyKey: string | undefined,
    hostSecret: string | undefined,
  ) {
    return this.runAction(id, idempotencyKey, { hostOnly: true, hostSecret }, async (tx, game) => {
      if (game.status !== 'LOBBY') {
        throw new BadRequestException('Players can only be removed in the lobby');
      }

      const player = game.participants.find((participant) => participant.id === participantId);

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      if (player.role === 'HOST') {
        throw new BadRequestException('The host cannot remove themselves');
      }

      await tx.participant.delete({ where: { id: participantId } });

      // Keep turn order contiguous (1..n) after the removal.
      const remaining = game.participants.filter((participant) => participant.id !== participantId);
      await Promise.all(
        remaining.map((participant, index) =>
          tx.participant.update({
            where: { id: participant.id },
            data: { turnOrder: index + 1 },
          }),
        ),
      );

      return {
        actionType: 'playerRemoved',
        payload: { playerId: participantId },
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

  private async findIdentity(secret: string | undefined) {
    if (!secret) {
      return null;
    }

    return this.prisma.identity.findFirst({ where: { secretHash: hashSecret(secret) } });
  }

  private findActiveHostedGame(identityId: string) {
    return this.prisma.game.findFirst({
      where: { hostIdentityId: identityId, status: { in: ['LOBBY', 'IN_PROGRESS'] } },
      include: gameInclude,
    });
  }

  private async findCreatedGame(creationKey: string) {
    const game = await this.prisma.game.findUnique({
      where: { creationKey },
      include: gameInclude,
    });

    return game && toGameView(game);
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
