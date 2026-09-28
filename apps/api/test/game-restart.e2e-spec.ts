import request from 'supertest';
import type { ApiResponse, GameView } from '@dice-app/contracts';
import { cleanDatabase, createTestApp } from './test-app';

// CLAUDE.md / etap-4: a server restart in the middle of a game must not break anything. The game
// lives in PostgreSQL, so a brand-new app instance carries on with the same host cookie.

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

describe('Server restart', () => {
  it('continues a game in the middle of a turn on a new app instance', async () => {
    const before = await createTestApp();
    await cleanDatabase(before.prisma);
    const server = before.app.getHttpServer();

    const created = await request(server)
      .post('/games')
      .set('Idempotency-Key', 'restart-create')
      .send({ players: ['Piotr', 'Ania'] })
      .expect(201);
    const setCookie = created.get('Set-Cookie');
    if (!setCookie) {
      throw new Error('The host cookie was not set');
    }
    // "name=value; Path=/; HttpOnly" -> "name=value", as a browser would send it back
    const hostCookie = setCookie.map((cookie) => cookie.split(';')[0]);

    const game = gameFrom(created.body);
    const [piotr, ania] = game.participants;

    const act = (path: string, key: string, body?: object) =>
      request(server)
        .post(`/games/${game.id}/${path}`)
        .set('Cookie', hostCookie)
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);

    await act('start', 'restart-start');
    await act('roll', 'restart-roll-piotr', { playerId: piotr.id, dice: [1, 1, 1, 2, 3] });
    await act('score', 'restart-score-piotr', { playerId: piotr.id, category: 'one' });
    // Ania's dice are confirmed, but her category is not saved yet
    await act('roll', 'restart-roll-ania', { playerId: ania.id, dice: [2, 2, 2, 5, 6] });

    const stateBefore = gameFrom(
      (await request(server).get(`/games/${game.id}`).set('Cookie', hostCookie).expect(200)).body,
    );

    await before.app.close();
    const after = await createTestApp();

    try {
      const newServer = after.app.getHttpServer();

      const stateAfter = gameFrom(
        (await request(newServer).get(`/games/${game.id}`).set('Cookie', hostCookie).expect(200)).body,
      );
      expect(stateAfter).toEqual(stateBefore);
      expect(stateAfter.isHost).toBe(true);
      expect(stateAfter.currentDice).toEqual([2, 2, 2, 5, 6]);

      // an action sent before the restart and retried after it is not applied again
      const retried = await request(newServer)
        .post(`/games/${game.id}/score`)
        .set('Cookie', hostCookie)
        .set('Idempotency-Key', 'restart-score-piotr')
        .send({ playerId: piotr.id, category: 'one' })
        .expect(201);
      expect(gameFrom(retried.body).revision).toBe(stateBefore.revision);

      // the host finishes Ania's turn where it stopped
      const scored = await request(newServer)
        .post(`/games/${game.id}/score`)
        .set('Cookie', hostCookie)
        .set('Idempotency-Key', 'restart-score-ania')
        .send({ playerId: ania.id, category: 'two' })
        .expect(201);
      const stateScored = gameFrom(scored.body);

      expect(stateScored.participants[1].scoreCard.two).toBe(6);
      expect(stateScored.currentPlayerId).toBe(piotr.id);
      expect(stateScored.currentDice).toBeNull();
    } finally {
      await after.app.close();
    }
  });
});
