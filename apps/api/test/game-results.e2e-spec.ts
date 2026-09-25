import { INestApplication } from '@nestjs/common';
import type {
  ApiResponse,
  Category,
  DiceRoll,
  GameEventView,
  GameView,
} from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

// Expected scores are worked out from docs/ZASADY-GRY.md, not from the implementation.

type Turn = { category: Category; dice: DiceRoll };
type Agent = Awaited<ReturnType<typeof createGame>>['agent'];

// Three of each face in the upper section: 3 + 6 + 9 + 12 + 15 + 18 = 63, exactly the bonus threshold.
const UPPER_AT_THRESHOLD: Turn[] = [
  { category: 'one', dice: [1, 1, 1, 2, 3] },
  { category: 'two', dice: [2, 2, 2, 1, 3] },
  { category: 'three', dice: [3, 3, 3, 1, 2] },
  { category: 'four', dice: [4, 4, 4, 1, 2] },
  { category: 'five', dice: [5, 5, 5, 1, 2] },
  { category: 'six', dice: [6, 6, 6, 1, 2] },
];

// Lower section: five ones everywhere except Two Pairs, which gets an unambiguous 1-1-2-2-3.
// pair 2, two pairs 6, three of a kind 5, four of a kind 5, full house 25 (a general counts as
// a full house), straights 0, general 50, chance 5 = 98.
const LOWER_CATEGORIES: Category[] = [
  'pair',
  'twoPairs',
  'threeOfKind',
  'fourOfKind',
  'full',
  'smallStraight',
  'largeStraight',
  'general',
  'chance',
];
const LOWER_SECTION: Turn[] = LOWER_CATEGORIES.map((category) => ({
  category,
  dice: category === 'twoPairs' ? [1, 1, 2, 2, 3] : [1, 1, 1, 1, 1],
}));

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

function eventsFrom(body: unknown): GameEventView[] {
  return (body as ApiResponse<GameEventView[]>).data;
}

describe('Game results', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSoloGame(key: string) {
    const created = await createGame(app, ['Piotr'], `${key}-create`);
    const game = created.game as GameView;

    return { agent: created.agent, game };
  }

  async function startSoloGame(key: string) {
    const { agent, game } = await createSoloGame(key);
    await agent
      .post(`/games/${game.id}/start`)
      .set('Idempotency-Key', `${key}-start`)
      .send()
      .expect(201);

    return { agent, gameId: game.id, playerId: game.participants[0].id };
  }

  async function playTurn(
    agent: Agent,
    gameId: string,
    playerId: string,
    turn: Turn,
    key: string,
  ): Promise<GameView> {
    await agent
      .post(`/games/${gameId}/roll`)
      .set('Idempotency-Key', `${key}-roll`)
      .send({ playerId, dice: turn.dice })
      .expect(201);

    const response = await agent
      .post(`/games/${gameId}/score`)
      .set('Idempotency-Key', `${key}-score`)
      .send({ playerId, category: turn.category })
      .expect(201);

    return gameFrom(response.body);
  }

  async function playAll(
    agent: Agent,
    gameId: string,
    playerId: string,
    turns: Turn[],
    key: string,
  ): Promise<GameView> {
    let game: GameView | undefined;
    for (const [index, turn] of turns.entries()) {
      game = await playTurn(agent, gameId, playerId, turn, `${key}-${index}`);
    }

    if (!game) {
      throw new Error('No turns were played');
    }

    return game;
  }

  async function fetchEvents(agent: Agent, gameId: string, query = '') {
    const response = await agent
      .get(`/games/${gameId}/events${query}`)
      .expect(200);

    return eventsFrom(response.body);
  }

  describe('final score', () => {
    it('stores the total with the upper bonus when the game ends', async () => {
      const { agent, gameId, playerId } = await startSoloGame('bonus');

      const game = await playAll(
        agent,
        gameId,
        playerId,
        [...UPPER_AT_THRESHOLD, ...LOWER_SECTION],
        'bonus',
      );

      expect(game.status).toBe('COMPLETED');
      expect(game.participants[0].upperBonus).toBe(35);
      expect(game.participants[0].finalScore).toBe(63 + 35 + 98);

      const stored = await prisma.participant.findUniqueOrThrow({
        where: { id: playerId },
      });
      expect(stored.finalScore).toBe(196);
      expect(stored.upperBonus).toBe(35);
    });

    it('stores the total without a bonus below the threshold', async () => {
      const { agent, gameId, playerId } = await startSoloGame('no-bonus');
      // only two sixes: Sixes is scratched for 0, leaving 45 in the upper section
      const upper = UPPER_AT_THRESHOLD.map((turn): Turn =>
        turn.category === 'six'
          ? { category: 'six', dice: [6, 6, 1, 2, 3] }
          : turn,
      );

      const game = await playAll(
        agent,
        gameId,
        playerId,
        [...upper, ...LOWER_SECTION],
        'no-bonus',
      );

      expect(game.participants[0].upperBonus).toBe(0);
      expect(game.participants[0].finalScore).toBe(45 + 98);
    });

    it('keeps the total hidden while the game is in progress', async () => {
      const { agent, gameId, playerId } = await startSoloGame('hidden');

      const game = await playTurn(
        agent,
        gameId,
        playerId,
        UPPER_AT_THRESHOLD[0],
        'hidden-0',
      );

      expect(game.status).toBe('IN_PROGRESS');
      expect(game.participants[0].finalScore).toBeNull();
      expect(game.participants[0].upperBonus).toBeNull();
    });
  });

  describe('GET /games/:id/events', () => {
    it('returns the start, the entered dice and the scored categories with points', async () => {
      const { agent, gameId, playerId } = await startSoloGame('events');
      await playTurn(
        agent,
        gameId,
        playerId,
        UPPER_AT_THRESHOLD[0],
        'events-0',
      );
      await playTurn(
        agent,
        gameId,
        playerId,
        UPPER_AT_THRESHOLD[1],
        'events-1',
      );

      const events = await fetchEvents(agent, gameId);

      expect(events.map((event) => event.type)).toEqual([
        'gameStarted',
        'diceConfirmed',
        'categorySaved',
        'diceConfirmed',
        'categorySaved',
      ]);
      expect(events[1]).toMatchObject({ playerId, dice: [1, 1, 1, 2, 3] });
      expect(events[2]).toMatchObject({ playerId, category: 'one', points: 3 });
      expect(events[4]).toMatchObject({ playerId, category: 'two', points: 6 });

      const revisions = events.map((event) => event.revision);
      expect(revisions).toEqual([...revisions].sort((a, b) => a - b));
      expect(typeof events[0].createdAt).toBe('string');
    });

    it('does not expose players joining', async () => {
      const { agent, game } = await createSoloGame('join');
      await agent
        .post(`/games/${game.id}/join`)
        .set('Idempotency-Key', 'join-join')
        .send({ name: 'Ania' })
        .expect(201);

      expect(await fetchEvents(agent, game.id)).toEqual([]);
    });

    it('returns only events newer than the given revision', async () => {
      const { agent, gameId, playerId } = await startSoloGame('after');
      const game = await playTurn(
        agent,
        gameId,
        playerId,
        UPPER_AT_THRESHOLD[0],
        'after-0',
      );
      await playTurn(agent, gameId, playerId, UPPER_AT_THRESHOLD[1], 'after-1');

      const events = await fetchEvents(
        agent,
        gameId,
        `?after=${game.revision}`,
      );

      expect(events.map((event) => event.type)).toEqual([
        'diceConfirmed',
        'categorySaved',
      ]);
      expect(events.every((event) => event.revision > game.revision)).toBe(
        true,
      );
    });

    it('rejects an invalid revision', async () => {
      const { agent, gameId } = await startSoloGame('invalid');

      await agent.get(`/games/${gameId}/events?after=-1`).expect(400);
      await agent.get(`/games/${gameId}/events?after=abc`).expect(400);
    });

    it('returns 404 for an unknown game', async () => {
      const { agent } = await startSoloGame('unknown');

      await agent.get('/games/does-not-exist/events').expect(404);
    });
  });
});
