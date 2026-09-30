import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ApiResponse, GameEventView, GameView } from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

// Online games from docs/DECYZJE.md §1, §2 and §5: virtual dice, every player on their own device,
// one active game per device across both modes.

type Agent = ReturnType<typeof request.agent>;

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

function eventsFrom(body: unknown): GameEventView[] {
  return (body as ApiResponse<GameEventView[]>).data;
}

describe('Online games', () => {
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

  function device(): Agent {
    return request.agent(app.getHttpServer());
  }

  async function createOnlineGame(creator: Agent, name: string, key: string) {
    const response = await creator
      .post('/games')
      .set('Idempotency-Key', key)
      .send({ mode: 'ONLINE', name });

    expect(response.status).toBe(201);
    return gameFrom(response.body);
  }

  function join(player: Agent, gameId: string, name: string, key: string) {
    return player.post(`/games/${gameId}/join`).set('Idempotency-Key', key).send({ name });
  }

  function start(agent: Agent, gameId: string, key: string) {
    return agent.post(`/games/${gameId}/start`).set('Idempotency-Key', key).send();
  }

  function reroll(agent: Agent, gameId: string, held: number[], key: string) {
    return agent.post(`/games/${gameId}/reroll`).set('Idempotency-Key', key).send({ held });
  }

  function score(agent: Agent, gameId: string, category: string, key: string) {
    return agent.post(`/games/${gameId}/score`).set('Idempotency-Key', key).send({ category });
  }

  function sum(dice: number[]) {
    return dice.reduce((total, die) => total + die, 0);
  }

  // A lobby with the creator and one more player, each on their own device.
  async function createLobbyOfTwo(key: string) {
    const creator = device();
    const player = device();
    const game = await createOnlineGame(creator, 'Piotr', `${key}-create`);
    await join(player, game.id, 'Ania', `${key}-join`).expect(201);

    return { creator, player, game };
  }

  // A started game of two; the creator joined first, so the first turn is theirs.
  async function startGameOfTwo(key: string) {
    const { creator, player, game } = await createLobbyOfTwo(key);
    const started = gameFrom((await start(creator, game.id, `${key}-start`).expect(201)).body);

    return { creator, player, game: started };
  }

  describe('creating', () => {
    it('makes the creator the only player, as host, on virtual dice', async () => {
      const creator = device();
      const game = await createOnlineGame(creator, 'Piotr', 'online-create');

      expect(game.diceSource).toBe('VIRTUAL');
      expect(game.status).toBe('LOBBY');
      expect(game.isHost).toBe(true);
      expect(game.participants).toHaveLength(1);
      expect(game.participants[0]).toMatchObject({ name: 'Piotr', role: 'HOST' });
    });

    it('rejects a second game from a device that plays in an online game with 409', async () => {
      const creator = device();
      await createOnlineGame(creator, 'Piotr', 'online-create-first');

      const response = await creator
        .post('/games')
        .set('Idempotency-Key', 'online-create-second')
        .send({ mode: 'LOCAL', players: ['Piotr'] });

      expect(response.status).toBe(409);
    });
  });

  describe('joining', () => {
    it('adds a player from their own device and gives that device a cookie', async () => {
      const game = await createOnlineGame(device(), 'Piotr', 'online-join-create');
      const player = device();

      const response = await join(player, game.id, 'Ania', 'online-join');

      expect(response.status).toBe(201);
      expect(response.headers['set-cookie']).toBeDefined();
      const joined = gameFrom(response.body);
      expect(joined.isHost).toBe(false);
      expect(joined.participants.map((participant) => participant.name)).toEqual(['Piotr', 'Ania']);
      expect(joined.participants[1]).toMatchObject({ role: 'PLAYER', turnOrder: 2 });
    });

    it('rejects a device that already plays in this game with 409', async () => {
      const creator = device();
      const game = await createOnlineGame(creator, 'Piotr', 'online-join-self-create');

      const response = await join(creator, game.id, 'Piotr again', 'online-join-self');

      expect(response.status).toBe(409);
    });

    it('rejects a device that plays in another game with 409', async () => {
      const first = await createOnlineGame(device(), 'Piotr', 'online-join-other-first');
      const second = await createOnlineGame(device(), 'Kuba', 'online-join-other-second');
      const player = device();
      await join(player, first.id, 'Ania', 'online-join-other-a').expect(201);

      const response = await join(player, second.id, 'Ania', 'online-join-other-b');

      expect(response.status).toBe(409);
    });

    it('rejects the host of a local game with 409', async () => {
      const { agent: host } = await createGame(app, ['Piotr'], 'online-join-local-host');
      const game = await createOnlineGame(device(), 'Kuba', 'online-join-local-create');

      const response = await join(host, game.id, 'Piotr', 'online-join-local');

      expect(response.status).toBe(409);
    });

    it('allows five players and rejects the sixth', async () => {
      const game = await createOnlineGame(device(), 'P1', 'online-join-limit-create');
      for (const name of ['P2', 'P3', 'P4', 'P5']) {
        await join(device(), game.id, name, `online-join-limit-${name}`).expect(201);
      }

      const response = await join(device(), game.id, 'P6', 'online-join-limit-P6');

      expect(response.status).toBe(400);
    });

    it('returns the same game without a second player when the join is replayed', async () => {
      const game = await createOnlineGame(device(), 'Piotr', 'online-join-replay-create');
      const player = device();
      await join(player, game.id, 'Ania', 'online-join-replay').expect(201);

      const response = await join(player, game.id, 'Ania', 'online-join-replay');

      expect(response.status).toBe(201);
      expect(gameFrom(response.body).participants).toHaveLength(2);
    });

    it('returns 404 for an unknown game', async () => {
      const response = await join(device(), 'missing-game', 'Ania', 'online-join-missing');

      expect(response.status).toBe(404);
    });
  });

  describe('starting', () => {
    it('lets the creator start with two players and rolls for the first player', async () => {
      const { creator, game } = await createLobbyOfTwo('online-start');

      const response = await start(creator, game.id, 'online-start');

      expect(response.status).toBe(201);
      const started = gameFrom(response.body);
      expect(started.status).toBe('IN_PROGRESS');
      expect(started.currentPlayerId).toBe(game.participants[0].id);
      expect(started.rollNumber).toBe(1);
      expect(started.heldInLastRoll).toEqual([]);
      expect(started.currentDice).toHaveLength(5);
      for (const die of started.currentDice!) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      }
    });

    it('logs the start and then the first roll with its player and dice', async () => {
      const { creator, game } = await createLobbyOfTwo('online-start-log');
      const started = gameFrom((await start(creator, game.id, 'online-start-log')).body);

      const response = await creator.get(`/games/${game.id}/events`).expect(200);

      expect(eventsFrom(response.body)).toEqual([
        expect.objectContaining({ type: 'gameStarted', revision: started.revision - 1 }),
        expect.objectContaining({
          type: 'diceRolled',
          playerId: game.participants[0].id,
          dice: started.currentDice,
          held: [],
          revision: started.revision,
        }),
      ]);
    });

    it('rejects a start by a player who did not create the game with 403', async () => {
      const { player, game } = await createLobbyOfTwo('online-start-player');

      const response = await start(player, game.id, 'online-start-player');

      expect(response.status).toBe(403);
    });

    it('rejects a start with the creator alone with 400', async () => {
      const creator = device();
      const game = await createOnlineGame(creator, 'Piotr', 'online-start-alone-create');

      const response = await start(creator, game.id, 'online-start-alone');

      expect(response.status).toBe(400);
    });

    it('returns the same roll when the start is replayed', async () => {
      const { creator, game } = await createLobbyOfTwo('online-start-replay');
      const first = gameFrom((await start(creator, game.id, 'online-start-replay')).body);

      const replayed = gameFrom((await start(creator, game.id, 'online-start-replay')).body);

      expect(replayed.revision).toBe(first.revision);
      expect(replayed.currentDice).toEqual(first.currentDice);
    });
  });

  describe('rerolling', () => {
    it('keeps the held dice in place and counts the second roll', async () => {
      const { creator, game } = await startGameOfTwo('reroll-held');

      const response = await reroll(creator, game.id, [0, 2], 'reroll-held');

      expect(response.status).toBe(201);
      const rerolled = gameFrom(response.body);
      expect(rerolled.rollNumber).toBe(2);
      expect(rerolled.heldInLastRoll).toEqual([0, 2]);
      expect(rerolled.currentDice![0]).toBe(game.currentDice![0]);
      expect(rerolled.currentDice![2]).toBe(game.currentDice![2]);
      for (const die of rerolled.currentDice!) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      }
    });

    it('allows the third roll and rejects the fourth with 400', async () => {
      const { creator, game } = await startGameOfTwo('reroll-limit');
      await reroll(creator, game.id, [], 'reroll-limit-2').expect(201);
      const third = gameFrom((await reroll(creator, game.id, [], 'reroll-limit-3').expect(201)).body);
      expect(third.rollNumber).toBe(3);

      const response = await reroll(creator, game.id, [], 'reroll-limit-4');

      expect(response.status).toBe(400);
    });

    it("rejects a roll on another player's turn with 400", async () => {
      const { player, game } = await startGameOfTwo('reroll-not-turn');

      const response = await reroll(player, game.id, [], 'reroll-not-turn');

      expect(response.status).toBe(400);
    });

    it('rejects a roll from a device outside the game with 403', async () => {
      const { game } = await startGameOfTwo('reroll-outsider');

      const response = await reroll(device(), game.id, [], 'reroll-outsider');

      expect(response.status).toBe(403);
    });

    it('rejects a roll in a local game with 400', async () => {
      const { agent, game } = await createGame(app, ['Piotr', 'Ania'], 'reroll-local-create');
      await start(agent, game.id, 'reroll-local-start').expect(201);

      const response = await reroll(agent, game.id, [], 'reroll-local');

      expect(response.status).toBe(400);
    });

    it('logs the roll with its player, dice and held positions', async () => {
      const { creator, game } = await startGameOfTwo('reroll-log');
      const rerolled = gameFrom((await reroll(creator, game.id, [1, 4], 'reroll-log')).body);

      const response = await creator.get(`/games/${game.id}/events`).expect(200);

      const events = eventsFrom(response.body);
      expect(events).toHaveLength(3);
      expect(events[2]).toEqual(
        expect.objectContaining({
          type: 'diceRolled',
          playerId: game.currentPlayerId,
          dice: rerolled.currentDice,
          held: [1, 4],
          revision: rerolled.revision,
        }),
      );
    });

    it('returns the same roll when the reroll is replayed', async () => {
      const { creator, game } = await startGameOfTwo('reroll-replay');
      const first = gameFrom((await reroll(creator, game.id, [], 'reroll-replay')).body);

      const replayed = gameFrom((await reroll(creator, game.id, [], 'reroll-replay')).body);

      expect(replayed.revision).toBe(first.revision);
      expect(replayed.currentDice).toEqual(first.currentDice);
    });
  });

  describe('scoring', () => {
    it('scores the dice on the table and opens the next turn with its first roll', async () => {
      const { creator, game } = await startGameOfTwo('score-turn');
      const second = game.participants[1];

      const response = await score(creator, game.id, 'chance', 'score-turn');

      expect(response.status).toBe(201);
      const scored = gameFrom(response.body);
      expect(scored.participants[0].scoreCard.chance).toBe(sum(game.currentDice!));
      expect(scored.status).toBe('IN_PROGRESS');
      expect(scored.currentPlayerId).toBe(second.id);
      expect(scored.rollNumber).toBe(1);
      expect(scored.heldInLastRoll).toEqual([]);
      expect(scored.currentDice).toHaveLength(5);
    });

    it('scores the dice left by the last reroll', async () => {
      const { creator, game } = await startGameOfTwo('score-after-reroll');
      const rerolled = gameFrom(
        (await reroll(creator, game.id, [], 'score-after-reroll-roll').expect(201)).body,
      );

      const response = await score(creator, game.id, 'chance', 'score-after-reroll');

      expect(response.status).toBe(201);
      expect(gameFrom(response.body).participants[0].scoreCard.chance).toBe(
        sum(rerolled.currentDice!),
      );
    });

    it("logs the saved category and then the next player's first roll", async () => {
      const { creator, game } = await startGameOfTwo('score-log');
      const scored = gameFrom(
        (await score(creator, game.id, 'chance', 'score-log')).body,
      );

      const response = await creator.get(`/games/${game.id}/events`).expect(200);

      const events = eventsFrom(response.body);
      expect(events).toHaveLength(4);
      expect(events.slice(2)).toEqual([
        expect.objectContaining({
          type: 'categorySaved',
          playerId: game.participants[0].id,
          category: 'chance',
          points: sum(game.currentDice!),
          revision: scored.revision - 1,
        }),
        expect.objectContaining({
          type: 'diceRolled',
          playerId: game.participants[1].id,
          dice: scored.currentDice,
          held: [],
          revision: scored.revision,
        }),
      ]);
    });

    it("lets the next player reroll their turn's dice", async () => {
      const { creator, player, game } = await startGameOfTwo('score-next-reroll');
      await score(creator, game.id, 'chance', 'score-next-reroll-score').expect(201);

      const response = await reroll(player, game.id, [0], 'score-next-reroll');

      expect(response.status).toBe(201);
      expect(gameFrom(response.body).rollNumber).toBe(2);
    });

    it("rejects a score on another player's turn with 400", async () => {
      const { player, game } = await startGameOfTwo('score-not-turn');

      const response = await score(player, game.id, 'chance', 'score-not-turn');

      expect(response.status).toBe(400);
    });

    it('rejects a score from a device outside the game with 403', async () => {
      const { game } = await startGameOfTwo('score-outsider');

      const response = await score(device(), game.id, 'chance', 'score-outsider');

      expect(response.status).toBe(403);
    });

    it('rejects a player id sent by an online player with 400', async () => {
      const { creator, game } = await startGameOfTwo('score-player-id');

      const response = await creator
        .post(`/games/${game.id}/score`)
        .set('Idempotency-Key', 'score-player-id')
        .send({ playerId: game.participants[0].id, category: 'chance' });

      expect(response.status).toBe(400);
    });

    it('rejects a local score without the player to score for with 400', async () => {
      const { agent, game } = await createGame(app, ['Piotr', 'Ania'], 'score-local-create');
      await start(agent, game.id, 'score-local-start').expect(201);
      await agent
        .post(`/games/${game.id}/roll`)
        .set('Idempotency-Key', 'score-local-roll')
        .send({ playerId: game.participants[0].id, dice: [1, 2, 3, 4, 5] })
        .expect(201);

      const response = await score(agent, game.id, 'chance', 'score-local');

      expect(response.status).toBe(400);
    });
  });
});
