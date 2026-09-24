import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './test-app';

describe('Games full flow', () => {
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

    it('should complete a full game', async () => {
        const agent = request.agent(app.getHttpServer());

        
        const createResponse = await agent
            .post('/games')
            .set('Idempotency-Key', 'test-full-game-create')
            .send({
                players: ['Piotr'],
            });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.data.status).toBe('LOBBY');
        expect(createResponse.body.data.participants).toHaveLength(1);

        const gameId = createResponse.body.data.id;
        const hostId = createResponse.body.data.participants[0].id;

        // 2. Join second player
        const joinResponse = await agent
            .post(`/games/${gameId}/join`)
            .set('Idempotency-Key', 'test-full-game-join')
            .send({
                name: 'Jan',
            });

        expect(joinResponse.status).toBe(201);
        expect(joinResponse.body.data.participants[1].name).toBe('Jan');

        const playerId = joinResponse.body.data.participants[1].id;

        // 3. Start game
        const startResponse = await agent
            .post(`/games/${gameId}/start`)
            .set('Idempotency-Key', 'test-full-game-start')
            .send();

        expect(startResponse.status).toBe(201);
        expect(startResponse.body.data.status).toBe('IN_PROGRESS');
        expect(startResponse.body.data.currentPlayerId).toBe(hostId);

        const categories = [
            'one',
            'two',
            'three',
            'four',
            'five',
            'six',
            'pair',
            'twoPairs',
            'threeOfKind',
            'fourOfKind',
            'full',
            'smallStraight',
            'largeStraight',
            'general',
            'chance',
        ];

        const players = [hostId, playerId];

        // 4. Play all 30 turns
        for (let turn = 0; turn < categories.length * players.length; turn++) {
            const currentPlayerId = players[turn % players.length];
            const category = categories[Math.floor(turn / players.length)];

            const rollResponse = await agent
                .post(`/games/${gameId}/roll`)
                .set('Idempotency-Key', `test-full-game-roll-${turn}`)
                .send({
                    playerId: currentPlayerId,
                    dice: [1, 1, 1, 1, 1],
                });

            expect(rollResponse.status).toBe(201);
            expect(rollResponse.body.data.currentDice).toEqual([1, 1, 1, 1, 1]);
            expect(rollResponse.body.data.currentPlayerId).toBe(currentPlayerId);

            const scoreResponse = await agent
                .post(`/games/${gameId}/score`)
                .set('Idempotency-Key', `test-full-game-score-${turn}`)
                .send({
                    playerId: currentPlayerId,
                    category,
                });

            expect(scoreResponse.status).toBe(201);

            if (turn < categories.length * players.length - 1) {
                expect(scoreResponse.body.data.status).toBe('IN_PROGRESS');
                expect(scoreResponse.body.data.currentDice).toBeNull();
            } else {
                expect(scoreResponse.body.data.status).toBe('COMPLETED');
                expect(scoreResponse.body.data.currentDice).toBeNull();
                expect(scoreResponse.body.data.currentPlayerId).toBeNull();
            }
        }

        // 5. Verify final state in database
        const game = await prisma.game.findUnique({
            where: {
                id: gameId,
            },
            include: {
                participants: {
                    orderBy: {
                        turnOrder: 'asc',
                    },
                },
            },
        });

        expect(game).not.toBeNull();
        expect(game?.status).toBe('COMPLETED');
        expect(game?.currentPlayerId).toBeNull();
        expect(game?.currentDice).toBeNull();

        expect(game?.participants).toHaveLength(2);

        for (const participant of game!.participants) {
            const scoreCard = participant.scoreCard as Record<string, number | null>;

            for (const category of categories) {
                expect(scoreCard[category]).not.toBeNull();
            }
        }
    });
});