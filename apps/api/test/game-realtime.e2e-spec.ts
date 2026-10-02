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
    expect(forHost).toEqual({ ...rolled, isHost: true, myParticipantId: piotr.id });
    expect(forViewer).toEqual({ ...rolled, isHost: false, myParticipantId: null });
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
    expect(await caughtUp).toEqual({ ...latest, isHost: false, myParticipantId: null });
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
  describe('online game', () => {
    function cookieFrom(response: request.Response) {
      const setCookie = response.get('Set-Cookie');
      if (!setCookie) {
        throw new Error('The device cookie was not set');
      }
      return setCookie.map((cookie) => cookie.split(';')[0]);
    }

    // A started online game of two, each player on their own device (its own cookie).
    async function startOnlineGame() {
      const created = await request(server)
        .post('/games')
        .set('Idempotency-Key', 'realtime-online-create')
        .send({ mode: 'ONLINE', name: 'Piotr' })
        .expect(201);
      const creatorCookie = cookieFrom(created);
      const gameId = gameFrom(created.body).id;

      const joined = await request(server)
        .post(`/games/${gameId}/join`)
        .set('Idempotency-Key', 'realtime-online-join')
        .send({ name: 'Ania' })
        .expect(201);
      const playerCookie = cookieFrom(joined);

      const started = gameFrom(
        (
          await request(server)
            .post(`/games/${gameId}/start`)
            .set('Cookie', creatorCookie)
            .set('Idempotency-Key', 'realtime-online-start')
            .expect(201)
        ).body,
      );
      const [creator, player] = started.participants;

      const act = async (cookie: string[], path: string, key: string, body: object) =>
        gameFrom(
          (
            await request(server)
              .post(`/games/${gameId}/${path}`)
              .set('Cookie', cookie)
              .set('Idempotency-Key', key)
              .send(body)
              .expect(201)
          ).body,
        );

      return { gameId, creator, player, creatorCookie, playerCookie, act };
    }

    it("pushes to every player their own view after another player's move", async () => {
      const { gameId, creator, player, creatorCookie, playerCookie, act } = await startOnlineGame();
      const forCreator = connect(creatorCookie);
      const forPlayer = connect(playerCookie);
      await subscribe(forCreator, gameId);
      await subscribe(forPlayer, gameId);

      const creatorUpdate = next<GameView>(forCreator, 'game');
      const playerUpdate = next<GameView>(forPlayer, 'game');
      const rerolled = await act(creatorCookie, 'reroll', 'realtime-online-reroll', { held: [] });

      const [toCreator, toPlayer] = await Promise.all([creatorUpdate, playerUpdate]);
      expect(toCreator).toEqual({ ...rerolled, isHost: true, myParticipantId: creator.id });
      expect(toPlayer).toEqual({ ...rerolled, isHost: false, myParticipantId: player.id });
    });

    it('pushes the same view to every connection of one player', async () => {
      const { gameId, player, creatorCookie, playerCookie, act } = await startOnlineGame();
      const firstTab = connect(playerCookie);
      const secondTab = connect(playerCookie);
      await subscribe(firstTab, gameId);
      await subscribe(secondTab, gameId);

      const updates = Promise.all([next<GameView>(firstTab, 'game'), next<GameView>(secondTab, 'game')]);
      await act(creatorCookie, 'score', 'realtime-online-score', { category: 'chance' });

      const [inFirst, inSecond] = await updates;
      expect(inFirst).toEqual(inSecond);
      expect(inFirst.myParticipantId).toBe(player.id);
      expect(inFirst.currentPlayerId).toBe(player.id);
    });

    it('pushes a view of nobody to a device outside the game', async () => {
      const { gameId, creatorCookie, act } = await startOnlineGame();
      const viewer = connect();
      await subscribe(viewer, gameId);

      const update = next<GameView>(viewer, 'game');
      await act(creatorCookie, 'reroll', 'realtime-online-viewer', { held: [] });

      expect(await update).toEqual(
        expect.objectContaining({ isHost: false, myParticipantId: null }),
      );
    });

    // An online lobby of two, each on their own device; key keeps two lobbies in one test apart.
    async function createOnlineLobby(key: string) {
      const created = await request(server)
        .post('/games')
        .set('Idempotency-Key', `${key}-create`)
        .send({ mode: 'ONLINE', name: 'Piotr' })
        .expect(201);
      const gameId = gameFrom(created.body).id;

      const joined = await request(server)
        .post(`/games/${gameId}/join`)
        .set('Idempotency-Key', `${key}-join`)
        .send({ name: 'Ania' })
        .expect(201);
      const [, player] = gameFrom(joined.body).participants;

      return { gameId, player, creatorCookie: cookieFrom(created), playerCookie: cookieFrom(joined) };
    }

    it('turns the open screen of a player removed from the lobby into a viewer', async () => {
      const { gameId, player, creatorCookie, playerCookie } = await createOnlineLobby('realtime-remove');
      const removed = connect(playerCookie);
      expect((await subscribe(removed, gameId)).myParticipantId).toBe(player.id);

      const removal = next<GameView>(removed, 'game');
      await request(server)
        .delete(`/games/${gameId}/participants/${player.id}`)
        .set('Cookie', creatorCookie)
        .set('Idempotency-Key', 'realtime-remove')
        .expect(200);

      const afterRemoval = await removal;
      expect(afterRemoval).toEqual(expect.objectContaining({ isHost: false, myParticipantId: null }));
      expect(afterRemoval.participants.map((participant) => participant.id)).not.toContain(player.id);

      // still in the viewer room for what comes next
      const afterStart = next<GameView>(removed, 'game');
      await request(server)
        .post(`/games/${gameId}/start`)
        .set('Cookie', creatorCookie)
        .set('Idempotency-Key', 'realtime-remove-start')
        .expect(201);
      expect(await afterStart).toEqual(
        expect.objectContaining({ status: 'IN_PROGRESS', myParticipantId: null }),
      );
    });

    it('turns the other open tab of a player who left the lobby into a viewer', async () => {
      const { gameId, player, playerCookie } = await createOnlineLobby('realtime-leave');
      const otherTab = connect(playerCookie);
      expect((await subscribe(otherTab, gameId)).myParticipantId).toBe(player.id);

      const afterLeaving = next<GameView>(otherTab, 'game');
      await request(server)
        .post(`/games/${gameId}/leave`)
        .set('Cookie', playerCookie)
        .set('Idempotency-Key', 'realtime-leave')
        .expect(201);

      expect(await afterLeaving).toEqual(expect.objectContaining({ isHost: false, myParticipantId: null }));
    });

    it('does not push a removal to screens of another game', async () => {
      const { gameId, player, creatorCookie } = await createOnlineLobby('realtime-remove-a');
      const other = await createOnlineLobby('realtime-remove-b');
      const outsider = connect(other.playerCookie);
      await subscribe(outsider, other.gameId);

      const pushedGameIds: string[] = [];
      outsider.on('game', (state: GameView) => pushedGameIds.push(state.id));

      await request(server)
        .delete(`/games/${gameId}/participants/${player.id}`)
        .set('Cookie', creatorCookie)
        .set('Idempotency-Key', 'realtime-remove-a')
        .expect(200);

      // a push of its own game comes after anything the removal could have sent on this connection
      const ownUpdate = next<GameView>(outsider, 'game');
      await request(server)
        .post(`/games/${other.gameId}/start`)
        .set('Cookie', other.creatorCookie)
        .set('Idempotency-Key', 'realtime-remove-b-start')
        .expect(201);
      await ownUpdate;

      expect(pushedGameIds).toEqual([other.gameId]);
    });

    it('tells a player who they are when they subscribe', async () => {
      const { gameId, player, playerCookie } = await startOnlineGame();

      const state = await subscribe(connect(playerCookie), gameId);

      expect(state.myParticipantId).toBe(player.id);
      expect(state.isHost).toBe(false);
    });
  });
});
