import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Games API', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();

        await app.init();

        prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
        await prisma.eventLog.deleteMany();
        await prisma.identity.deleteMany();
        await prisma.participant.deleteMany();
        await prisma.game.deleteMany();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should create a game', async () => {
        const response = await request(app.getHttpServer())
            .post('/games')
            .set('Idempotency-Key', 'test-create-game12')
            .send({
                hostName: 'Piotr',
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('LOBBY');
        expect(response.body.id).toBeDefined();
        expect(response.body.participants).toHaveLength(1);
    });

    it('should allow a player to join a game', async () => {
        const createResponse = await request(app.getHttpServer())
            .post('/games')
            .set('Idempotency-Key', 'test-create-for-join23')
            .send({ hostName: 'Piotr' });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.id;

        const joinResponse = await request(app.getHttpServer())
            .post(`/games/${gameId}/join`)
            .set('Idempotency-Key', 'test-join-player')
            .send({ name: 'Jan' });

        expect(joinResponse.status).toBe(201);
        expect(joinResponse.body.name).toBe('Jan');
        expect(joinResponse.body.gameId).toBe(gameId);
        expect(joinResponse.body.turnOrder).toBe(2);
    });
});