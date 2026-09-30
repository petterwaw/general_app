import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotImplementedException,
} from '@nestjs/common';
import {
  createEmptyScoreCard,
  reducer,
  isGameOver,
  totalScore,
  upperBonus,
  GameRuleError,
  type DiceRoll,
  type DieFace,
  type GameState,
} from '@dice-app/game-core';
import {
  MAX_ONLINE_PLAYERS,
  MAX_PLAYERS,
  diceRollSchema,
  scoreCardSchema,
  type CreateGameInput,
  type GameEventView,
  type GameEventsQuery,
  type GameView,
  type JoinGameInput,
  type RollInput,
  type RerollInput,
  type ScoreInput,
} from '@dice-app/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, type Participant } from '../../generated/prisma/client';
import { randomBytes, randomInt, createHash } from 'crypto';
import {
  gameInclude,
  hostParticipantId,
  toGameView,
  type GameWithParticipants,
} from './game.view';
import { PUBLIC_EVENT_TYPES, toGameEventView } from './game-event.view';
import { GameUpdates } from './game-updates';

type GameAction = {
  actionType: string;
  payload: Prisma.InputJsonValue;
  update?: Prisma.GameUncheckedUpdateInput;
  // The next turn's first roll, made by the server in the same transaction and logged as its
  // own event right after this one.
  autoRoll?: Prisma.InputJsonValue;
};

type ActionAccess =
  | { kind: 'anyone' }
  | { kind: 'host'; secret: string | undefined }
  | { kind: 'player'; secret: string | undefined };

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly updates: GameUpdates,
  ) { }

  /**
   * Creates a game with this device's participant as its host: the host of a local game plays for
   * the whole table, the creator of an online game is its first player. A device that already has
   * a cookie keeps its identity (no new secret), so the one-active-game-per-device index applies.
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
    if (identity && (await this.findActiveParticipation(identity.id))) {
      throw new ConflictException('This device is already in a game');
    }
    const newHostSecret = identity ? null : randomBytes(32).toString('hex');
    const names = input.mode === 'LOCAL' ? input.players : [input.name];

    try {
      const game = await this.prisma.$transaction(async (tx) => {
        const hostIdentityId = newHostSecret
          ? (await tx.identity.create({ data: { secretHash: hashSecret(newHostSecret) } })).id
          : identity!.id;

        return tx.game.create({
          data: {
            creationKey: key,
            hostIdentityId,
            diceSource: input.mode === 'LOCAL' ? 'PHYSICAL' : 'VIRTUAL',
            participants: {
              create: names.map((name, index) => ({
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

      return { game: toGameView(game, true, hostParticipantId(game)), hostSecret: newHostSecret };
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Lost a race: either to the same Idempotency-Key, or to another game of this device.
        const existingGame = await this.findCreatedGame(key);
        if (existingGame) {
          return { game: existingGame, hostSecret: null };
        }

        throw new ConflictException('This device is already in a game');
      }

      throw error;
    }
  }

  // The LOBBY / IN_PROGRESS game hosted by this device, or null.
  async hosted(hostSecret: string | undefined): Promise<GameView | null> {
    const identity = await this.findIdentity(hostSecret);
    const game = identity && (await this.findActiveHostedGame(identity.id));

    return game ? toGameView(game, true, hostParticipantId(game)) : null;
  }

  async findAll(): Promise<GameView[]> {
    const games = await this.prisma.game.findMany({ include: gameInclude });
    // a list, not a game this device opened: nobody is treated as the host here
    return games.map((game) => toGameView(game, false, null));
  }

  // Anyone with the ID may look at a game; only the host's device gets isHost. Nothing is written.
  async findOne(id: string, hostSecret: string | undefined): Promise<GameView> {
    const game = await loadGame(this.prisma, id);
    const participant = await this.findParticipant(id, hostSecret);
    return toGameView(game, participant?.role === 'HOST', participant?.id ?? null);
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

  /**
   * Local game: only the host adds players, who have no device of their own (DECYZJE.md §3).
   * Online game: players join from their own device, which gets a cookie if it has none yet.
   */
  async join(
    id: string,
    input: JoinGameInput,
    idempotencyKey: string | undefined,
    secret: string | undefined,
  ): Promise<{ game: GameView; newSecret: string | null }> {
    const { diceSource } = await findGameOrThrow(this.prisma, id);

    if (diceSource === 'PHYSICAL') {
      const game = await this.runAction(
        id,
        idempotencyKey,
        { kind: 'host', secret },
        (tx, game) => addPlayer(tx, game, input.name, MAX_PLAYERS, null),
      );
      return { game, newSecret: null };
    }

    const identity = await this.findIdentity(secret);

    // Created before the action so the cookie always points at a stored identity, even if the
    // action is replayed or loses a race; an identity without a participant only watches.
    const newSecret = identity ? null : randomBytes(32).toString('hex');
    const identityId = newSecret
      ? (await this.prisma.identity.create({ data: { secretHash: hashSecret(newSecret) } })).id
      : identity!.id;

    try {
      const game = await this.runAction(id, idempotencyKey, { kind: 'anyone' }, (tx, game) =>
        addPlayer(tx, game, input.name, MAX_ONLINE_PLAYERS, identityId),
      );
      // The device became a participant only inside the action, so runAction could not know it
      // as the one asking. Looked up afterwards, it is found on a replayed join as well.
      const joined = await this.prisma.participant.findFirst({
        where: { gameId: id, identityId },
        select: { id: true },
      });
      return { game: { ...game, myParticipantId: joined?.id ?? null }, newSecret };
    } catch (error) {
      // The one-active-game-per-device index. Checked here rather than up front, so that a
      // replayed join returns its game instead of finding the device already in it.
      if (isUniqueViolation(error)) {
        throw new ConflictException('This device is already in a game');
      }
      throw error;
    }
  }

  start(id: string, idempotencyKey: string | undefined, hostSecret: string | undefined) {
    return this.runAction(id, idempotencyKey, { kind: 'host', secret: hostSecret }, (_tx, game) => {
      if (game.status !== 'LOBBY') {
        throw new BadRequestException('Game has already started');
      }

      if (game.participants.length < 2 && game.diceSource === 'VIRTUAL') {
        throw new BadRequestException('Needs atleast 2 players to start');
      }

      const firstPlayer = game.participants[0];

      if (!firstPlayer) {
        throw new BadRequestException('Game needs at least one player');
      }

      if (game.diceSource === 'PHYSICAL') {
        return {
          actionType: 'gameStarted',
          payload: { firstPlayerId: firstPlayer.id },
          update: { status: 'IN_PROGRESS', currentPlayerId: firstPlayer.id },
        };
      }

      const players = game.participants.map((player) => ({
        id: player.id,
        name: player.name,
        card: scoreCardSchema.parse(player.scoreCard),
      }))

      const state: GameState = {
        diceSource: 'VIRTUAL',
        players: players,
        currentPlayerId: players[0].id,
        turn: { rollNumber: 0 },
      };

      const rolled = reducer(state, {
        type: 'roll',
        playerId: state.currentPlayerId,
        held: [],
        rolled: drawDice(),
      });


      if (rolled.diceSource !== 'VIRTUAL' || rolled.turn.rollNumber === 0) {
        throw new Error('The first roll did not happen');
      }
      const { dice, rollNumber, heldInLastRoll } = rolled.turn;

      return {
        actionType: 'gameStarted',
        payload: { firstPlayerId: firstPlayer.id },
        update: { status: 'IN_PROGRESS', currentPlayerId: firstPlayer.id, currentDice: dice, rollNumber: rollNumber, heldInLastRoll: heldInLastRoll },
        autoRoll: { playerId: firstPlayer.id, roll: dice, held: heldInLastRoll }
      };

    });
  }

  roll(
    id: string,
    input: RollInput,
    idempotencyKey: string | undefined,
    hostSecret: string | undefined,
  ) {
    return this.runAction(id, idempotencyKey, { kind: 'host', secret: hostSecret }, (_tx, game) => {

      if (game.diceSource === 'VIRTUAL') {
        throw new BadRequestException('Dice are entered by hand only in local games')
      }

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

  reroll(
    id: string,
    input: RerollInput,
    idempotencyKey: string | undefined,
    secret: string | undefined,
  ) {
    return this.runAction(id, idempotencyKey, { kind: 'player', secret }, (_tx, game, asking) => {
      if (game.diceSource !== 'VIRTUAL') {
        throw new BadRequestException('Dice must be virtual');
      }
      if (game.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Game must be in progress');
      }
      if (!game.currentPlayerId) {
        throw new Error('Game in progress has no current player')
      }

      const players = game.participants.map((player) => ({
        id: player.id,
        name: player.name,
        card: scoreCardSchema.parse(player.scoreCard),
      }))

      const rollNumber = game.rollNumber;
      if (rollNumber !== 1 && rollNumber !== 2 && rollNumber !== 3) {
        throw new Error('Stored turn has no valid roll number');
      }

      const state: GameState = {
        diceSource: 'VIRTUAL',
        players,
        currentPlayerId: game.currentPlayerId,
        turn: {
          rollNumber,
          dice: diceRollSchema.parse(game.currentDice),
          heldInLastRoll: game.heldInLastRoll,
        },
      };

      let rolled: GameState;
      try {
        rolled = reducer(state, {
          type: 'roll',
          playerId: asking!.id,
          held: input.held,
          rolled: drawDice(),
        });
      } catch (error) {
        if (error instanceof GameRuleError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      if (rolled.diceSource !== 'VIRTUAL' || rolled.turn.rollNumber === 0) {
        throw new Error('The roll did not happen');
      }
      const turn = rolled.turn;

      return {
        actionType: 'diceRolled',
        payload: { playerId: asking!.id, roll: turn.dice, held: turn.heldInLastRoll },
        update: {
          currentDice: turn.dice,
          rollNumber: turn.rollNumber,
          heldInLastRoll: turn.heldInLastRoll,
        },
      };
    })
  }

  async score(
    id: string,
    input: ScoreInput,
    idempotencyKey: string | undefined,
    secret: string | undefined,
  ) {
    const { diceSource } = await findGameOrThrow(this.prisma, id);
    const access: ActionAccess =
      diceSource === 'PHYSICAL' ? { kind: 'host', secret } : { kind: 'player', secret };

    return this.runAction(id, idempotencyKey, access, async (tx, game, asking) => {
      const playerId = scoringPlayerId(diceSource, input, asking!);
      assertPlayersTurn(game, playerId);

      if (!game.currentDice) {
        throw new BadRequestException('There is no dice roll to score');
      }
      const currentPlayerId = game.currentPlayerId;
      if (!currentPlayerId) {
        throw new Error('Game in progress has no current player');
      }

      let newState: GameState;
      try {
        const base = {
          players: game.participants.map((player) => ({
            id: player.id,
            name: player.name,
            card: scoreCardSchema.parse(player.scoreCard),
          })),
          currentPlayerId: currentPlayerId,
        };

        let state: GameState;
        if (diceSource === 'VIRTUAL') {
          const rollNumber = game.rollNumber;
          if (rollNumber !== 1 && rollNumber !== 2 && rollNumber !== 3) {
            throw new Error('Stored turn has no valid roll number');
          }
          state = {
            ...base,
            diceSource: 'VIRTUAL',
            turn: {
              rollNumber,
              dice: diceRollSchema.parse(game.currentDice),
              heldInLastRoll: game.heldInLastRoll,
            },
          };
        } else {
          state = { ...base, diceSource: 'PHYSICAL' };
        }
        newState = reducer(
          state,
          {
            type: 'saveCategory',
            playerId: playerId,
            category: input.category,
            ...(diceSource === 'PHYSICAL' && { dice: diceRollSchema.parse(game.currentDice) }),
          },
        );
      } catch (error) {
        // a move against the rules is the client's mistake; anything else stays a 500
        if (error instanceof GameRuleError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      const gameOver = isGameOver(newState);
      // points as the reducer computed them — never taken from the client
      const points = newState.players.find((player) => player.id === playerId)!.card[input.category];

      // Persist the reducer's whole result, not just the scoring player's card: the reducer
      // decides what a move changes, so the service does not second-guess it.
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
                active: false,
              }),
            },
          }),
        ),
      );

      const saved = {
        actionType: 'saveCategory',
        payload: { playerId, category: input.category, points },
      };

      // The next player's turn opens with its first roll already made (docs/DECYZJE.md §4).
      if (diceSource === 'VIRTUAL' && !gameOver) {
        const rolled = reducer(newState, {
          type: 'roll',
          playerId: newState.currentPlayerId,
          held: [],
          rolled: drawDice(),
        });
        if (rolled.diceSource !== 'VIRTUAL' || rolled.turn.rollNumber === 0) {
          throw new Error("The next player's first roll did not happen");
        }
        const { dice, rollNumber, heldInLastRoll } = rolled.turn;

        return {
          ...saved,
          update: {
            currentPlayerId: rolled.currentPlayerId,
            currentDice: dice,
            rollNumber,
            heldInLastRoll,
          },
          autoRoll: { playerId: rolled.currentPlayerId, roll: dice, held: heldInLastRoll },
        };
      }

      return {
        ...saved,
        update: {
          currentDice: Prisma.DbNull,
          rollNumber: null,
          heldInLastRoll: [],
          status: gameOver ? 'COMPLETED' : 'IN_PROGRESS',
          currentPlayerId: gameOver ? null : newState.currentPlayerId,
        },
      };
    });
  }

  // Host leaves: the game is abandoned, which frees the host's active-game slot; abandoned games
  // never count towards statistics. Players leaving on their own comes with accounts.
  leave(id: string, idempotencyKey: string | undefined, hostSecret: string | undefined) {
    return this.runAction(id, idempotencyKey, { kind: 'host', secret: hostSecret }, async (tx, game) => {
      if (game.status !== 'LOBBY' && game.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Game is already over');
      }

      await tx.participant.updateMany({ where: { gameId: id }, data: { active: false } });

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
    return this.runAction(id, idempotencyKey, { kind: 'host', secret: hostSecret }, async (tx, game) => {
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
      asking: Participant | null,
    ) => GameAction | Promise<GameAction>,
  ): Promise<GameView> {

    let asking: Participant | null;
    switch (access.kind) {
      case 'host':
        asking = await this.verifyHost(id, access.secret);
        break;
      case 'player':
        asking = await this.findParticipant(id, access.secret);
        if (!asking) {
          throw new ForbiddenException('This device does not play in this game');
        }
        break;
      case 'anyone':
        asking = null;
        break;
    }

    const key = requireIdempotencyKey(idempotencyKey);
    // Set only when an action really ran (not on a key replay), published after the commit.
    let updatedGameToSend: GameWithParticipants | undefined;

    try {
      const view = await this.prisma.$transaction(async (tx) => {
        if (await findEvent(tx, id, key)) {
          return toGameView(await loadGame(tx, id), asking?.role === 'HOST', asking?.id ?? null);
        }

        const game = await loadGame(tx, id);
        const { actionType, payload, update, autoRoll } = await apply(tx, game, asking);

        // Optimistic lock: the update matches nothing (P2025) if another action bumped the revision.
        const updatedGame = await tx.game
          .update({
            where: { id, revision: game.revision },
            data: {
              ...update,
              revision: { increment: autoRoll ? 2 : 1 },
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
            revisionAfter: autoRoll ? updatedGame.revision - 1 : updatedGame.revision,
            idempotencyKey: key,
          },
        });

        if (autoRoll) {
          await tx.eventLog.create({
            data: {
              gameId: id,
              actionType: 'diceRolled',
              payload: autoRoll,
              revisionAfter: updatedGame.revision,
              idempotencyKey: `${key}:roll`,
            },
          });
        }
        updatedGameToSend = updatedGame;
        return toGameView(updatedGame, asking?.role === 'HOST', asking?.id ?? null);
      });

      // The transaction has committed: only now may other clients see the new state.
      if (updatedGameToSend) {
        this.updates.publish(updatedGameToSend);
      }
      return view;
    } catch (error) {
      // A concurrent request with the same key won the race — return its result.
      if (isUniqueViolation(error) && (await findEvent(this.prisma, id, key))) {
        return toGameView(await loadGame(this.prisma, id), asking?.role === 'HOST', asking?.id ?? null);
      }

      throw error;
    }
  }

  private async verifyHost(gameId: string, hostSecret: string | undefined) {
    const host = await this.findHost(gameId, hostSecret);

    if (!host) {
      throw new ForbiddenException('Invalid host credentials');
    }

    return host;
  }

  // The game's host participant when the secret is its host cookie, otherwise null.
  private async findHost(gameId: string, hostSecret: string | undefined) {
    if (!hostSecret) {
      return null;
    }

    return this.prisma.participant.findFirst({
      where: {
        gameId,
        role: 'HOST',
        identity: { secretHash: hashSecret(hostSecret) },
      },
    });
  }

  async findParticipant(gameId: string, secret: string | undefined) {
    if (!secret) {
      return null;
    }

    return this.prisma.participant.findFirst({
      where: {
        gameId,
        identity: { secretHash: hashSecret(secret) },
      },
    });
  }

  private async findIdentity(secret: string | undefined) {
    if (!secret) {
      return null;
    }

    return this.prisma.identity.findFirst({ where: { secretHash: hashSecret(secret) } });
  }

  private findActiveParticipation(identityId: string) {
    return this.prisma.participant.findFirst({ where: { identityId, active: true } });
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

    return game && toGameView(game, true, hostParticipantId(game));
  }
}

async function findGameOrThrow(client: Prisma.TransactionClient, id: string) {
  const game = await client.game.findUnique({ where: { id }, select: { diceSource: true } });

  if (!game) {
    throw new NotFoundException('Game not found');
  }

  return game;
}

async function addPlayer(
  tx: Prisma.TransactionClient,
  game: GameWithParticipants,
  name: string,
  maxPlayers: number,
  identityId: string | null,
): Promise<GameAction> {
  if (game.status !== 'LOBBY') {
    throw new BadRequestException('Players can only join a lobby');
  }

  if (game.participants.length >= maxPlayers) {
    throw new BadRequestException(`A game can have at most ${maxPlayers} players`);
  }

  const lastTurnOrder = game.participants.at(-1)?.turnOrder ?? 0;
  const player = await tx.participant.create({
    data: {
      name,
      scoreCard: createEmptyScoreCard(),
      turnOrder: lastTurnOrder + 1,
      gameId: game.id,
      identityId,
    },
  });

  return { actionType: 'playerJoined', payload: { playerId: player.id } };
}

function requireIdempotencyKey(idempotencyKey: string | undefined): string {
  if (!idempotencyKey) {
    throw new BadRequestException('Idempotency-Key header is required');
  }

  return idempotencyKey;
}

const DIE_FACES: DieFace[] = [1, 2, 3, 4, 5, 6];

function drawDice(): DiceRoll {
  const face = () => DIE_FACES[randomInt(DIE_FACES.length)];
  return [face(), face(), face(), face(), face()];
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

function scoringPlayerId(
  diceSource: GameWithParticipants['diceSource'],
  input: ScoreInput,
  asking: Participant,
): string {
  if (diceSource === 'VIRTUAL') {
    if (input.playerId !== undefined) {
      throw new BadRequestException('An online player scores only for themselves');
    }
    return asking.id;
  }

  if (input.playerId === undefined) {
    throw new BadRequestException('A local game needs the player to score for');
  }
  return input.playerId;
}

function assertPlayersTurn(game: GameWithParticipants, playerId: string) {
  if (game.status !== 'IN_PROGRESS') {
    throw new BadRequestException('Game is not in progress');
  }

  if (game.currentPlayerId !== playerId) {
    throw new BadRequestException("It is not this player's turn");
  }
}
