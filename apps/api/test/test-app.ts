import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { ThrottlerStorage } from '@nestjs/throttler';

// Never blocks: the guard and the @Throttle decorators still run, only the counting is off.
// All test requests come from one address, so the real limits would trip the tests.
const unlimitedStorage: ThrottlerStorage = {
    increment: async () => ({
        totalHits: 0,          
        timeToExpire: 0,       
        isBlocked: false,         
        timeToBlockExpire: 0,
    }),
};

// Rate limits are off unless a test asks for them, as the rate-limit tests do.
export async function createTestApp({ rateLimits = false } = {}) {
    const builder = Test.createTestingModule({
        imports: [AppModule],
    });

    if (!rateLimits) {
        builder.overrideProvider(ThrottlerStorage).useValue(unlimitedStorage)
    }

    const moduleRef = await builder.compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();

    configureApp(app, ['http://localhost:8080']);

    await app.init();

    const prisma = app.get(PrismaService);

    return { app, prisma };
}

export async function cleanDatabase(prisma: PrismaService) {
    await prisma.eventLog.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.game.deleteMany();
}

// Creates a game through the API; the returned agent carries the host cookie.
export async function createGame(app: INestApplication, players: string[], idempotencyKey: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
        .post('/games')
        .set('Idempotency-Key', idempotencyKey)
        .send({ mode: 'LOCAL', players });

    expect(response.status).toBe(201);

    return { agent, game: response.body.data };
}
