import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame as createGameFor, createTestApp } from './test-app';

describe('Games API contract', () => {
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

    const createGame = (players: string[], key: string) => createGameFor(app, players, key);

    describe('response shape', () => {
        it('wraps data in the response envelope', async () => {
            const response = await request(app.getHttpServer())
                .post('/games')
                .set('Idempotency-Key', 'contract-envelope')
                .send({ players: ['Piotr'] });

            expect(response.body).toEqual({
                statusCode: 201,
                message: expect.any(String),
                data: expect.any(Object),
            });
        });

        it('exposes only public game and participant fields', async () => {
            const { game } = await createGame(['Piotr', 'Ania'], 'contract-fields');

            expect(Object.keys(game).sort()).toEqual(
                ['currentDice', 'currentPlayerId', 'id', 'participants', 'revision', 'status'],
            );

            for (const participant of game.participants) {
                expect(Object.keys(participant).sort()).toEqual(
                    ['finalScore', 'id', 'name', 'role', 'scoreCard', 'turnOrder', 'upperBonus'],
                );
            }
        });

        it('wraps errors in the response envelope', async () => {
            const response = await request(app.getHttpServer()).get('/games/missing-game');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                statusCode: 404,
                message: 'Game not found',
                data: null,
            });
        });
    });

    describe('idempotent create', () => {
        it('returns the same game with participants on replay and sets no new cookie', async () => {
            const first = await request(app.getHttpServer())
                .post('/games')
                .set('Idempotency-Key', 'contract-create-replay')
                .send({ players: ['Piotr', 'Ania'] });

            const replay = await request(app.getHttpServer())
                .post('/games')
                .set('Idempotency-Key', 'contract-create-replay')
                .send({ players: ['Piotr', 'Ania'] });

            expect(first.headers['set-cookie']).toBeDefined();
            expect(replay.status).toBe(201);
            expect(replay.headers['set-cookie']).toBeUndefined();
            expect(replay.body.data).toEqual(first.body.data);
        });
    });

    describe('host authorization', () => {
        const hostActionBodies: Record<string, (playerId: string) => object | undefined> = {
            start: () => undefined,
            roll: (playerId) => ({ playerId, dice: [1, 2, 3, 4, 5] }),
            score: (playerId) => ({ playerId, category: 'one' }),
        };

        it.each(Object.keys(hostActionBodies))('rejects %s without the host cookie with 403', async (action) => {
            const { game } = await createGame(['Piotr'], `contract-no-cookie-${action}`);

            const response = await request(app.getHttpServer())
                .post(`/games/${game.id}/${action}`)
                .set('Idempotency-Key', `contract-no-cookie-${action}-action`)
                .send(hostActionBodies[action](game.participants[0].id));

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Invalid host credentials');
        });

        it('rejects a host cookie from another game with 403', async () => {
            const { agent } = await createGame(['Piotr'], 'contract-own-game');
            const { game: otherGame } = await createGame(['Ania'], 'contract-other-game');

            const response = await agent
                .post(`/games/${otherGame.id}/start`)
                .set('Idempotency-Key', 'contract-start-other-game')
                .send();

            expect(response.status).toBe(403);
        });
    });

    describe('player limit', () => {
        const names = (count: number) => Array.from({ length: count }, (_, i) => `Player ${i + 1}`);

        it('allows 8 players', async () => {
            const { game } = await createGame(names(8), 'contract-8-players');

            expect(game.participants).toHaveLength(8);
        });

        it('rejects 9 players', async () => {
            const response = await request(app.getHttpServer())
                .post('/games')
                .set('Idempotency-Key', 'contract-9-players')
                .send({ players: names(9) });

            expect(response.status).toBe(400);
        });

        it('rejects a join when the game already has 8 players', async () => {
            const { game } = await createGame(names(8), 'contract-full-lobby');

            const response = await request(app.getHttpServer())
                .post(`/games/${game.id}/join`)
                .set('Idempotency-Key', 'contract-join-full-lobby')
                .send({ name: 'Ninth' });

            expect(response.status).toBe(400);
        });
    });

    describe('input validation', () => {
        it.each([
            ['no players', { players: [] }],
            ['whitespace-only name', { players: ['   '] }],
            ['name longer than 50 characters', { players: ['x'.repeat(51)] }],
            ['non-string name', { players: [42] }],
            ['unknown field', { players: ['Piotr'], admin: true }],
        ])('rejects create with %s', async (label, body) => {
            const response = await request(app.getHttpServer())
                .post('/games')
                .set('Idempotency-Key', `contract-invalid-${label}`)
                .send(body);

            expect(response.status).toBe(400);
            expect(response.body.data).toBeNull();
        });

        it('trims player names', async () => {
            const { game } = await createGame(['  Piotr  '], 'contract-trim');

            expect(game.participants[0].name).toBe('Piotr');
        });

        it('requires the Idempotency-Key header', async () => {
            const response = await request(app.getHttpServer())
                .post('/games')
                .send({ players: ['Piotr'] });

            expect(response.status).toBe(400);
        });

        it.each([
            ['a die above 6', [1, 2, 3, 4, 7]],
            ['a die below 1', [0, 2, 3, 4, 5]],
            ['four dice', [1, 2, 3, 4]],
            ['a non-integer die', [1.5, 2, 3, 4, 5]],
        ])('rejects a roll with %s', async (label, dice) => {
            const { agent, game } = await createGame(['Piotr'], `contract-roll-${label}`);

            await agent
                .post(`/games/${game.id}/start`)
                .set('Idempotency-Key', `contract-roll-start-${label}`)
                .send();

            const response = await agent
                .post(`/games/${game.id}/roll`)
                .set('Idempotency-Key', `contract-roll-action-${label}`)
                .send({ playerId: game.participants[0].id, dice });

            expect(response.status).toBe(400);
        });

        it('rejects scoring an unknown category', async () => {
            const { agent, game } = await createGame(['Piotr'], 'contract-bad-category');
            const playerId = game.participants[0].id;

            await agent
                .post(`/games/${game.id}/start`)
                .set('Idempotency-Key', 'contract-bad-category-start')
                .send();
            await agent
                .post(`/games/${game.id}/roll`)
                .set('Idempotency-Key', 'contract-bad-category-roll')
                .send({ playerId, dice: [1, 2, 3, 4, 5] });

            const response = await agent
                .post(`/games/${game.id}/score`)
                .set('Idempotency-Key', 'contract-bad-category-score')
                .send({ playerId, category: 'yahtzee' });

            expect(response.status).toBe(400);
        });
    });
});
