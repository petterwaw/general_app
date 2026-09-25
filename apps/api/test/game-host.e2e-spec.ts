import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ApiResponse, GameView } from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

// Host rules from docs/DECYZJE.md §2, §3 and §5: one active game per host device, the host
// adding and removing players in the lobby, and the host leaving the game.

type Agent = Awaited<ReturnType<typeof createGame>>['agent'];

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

function hostedFrom(body: unknown): GameView | null {
  return (body as ApiResponse<GameView | null>).data;
}

describe('Host rules', () => {
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

  async function createHostedGame(players: string[], key: string) {
    const created = await createGame(app, players, key);
    return { agent: created.agent, game: created.game as GameView };
  }

  function leave(agent: Agent, gameId: string, key: string) {
    return agent.post(`/games/${gameId}/leave`).set('Idempotency-Key', key).send();
  }

  function removePlayer(agent: Agent, gameId: string, participantId: string, key: string) {
    return agent
      .delete(`/games/${gameId}/participants/${participantId}`)
      .set('Idempotency-Key', key)
      .send();
  }

  describe('one active game per host device', () => {
    it('rejects a second game from a device that is hosting one with 409', async () => {
      const { agent } = await createHostedGame(['Piotr'], 'one-game-first');

      const response = await agent
        .post('/games')
        .set('Idempotency-Key', 'one-game-second')
        .send({ players: ['Piotr'] });

      expect(response.status).toBe(409);
    });

    it('still returns the first game when its creation request is replayed', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'one-game-replay');

      const response = await agent
        .post('/games')
        .set('Idempotency-Key', 'one-game-replay')
        .send({ players: ['Piotr'] });

      expect(response.status).toBe(201);
      expect(gameFrom(response.body).id).toBe(game.id);
    });

    it('lets another device host its own game at the same time', async () => {
      await createHostedGame(['Piotr'], 'one-game-device-a');
      await createHostedGame(['Ania'], 'one-game-device-b');
    });

    it('lets the host start a new game once the previous one is left', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'one-game-after-leave');
      expect((await leave(agent, game.id, 'one-game-after-leave-leave')).status).toBe(201);

      const response = await agent
        .post('/games')
        .set('Idempotency-Key', 'one-game-after-leave-new')
        .send({ players: ['Piotr'] });

      expect(response.status).toBe(201);
      // the device keeps its identity, so no new host cookie is issued
      expect(response.headers['set-cookie']).toBeUndefined();

      // the old cookie is the host of the new game
      const startResponse = await agent
        .post(`/games/${gameFrom(response.body).id}/start`)
        .set('Idempotency-Key', 'one-game-after-leave-start')
        .send();
      expect(startResponse.status).toBe(201);
    });
  });

  describe('GET /games/hosted', () => {
    it("returns the device's active game", async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'hosted-active');

      const response = await agent.get('/games/hosted');

      expect(response.status).toBe(200);
      expect(hostedFrom(response.body)?.id).toBe(game.id);
    });

    it('returns null without a host cookie', async () => {
      await createHostedGame(['Piotr'], 'hosted-no-cookie');

      const response = await request(app.getHttpServer()).get('/games/hosted');

      expect(response.status).toBe(200);
      expect(hostedFrom(response.body)).toBeNull();
    });

    it('returns null once the host has left the game', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'hosted-left');
      await leave(agent, game.id, 'hosted-left-leave');

      const response = await agent.get('/games/hosted');

      expect(hostedFrom(response.body)).toBeNull();
    });
  });

  describe('host leaves', () => {
    it('abandons a game in progress', async () => {
      const { agent, game } = await createHostedGame(['Piotr', 'Ania'], 'leave-in-progress');
      await agent.post(`/games/${game.id}/start`).set('Idempotency-Key', 'leave-in-progress-start').send();

      const response = await leave(agent, game.id, 'leave-in-progress-leave');

      expect(response.status).toBe(201);
      const left = gameFrom(response.body);
      expect(left.status).toBe('ABANDONED');
      expect(left.currentPlayerId).toBeNull();
    });

    it('rejects actions on an abandoned game', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'leave-then-start');
      await leave(agent, game.id, 'leave-then-start-leave');

      const response = await agent
        .post(`/games/${game.id}/start`)
        .set('Idempotency-Key', 'leave-then-start-start')
        .send();

      expect(response.status).toBe(400);
    });

    it('rejects leaving a game that is already over', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'leave-twice');
      await leave(agent, game.id, 'leave-twice-first');

      const response = await leave(agent, game.id, 'leave-twice-second');

      expect(response.status).toBe(400);
    });
  });

  describe('host removes a player', () => {
    it('removes the player and keeps the turn order contiguous', async () => {
      const { agent, game } = await createHostedGame(['Piotr', 'Ania', 'Kuba'], 'remove-middle');
      const ania = game.participants[1];

      const response = await removePlayer(agent, game.id, ania.id, 'remove-middle-remove');

      expect(response.status).toBe(200);
      const participants = gameFrom(response.body).participants;
      expect(participants.map((p) => p.name)).toEqual(['Piotr', 'Kuba']);
      expect(participants.map((p) => p.turnOrder)).toEqual([1, 2]);
    });

    it('rejects removing a player once the game has started', async () => {
      const { agent, game } = await createHostedGame(['Piotr', 'Ania'], 'remove-started');
      await agent.post(`/games/${game.id}/start`).set('Idempotency-Key', 'remove-started-start').send();

      const response = await removePlayer(agent, game.id, game.participants[1].id, 'remove-started-remove');

      expect(response.status).toBe(400);
    });

    it('rejects removing the host', async () => {
      const { agent, game } = await createHostedGame(['Piotr', 'Ania'], 'remove-host');

      const response = await removePlayer(agent, game.id, game.participants[0].id, 'remove-host-remove');

      expect(response.status).toBe(400);
    });

    it('returns 404 for a player who is not in the game', async () => {
      const { agent, game } = await createHostedGame(['Piotr'], 'remove-unknown');

      const response = await removePlayer(agent, game.id, 'no-such-player', 'remove-unknown-remove');

      expect(response.status).toBe(404);
    });

    it('rejects removal without the host cookie with 403', async () => {
      const { game } = await createHostedGame(['Piotr', 'Ania'], 'remove-no-cookie');

      const response = await request(app.getHttpServer())
        .delete(`/games/${game.id}/participants/${game.participants[1].id}`)
        .set('Idempotency-Key', 'remove-no-cookie-remove')
        .send();

      expect(response.status).toBe(403);
    });
  });
});
