import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ApiResponse, GameView } from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

// Online games from docs/DECYZJE.md §1, §2 and §5: virtual dice, every player on their own device,
// one active game per device across both modes.

type Agent = ReturnType<typeof request.agent>;

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
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
});
