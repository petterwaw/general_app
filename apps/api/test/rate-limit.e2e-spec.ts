import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import type { ApiErrorResponse } from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './test-app';

// Rate limits per client address. Every request in a test comes from the same address, and the
// counters live in the app's memory, so each test gets a fresh app with empty counters.

// Valid format (INVITE_CODE_ALPHABET), but no game has it, so a guess answers 404 until the limit.
const UNKNOWN_CODE = 'ABCDEF';

describe('Rate limits', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp({ rateLimits: true }));
    await cleanDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  function guessCode() {
    return request(app.getHttpServer()).get(`/games/by-code/${UNKNOWN_CODE}`);
  }

  // A new agent each time is a new device, so the one-active-game rule does not refuse it.
  function createLocalGame(index: number) {
    return request
      .agent(app.getHttpServer())
      .post('/games')
      .set('Idempotency-Key', `rate-limit-create-${index}`)
      .send({ mode: 'LOCAL', players: ['Ann'] });
  }

  // One after another: requests sent in parallel would leave it open which one gets the 429.
  async function useUpCodeGuesses() {
    for (let guess = 0; guess < 10; guess++) {
      const response = await guessCode();
      expect(response.status).toBe(404);
    }
  }

  it('lets 10 invite code guesses a minute through and answers the 11th with 429', async () => {
    await useUpCodeGuesses();

    const response = await guessCode();

    expect(response.status).toBe(429);
    expect(response.body as ApiErrorResponse).toEqual({
      statusCode: 429,
      message: 'Too many requests — try again in a moment',
      data: null,
    });
  });

  it('lets a guess through again once the oldest one is a minute old, with no block on top', async () => {
    const realNow = Date.now;
    let shift = 0;
    // the throttler reads the clock from Date.now only, so moving it moves the window
    Date.now = () => realNow() + shift;
    try {
      await useUpCodeGuesses();

      // over the limit late in the minute: a block would last a full minute from here
      shift = 50_000;
      expect((await guessCode()).status).toBe(429);

      // the first ten have expired; only a block counted from the 11th would still refuse
      shift = 61_000;
      expect((await guessCode()).status).toBe(404);
    } finally {
      Date.now = realNow;
    }
  });

  it('lets 20 games an hour be created and answers the 21st with 429', async () => {
    for (let index = 0; index < 20; index++) {
      const response = await createLocalGame(index);
      expect(response.status).toBe(201);
    }

    const response = await createLocalGame(20);

    expect(response.status).toBe(429);
  });

  it('counts each route on its own', async () => {
    await useUpCodeGuesses();
    expect((await guessCode()).status).toBe(429);

    const response = await request(app.getHttpServer()).get('/games/active');

    expect(response.status).toBe(200);
  });

  describe('game socket subscribe', () => {
    let url: string;
    const sockets: Socket[] = [];

    beforeEach(async () => {
      await app.listen(0);
      url = `http://localhost:${((app.getHttpServer() as Server).address() as AddressInfo).port}`;
    });

    afterEach(() => {
      sockets.splice(0).forEach((socket) => socket.disconnect());
    });

    async function connect(forwardedFor?: string) {
      const socket = io(url, {
        forceNew: true,
        reconnection: false,
        extraHeaders: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
      });
      sockets.push(socket);
      await new Promise<void>((resolve) => socket.once('connect', () => resolve()));
      return socket;
    }

    // Subscribes to a game that does not exist, so every answer is an 'exception': 404 until the
    // limit, 429 after it. Sent one after another, each waiting for its answer.
    async function subscribeTimes(socket: Socket, times: number) {
      const statuses: number[] = [];
      for (let attempt = 0; attempt < times; attempt++) {
        const answer = new Promise<ApiErrorResponse>((resolve) => socket.once('exception', resolve));
        socket.emit('subscribe', { gameId: 'unknown-game', revision: 0, eventsAfter: 0 });
        statuses.push((await answer).statusCode);
      }
      return statuses;
    }

    it('lets 60 subscribes a minute through and answers the 61st with 429', async () => {
      const socket = await connect();

      const statuses = await subscribeTimes(socket, 61);

      expect(statuses.slice(0, 60).every((status) => status === 404)).toBe(true);
      expect(statuses[60]).toBe(429);
    });

    it('counts per address, so a new socket from the same address is still limited', async () => {
      await subscribeTimes(await connect(), 60);

      expect(await subscribeTimes(await connect(), 1)).toEqual([429]);
    });

    it('takes the address Caddy appends last to X-Forwarded-For', async () => {
      const first = await connect('198.51.100.7, 203.0.113.1');
      await subscribeTimes(first, 60);

      // the same last entry with a different spoofed one in front: still the same client
      const sameClient = await connect('192.0.2.50, 203.0.113.1');
      expect(await subscribeTimes(sameClient, 1)).toEqual([429]);

      const otherClient = await connect('198.51.100.7, 203.0.113.2');
      expect(await subscribeTimes(otherClient, 1)).toEqual([404]);
    });
  });
});
