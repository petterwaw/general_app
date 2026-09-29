import type { Server } from 'http';
import type { AddressInfo } from 'net';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import type { ApiErrorResponse, ApiResponse, GameView } from '@dice-app/contracts';
import type { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './test-app';

// Stage 6: every committed action reaches the open screens, and a screen that lost its
// connection catches up by itself once it is back (docs/etapy/etap-6.md).

function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

// Resolves with the next payload of an event, or fails the test if it never comes.
function next<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No "${event}" within 2 s`)), 2000);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Realtime', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await app.listen(0);
    // a real port: sockets need a listening server, which supertest alone does not give
    server = app.getHttpServer() as Server;
    url = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
  });

  function connect(cookie?: string[]) {
    const socket = io(url, {
      forceNew: true,
      reconnection: false,
      extraHeaders: cookie ? { cookie: cookie.join('; ') } : {},
    });
    sockets.push(socket);
    return socket;
  }

  // Subscribes from scratch; the state that comes back also means the socket is in its room.
  // A fresh game is at revision 0 and would send nothing, so callers start the game first.
  async function subscribe(socket: Socket, gameId: string) {
    const state = next<GameView>(socket, 'game');
    socket.emit('subscribe', { gameId, revision: 0 });
    return state;
  }

  async function createGame() {
    const created = await request(server)
      .post('/games')
      .set('Idempotency-Key', 'realtime-create')
      .send({ mode: 'LOCAL', players: ['Piotr', 'Ania'] })
      .expect(201);
    const setCookie = created.get('Set-Cookie');
    if (!setCookie) {
      throw new Error('The host cookie was not set');
    }
    const hostCookie = setCookie.map((cookie) => cookie.split(';')[0]);
    const game = gameFrom(created.body);

    const act = async (path: string, key: string, body?: object) =>
      gameFrom(
        (
          await request(server)
            .post(`/games/${game.id}/${path}`)
            .set('Cookie', hostCookie)
            .set('Idempotency-Key', key)
            .send(body)
            .expect(201)
        ).body,
      );

    return { game, hostCookie, act };
  }

  it('pushes each action to the host as host and to viewers as viewers', async () => {
    const { game, hostCookie, act } = await createGame();
    await act('start', 'realtime-start');
    const host = connect(hostCookie);
    const viewer = connect();

    expect((await subscribe(host, game.id)).isHost).toBe(true);
    expect((await subscribe(viewer, game.id)).isHost).toBe(false);

    const hostUpdate = next<GameView>(host, 'game');
    const viewerUpdate = next<GameView>(viewer, 'game');
    const [piotr] = game.participants;
    const rolled = await act('roll', 'realtime-roll', { playerId: piotr.id, dice: [6, 6, 6, 2, 3] });

    const [forHost, forViewer] = await Promise.all([hostUpdate, viewerUpdate]);
    expect(forHost).toEqual({ ...rolled, isHost: true });
    expect(forViewer).toEqual({ ...rolled, isHost: false });
  });

  it('catches a reconnecting viewer up on the actions it missed', async () => {
    const { game, act } = await createGame();
    await act('start', 'realtime-start');
    const viewer = connect();
    const seen = await subscribe(viewer, game.id);
    viewer.disconnect();

    // two actions while the viewer is offline
    const [piotr] = game.participants;
    await act('roll', 'realtime-roll', { playerId: piotr.id, dice: [6, 6, 6, 2, 3] });
    const latest = await act('score', 'realtime-score', { playerId: piotr.id, category: 'six' });

    const back = connect();
    const caughtUp = next<GameView>(back, 'game');
    back.emit('subscribe', { gameId: game.id, revision: seen.revision });

    expect(latest.revision).toBe(seen.revision + 2);
    expect(await caughtUp).toEqual({ ...latest, isHost: false });
  });

  it('does not push a replayed action again', async () => {
    const { game, act } = await createGame();
    await act('start', 'realtime-start');
    const viewer = connect();
    await subscribe(viewer, game.id);

    const pushed: number[] = [];
    viewer.on('game', (state: GameView) => pushed.push(state.revision));

    const [piotr] = game.participants;
    const roll = { playerId: piotr.id, dice: [1, 1, 1, 2, 3] };
    const firstPush = next<GameView>(viewer, 'game');
    const rolled = await act('roll', 'realtime-roll', roll);
    await firstPush;
    await act('roll', 'realtime-roll', roll);

    // the next real action is pushed after the replay, so anything the replay sent is in by now
    const secondPush = next<GameView>(viewer, 'game');
    const scored = await act('score', 'realtime-score', { playerId: piotr.id, category: 'one' });
    await secondPush;

    expect(pushed).toEqual([rolled.revision, scored.revision]);
  });

  it('answers an invalid subscribe with the API error shape', async () => {
    const viewer = connect();
    const error = next<ApiErrorResponse>(viewer, 'exception');
    viewer.emit('subscribe', { gameId: 'no-such-game', revision: 0 });

    expect(await error).toEqual({ statusCode: 404, message: 'Game not found', data: null });
  });
});
