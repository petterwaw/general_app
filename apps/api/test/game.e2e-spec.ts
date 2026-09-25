import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './test-app';

describe('Games API', () => {
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

    it('should create a game', async () => {
        const response = await request(app.getHttpServer())
            .post('/games')
            .set('Idempotency-Key', 'test-create-game12')
            .send({
                players: ['Piotr'],
            });

        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('LOBBY');
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.participants).toHaveLength(1);
    });

    it('should allow the host to add a player to the lobby', async () => {
        const agent = request.agent(app.getHttpServer());
        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-for-join23')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;

        const joinResponse = await agent
            .post(`/games/${gameId}/join`)
            .set('Idempotency-Key', 'test-join-player')
            .send({ name: 'Jan' });

        expect(joinResponse.status).toBe(201);
        expect(joinResponse.body.data.id).toBe(gameId);
        expect(joinResponse.body.data.participants).toHaveLength(2);
        expect(joinResponse.body.data.participants[1].name).toBe('Jan');
        expect(joinResponse.body.data.participants[1].turnOrder).toBe(2);
    });

    it('should create a game with multiple players', async () => {
        const response = await request(app.getHttpServer())
            .post('/games')
            .set('Idempotency-Key', 'test-create-multiple-players')
            .send({
                players: ['Piotr', 'Ania', 'Kuba'],
            });

        expect(response.status).toBe(201);
        expect(response.body.data.participants).toHaveLength(3);

        expect(response.body.data.participants[0].name).toBe('Piotr');
        expect(response.body.data.participants[0].turnOrder).toBe(1);
        expect(response.body.data.participants[0].role).toBe('HOST');

        expect(response.body.data.participants[1].name).toBe('Ania');
        expect(response.body.data.participants[1].turnOrder).toBe(2);
        expect(response.body.data.participants[1].role).toBe('PLAYER');

        expect(response.body.data.participants[2].name).toBe('Kuba');
        expect(response.body.data.participants[2].turnOrder).toBe(3);
        expect(response.body.data.participants[2].role).toBe('PLAYER');
    });

    it('should start a game', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-for-start')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const hostId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-game')
            .send();

        expect(startResponse.status).toBe(201);
        expect(startResponse.body.data.status).toBe('IN_PROGRESS');
        expect(startResponse.body.data.currentPlayerId).toBe(hostId);
    });

    it('should roll dice', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-for-roll')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-for-roll')
            .send();

        expect(startResponse.status).toBe(201);

        const rollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll')
            .send({
                playerId,
                dice: [1, 2, 3, 4, 5],
            });

        expect(rollResponse.status).toBe(201);
        expect(rollResponse.body.data.currentDice).toEqual([1, 2, 3, 4, 5]);
    });

    it('should score', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-for-score')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-for-score')
            .send();

        expect(startResponse.status).toBe(201);

        const rollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-for-score')
            .send({
                playerId,
                dice: [3, 3, 3, 4, 5],
            });

        expect(rollResponse.status).toBe(201);
        expect(rollResponse.body.data.currentDice).toEqual([3, 3, 3, 4, 5]);

        const scoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score')
            .send({
                playerId,
                category: 'three',
            });

        expect(scoreResponse.status).toBe(201);

        const player = await prisma.participant.findUnique({
            where: {
                id: playerId,
            },
        });

        expect(player?.scoreCard).toMatchObject({
            three: 9,
        });
    });
})