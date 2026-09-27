import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

describe('Games API validation', () => {
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

    it('should not allow scoring without rolling dice', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-score-without-roll')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-score-without-roll')
            .send();

        expect(startResponse.status).toBe(201);

        const scoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score-without-roll')
            .send({
                playerId,
                category: 'three',
            });

        expect(scoreResponse.status).toBe(400);
    });

    it('should not allow rolling dice twice in the same turn', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-double-roll')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-double-roll')
            .send();

        expect(startResponse.status).toBe(201);

        const firstRollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-first-roll')
            .send({
                playerId,
                dice: [1, 2, 3, 4, 5],
            });

        expect(firstRollResponse.status).toBe(201);

        const secondRollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-second-roll')
            .send({
                playerId,
                dice: [6, 6, 6, 6, 6],
            });

        expect(secondRollResponse.status).toBe(400);
    });

    it('should not allow other player then host to score', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-wrong-turn')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const hostId = createResponse.body.data.participants[0].id;

        const joinResponse = await agent
            .post(`/games/${gameId}/join`)
            .set('Idempotency-Key', 'test-join-wrong-turn')
            .send({ name: 'Jan' });

        expect(joinResponse.status).toBe(201);

        const playerId = joinResponse.body.data.participants[1].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-wrong-turn')
            .send();

        expect(startResponse.status).toBe(201);

        const rollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-wrong-turn')
            .send({
                playerId: hostId,
                dice: [3, 3, 3, 4, 5],
            });

        expect(rollResponse.status).toBe(201);

        const scoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score-wrong-turn')
            .send({
                playerId,
                category: 'three',
            });

        expect(scoreResponse.status).toBe(400);
    });

    it('should not execute the same roll twice with the same idempotency key', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-idempotency-roll')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-idempotency-roll')
            .send();

        expect(startResponse.status).toBe(201);

        const firstRollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-idempotency')
            .send({
                playerId,
                dice: [1, 2, 3, 4, 5],
            });

        expect(firstRollResponse.status).toBe(201);

        const secondRollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-idempotency')
            .send({
                playerId,
                dice: [6, 6, 6, 6, 6],
            });

        expect(secondRollResponse.status).toBe(201);
        expect(secondRollResponse.body.data.currentDice).toEqual([1, 2, 3, 4, 5]);

        const game = await prisma.game.findUnique({
            where: { id: gameId },
        });

        expect(game?.currentDice).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not execute the same score twice with the same idempotency key', async () => {
        const agent = request.agent(app.getHttpServer());

        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-create-idempotency-score')
            .send({ players: ['Piotr'] });

        expect(createResponse.status).toBe(201);

        const gameId = createResponse.body.data.id;
        const playerId = createResponse.body.data.participants[0].id;

        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-start-idempotency-score')
            .send();

        expect(startResponse.status).toBe(201);

        const rollResponse = await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-idempotency-score')
            .send({
                playerId,
                dice: [3, 3, 3, 4, 5],
            });

        expect(rollResponse.status).toBe(201);

        const firstScoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score-idempotency')
            .send({
                playerId,
                category: 'three',
            });

        expect(firstScoreResponse.status).toBe(201);

        const secondScoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score-idempotency')
            .send({
                playerId,
                category: 'three',
            });

        expect(secondScoreResponse.status).toBe(201);

        const player = await prisma.participant.findUnique({
            where: { id: playerId },
        });

        expect(player?.scoreCard).toMatchObject({
            three: 9,
        });
    });

    it('should reject scoring a category that is already taken with a 400', async () => {
        const { agent, game } = await createGame(app, ['Piotr'], 'test-create-taken-category');
        const gameId = game.id;
        const playerId = game.participants[0].id;

        await agent.post(`/games/${gameId}/start`).set('Idempotency-Key', 'test-start-taken-category').send();

        await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-first-roll-taken-category')
            .send({ playerId, dice: [3, 3, 3, 4, 5] });
        const firstScoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-first-score-taken-category')
            .send({ playerId, category: 'three' });

        expect(firstScoreResponse.status).toBe(201);

        await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-second-roll-taken-category')
            .send({ playerId, dice: [3, 3, 3, 3, 5] });
        const secondScoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-second-score-taken-category')
            .send({ playerId, category: 'three' });

        expect(secondScoreResponse.status).toBe(400);
        expect(secondScoreResponse.body).toMatchObject({ statusCode: 400, data: null });
    });

    it('should reject scoring a locked lower section category with a 400', async () => {
        const { agent, game } = await createGame(app, ['Piotr'], 'test-create-locked-category');
        const gameId = game.id;
        const playerId = game.participants[0].id;

        await agent.post(`/games/${gameId}/start`).set('Idempotency-Key', 'test-start-locked-category').send();

        // three sixes score in the upper section, so no forced zero into the locked lower section
        await agent
            .post(`/games/${gameId}/roll`)
            .set('Idempotency-Key', 'test-roll-locked-category')
            .send({ playerId, dice: [6, 6, 6, 2, 3] });
        const scoreResponse = await agent
            .post(`/games/${gameId}/score`)
            .set('Idempotency-Key', 'test-score-locked-category')
            .send({ playerId, category: 'pair' });

        expect(scoreResponse.status).toBe(400);
        expect(scoreResponse.body).toMatchObject({ statusCode: 400, data: null });
    });
});
