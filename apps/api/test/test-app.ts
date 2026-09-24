import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createTestApp() {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    configureApp(app, 'http://localhost:8080');

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
        .send({ players });

    expect(response.status).toBe(201);

    return { agent, game: response.body.data };
}
