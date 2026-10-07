import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
});
