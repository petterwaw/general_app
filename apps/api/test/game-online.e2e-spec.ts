import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CATEGORIES, type ApiResponse, type GameEventView, type GameView } from '@dice-app/contracts';
import { totalScore, upperBonus } from '@dice-app/game-core';
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
    const created = await createOnlineGame(creator, 'Piotr', `${key}-create`);
    const game = gameFrom((await join(player, created.id, 'Ania', `${key}-join`).expect(201)).body);

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

    it('starts a game with the creator alone, with the first roll made', async () => {
      const creator = device();
      const game = await createOnlineGame(creator, 'Piotr', 'online-start-alone-create');

      const response = await start(creator, game.id, 'online-start-alone');

      expect(response.status).toBe(201);
      const started = gameFrom(response.body);
      expect(started.status).toBe('IN_PROGRESS');
      expect(started.currentDice).toHaveLength(5);
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

  describe('my participant', () => {
    it('tells the creator which participant they play as', async () => {
      const game = await createOnlineGame(device(), 'Piotr', 'mine-create');

      expect(game.myParticipantId).toBe(game.participants[0].id);
    });

    it('tells a joining player which participant they play as', async () => {
      const game = await createOnlineGame(device(), 'Piotr', 'mine-join-create');

      const response = await join(device(), game.id, 'Ania', 'mine-join');

      expect(response.status).toBe(201);
      const joined = gameFrom(response.body);
      expect(joined.myParticipantId).toBe(joined.participants[1].id);
    });

    it('tells the same participant on a replayed join', async () => {
      const player = device();
      const game = await createOnlineGame(device(), 'Piotr', 'mine-replay-create');
      const first = gameFrom((await join(player, game.id, 'Ania', 'mine-replay')).body);

      const replayed = gameFrom((await join(player, game.id, 'Ania', 'mine-replay')).body);

      expect(replayed.myParticipantId).toBe(first.myParticipantId);
    });

    it('tells each device its own participant when it opens the game', async () => {
      const { creator, player, game } = await startGameOfTwo('mine-open');

      const forCreator = gameFrom((await creator.get(`/games/${game.id}`).expect(200)).body);
      const forPlayer = gameFrom((await player.get(`/games/${game.id}`).expect(200)).body);

      expect(forCreator.myParticipantId).toBe(game.participants[0].id);
      expect(forCreator.isHost).toBe(true);
      expect(forPlayer.myParticipantId).toBe(game.participants[1].id);
      expect(forPlayer.isHost).toBe(false);
    });

    it('tells a device outside the game that it plays as nobody', async () => {
      const { game } = await startGameOfTwo('mine-outsider');

      const response = await device().get(`/games/${game.id}`).expect(200);

      expect(gameFrom(response.body).myParticipantId).toBeNull();
    });

    it('tells the player after their own action', async () => {
      const { player, creator, game } = await startGameOfTwo('mine-action');
      await score(creator, game.id, 'chance', 'mine-action-score').expect(201);

      const response = await reroll(player, game.id, [], 'mine-action');

      expect(gameFrom(response.body).myParticipantId).toBe(game.participants[1].id);
    });
  });

  describe('host-only actions', () => {
    it('rejects dice entered by hand in an online game with 400', async () => {
      const { creator, game } = await startGameOfTwo('online-hand-roll');

      const response = await creator
        .post(`/games/${game.id}/roll`)
        .set('Idempotency-Key', 'online-hand-roll')
        .send({ playerId: game.participants[0].id, dice: [6, 6, 6, 6, 6] });

      expect(response.status).toBe(400);
    });

    it('lets the creator remove a player in the lobby', async () => {
      const { creator, game } = await createLobbyOfTwo('online-remove');

      const response = await creator
        .delete(`/games/${game.id}/participants/${game.participants[1].id}`)
        .set('Idempotency-Key', 'online-remove');

      expect(response.status).toBe(200);
      expect(gameFrom(response.body).participants).toHaveLength(1);
    });

    it('rejects a removal by a player who did not create the game with 403', async () => {
      const { player, game } = await createLobbyOfTwo('online-remove-player');

      const response = await player
        .delete(`/games/${game.id}/participants/${game.participants[0].id}`)
        .set('Idempotency-Key', 'online-remove-player');

      expect(response.status).toBe(403);
    });

    it('lets a removed player join another game', async () => {
      const { creator, player, game } = await createLobbyOfTwo('online-remove-rejoin');
      await creator
        .delete(`/games/${game.id}/participants/${game.participants[1].id}`)
        .set('Idempotency-Key', 'online-remove-rejoin-remove')
        .expect(200);
      const other = await createOnlineGame(device(), 'Kasia', 'online-remove-rejoin-other');

      const response = await join(player, other.id, 'Ania', 'online-remove-rejoin');

      expect(response.status).toBe(201);
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
  describe('full game', () => {
    it('plays two devices through every category to a completed game', async () => {
      const { creator, player, game: lobby } = await createLobbyOfTwo('full-online');
      const devices = new Map([
        [lobby.participants[0].id, creator],
        [lobby.participants[1].id, player],
      ]);
      let game = gameFrom((await start(creator, lobby.id, 'full-online-start').expect(201)).body);
      const turns = CATEGORIES.length * devices.size;

      for (let turn = 0; turn < turns; turn++) {
        const category = CATEGORIES[Math.floor(turn / devices.size)];
        const agent = devices.get(game.currentPlayerId!)!;
        expect(game.rollNumber).toBe(1);

        const rerolled = gameFrom(
          (await reroll(agent, game.id, [0, 1], `full-online-reroll-${turn}`).expect(201)).body,
        );
        expect(rerolled.rollNumber).toBe(2);
        expect(rerolled.currentDice!.slice(0, 2)).toEqual(game.currentDice!.slice(0, 2));

        game = gameFrom(
          (await score(agent, game.id, category, `full-online-score-${turn}`).expect(201)).body,
        );
      }

      expect(game.status).toBe('COMPLETED');
      expect(game.currentPlayerId).toBeNull();
      expect(game.currentDice).toBeNull();
      expect(game.rollNumber).toBeNull();
      for (const participant of game.participants) {
        for (const category of CATEGORIES) {
          expect(participant.scoreCard[category]).not.toBeNull();
        }
        expect(participant.finalScore).toBe(totalScore(participant.scoreCard));
        expect(participant.upperBonus).toBe(upperBonus(participant.scoreCard));
      }

      const events = eventsFrom((await creator.get(`/games/${game.id}/events`).expect(200)).body);
      const rolls = events.filter((event) => event.type === 'diceRolled');
      // one automatic first roll and one reroll per turn
      expect(rolls).toHaveLength(turns * 2);
      expect(events.at(-1)).toEqual(expect.objectContaining({ type: 'categorySaved' }));
    });

    it('frees both devices for a new game once the game is completed', async () => {
      const { creator, player, game: lobby } = await createLobbyOfTwo('full-online-free');
      const devices = new Map([
        [lobby.participants[0].id, creator],
        [lobby.participants[1].id, player],
      ]);
      let game = gameFrom((await start(creator, lobby.id, 'full-online-free-start').expect(201)).body);
      for (let turn = 0; turn < CATEGORIES.length * devices.size; turn++) {
        const category = CATEGORIES[Math.floor(turn / devices.size)];
        const agent = devices.get(game.currentPlayerId!)!;
        game = gameFrom(
          (await score(agent, game.id, category, `full-online-free-score-${turn}`).expect(201)).body,
        );
      }
      expect(game.status).toBe('COMPLETED');

      const next = await createOnlineGame(creator, 'Piotr', 'full-online-free-next');
      const response = await join(player, next.id, 'Ania', 'full-online-free-join');

      expect(response.status).toBe(201);
    });
  });

  describe('leaving', () => {
    function leave(agent: Agent, gameId: string, key: string) {
      return agent.post(`/games/${gameId}/leave`).set('Idempotency-Key', key).send();
    }

    async function view(agent: Agent, gameId: string) {
      return gameFrom((await agent.get(`/games/${gameId}`).expect(200)).body);
    }

    // A started game of three; turns go creator, Ania, Kasia.
    async function startGameOfThree(key: string) {
      const { creator, player, game: lobby } = await createLobbyOfTwo(key);
      const third = device();
      await join(third, lobby.id, 'Kasia', `${key}-join-third`).expect(201);
      const game = gameFrom((await start(creator, lobby.id, `${key}-start`).expect(201)).body);

      return { creator, player, third, game };
    }

    describe('in the lobby', () => {
      it('offers a player their lobby, and the host theirs as the host', async () => {
        const { creator, player, game } = await createLobbyOfTwo('active-lobby');

        const forPlayer = (await player.get('/games/active').expect(200)).body as ApiResponse<GameView | null>;
        const forHost = (await creator.get('/games/active').expect(200)).body as ApiResponse<GameView | null>;

        expect(forPlayer.data).toMatchObject({ id: game.id, isHost: false, myParticipantId: game.participants[1].id });
        expect(forHost.data).toMatchObject({ id: game.id, isHost: true, myParticipantId: game.participants[0].id });
      });

      it('takes a player who leaves off the game', async () => {
        const { creator, player, game } = await createLobbyOfTwo('leave-lobby');

        const response = await leave(player, game.id, 'leave-lobby');

        expect(response.status).toBe(201);
        const after = await view(creator, game.id);
        expect(after.status).toBe('LOBBY');
        expect(after.participants.map((participant) => participant.name)).toEqual(['Piotr']);
      });

      it('lets a player who left the lobby join another game', async () => {
        const { player, game } = await createLobbyOfTwo('leave-lobby-rejoin');
        await leave(player, game.id, 'leave-lobby-rejoin-leave').expect(201);
        const other = await createOnlineGame(device(), 'Kasia', 'leave-lobby-rejoin-other');

        const response = await join(player, other.id, 'Ania', 'leave-lobby-rejoin');

        expect(response.status).toBe(201);
      });

      it('abandons the game when the host leaves and frees every device', async () => {
        const { creator, player, game } = await createLobbyOfTwo('leave-lobby-host');

        const response = await leave(creator, game.id, 'leave-lobby-host');

        expect(response.status).toBe(201);
        expect(gameFrom(response.body).status).toBe('ABANDONED');
        await createOnlineGame(player, 'Ania', 'leave-lobby-host-next');
      });
    });

    describe('during the game', () => {
      it('fills the free categories of a player who leaves off turn with zeros and keeps the turn', async () => {
        const { creator, third, game } = await startGameOfThree('leave-off-turn');
        await score(creator, game.id, 'chance', 'leave-off-turn-score').expect(201);
        const before = await view(creator, game.id);

        await leave(creator, game.id, 'leave-off-turn').expect(201);

        const after = await view(third, game.id);
        const leaver = after.participants[0];
        expect(leaver.left).toBe(true);
        expect(leaver.scoreCard.chance).toBe(sum(game.currentDice!));
        for (const category of CATEGORIES.filter((category) => category !== 'chance')) {
          expect(leaver.scoreCard[category]).toBe(0);
        }
        expect(after.participants.slice(1).map((participant) => participant.left)).toEqual([false, false]);
        expect(after.status).toBe('IN_PROGRESS');
        expect(after.currentPlayerId).toBe(before.currentPlayerId);
        expect(after.currentDice).toEqual(before.currentDice);
        expect(after.rollNumber).toBe(before.rollNumber);
      });

      it('passes the turn with its first roll when the host leaves on their turn, and the game goes on', async () => {
        const { creator, player, game } = await startGameOfThree('leave-on-turn');
        await reroll(creator, game.id, [], 'leave-on-turn-reroll').expect(201);

        await leave(creator, game.id, 'leave-on-turn').expect(201);

        const after = await view(player, game.id);
        expect(after.status).toBe('IN_PROGRESS');
        expect(after.currentPlayerId).toBe(game.participants[1].id);
        expect(after.rollNumber).toBe(1);
        expect(after.heldInLastRoll).toEqual([]);
        expect(after.currentDice).toHaveLength(5);
      });

      it('skips the turns of a player who left', async () => {
        const { creator, player, third, game } = await startGameOfThree('leave-skip');
        await leave(player, game.id, 'leave-skip-leave').expect(201);

        const response = await score(creator, game.id, 'chance', 'leave-skip-score');

        expect(gameFrom(response.body).currentPlayerId).toBe(game.participants[2].id);
        expect((await reroll(player, game.id, [], 'leave-skip-reroll')).status).toBe(400);
        await reroll(third, game.id, [], 'leave-skip-third-reroll').expect(201);
      });

      it("logs the player leaving and then the next player's first roll", async () => {
        const { creator, player, game } = await startGameOfThree('leave-log');

        const left = gameFrom((await leave(creator, game.id, 'leave-log')).body);

        const events = eventsFrom((await player.get(`/games/${game.id}/events`).expect(200)).body);
        expect(events.slice(-2)).toEqual([
          expect.objectContaining({
            type: 'playerLeft',
            playerId: game.participants[0].id,
            revision: left.revision - 1,
          }),
          expect.objectContaining({
            type: 'diceRolled',
            playerId: game.participants[1].id,
            revision: left.revision,
          }),
        ]);
      });

      it('lets the player left alone play the game to the end', async () => {
        const { creator, player, game: started } = await startGameOfTwo('leave-alone');
        await leave(creator, started.id, 'leave-alone-leave').expect(201);

        let game = await view(player, started.id);
        for (const category of CATEGORIES) {
          expect(game.currentPlayerId).toBe(started.participants[1].id);
          game = gameFrom(
            (await score(player, game.id, category, `leave-alone-score-${category}`).expect(201)).body,
          );
        }

        expect(game.status).toBe('COMPLETED');
        for (const participant of game.participants) {
          expect(participant.finalScore).toBe(totalScore(participant.scoreCard));
        }
        expect(game.participants[0].finalScore).toBe(0);
      });

      it('abandons the game without final scores once everyone has left', async () => {
        const { creator, player, game } = await startGameOfTwo('leave-everyone');
        await leave(player, game.id, 'leave-everyone-player').expect(201);

        const response = await leave(creator, game.id, 'leave-everyone-creator');

        expect(response.status).toBe(201);
        const abandoned = gameFrom(response.body);
        expect(abandoned.status).toBe('ABANDONED');
        expect(abandoned.currentPlayerId).toBeNull();
        expect(abandoned.currentDice).toBeNull();
        expect(abandoned.rollNumber).toBeNull();
        expect(abandoned.participants.map((participant) => participant.finalScore)).toEqual([null, null]);
      });

      it('offers a player their game in progress, as the participant they play', async () => {
        const { player, game } = await startGameOfThree('active-player');

        const response = await player.get('/games/active').expect(200);

        const active = (response.body as ApiResponse<GameView | null>).data;
        expect(active?.id).toBe(game.id);
        expect(active?.isHost).toBe(false);
        expect(active?.myParticipantId).toBe(game.participants[1].id);
      });

      it('no longer offers the game to a player who left it', async () => {
        const { player, game } = await startGameOfThree('active-player-left');
        await leave(player, game.id, 'active-player-left-leave').expect(201);

        const response = await player.get('/games/active').expect(200);

        expect((response.body as ApiResponse<GameView | null>).data).toBeNull();
      });

      it('no longer offers the game to a host who left it while it goes on', async () => {
        const { creator, game } = await startGameOfThree('leave-hosted');
        await leave(creator, game.id, 'leave-hosted-leave').expect(201);

        const response = await creator.get('/games/active').expect(200);

        expect((response.body as ApiResponse<GameView | null>).data).toBeNull();
        expect((await view(creator, game.id)).status).toBe('IN_PROGRESS');
      });

      it('rejects leaving a second time with 400', async () => {
        const { player, game } = await startGameOfThree('leave-twice');
        await leave(player, game.id, 'leave-twice-first').expect(201);

        const response = await leave(player, game.id, 'leave-twice-second');

        expect(response.status).toBe(400);
      });

      it('lets a device that left join another game while the game goes on', async () => {
        const { player, game } = await startGameOfThree('leave-mid-rejoin');
        await leave(player, game.id, 'leave-mid-rejoin-leave').expect(201);
        const other = await createOnlineGame(device(), 'Ola', 'leave-mid-rejoin-other');

        const response = await join(player, other.id, 'Ania', 'leave-mid-rejoin');

        expect(response.status).toBe(201);
      });
    });
  });
});
