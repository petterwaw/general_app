import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { scoreCardSchema, type ApiResponse, type GameView } from '@dice-app/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createGame, createTestApp } from './test-app';

// Requests that arrive at the same time. Whether they overlap or run one after another differs
// between runs, so each test checks what has to hold either way, not which request wins.

type Agent = Awaited<ReturnType<typeof createGame>>['agent'];

// supertest types every body as `any`; responses are read through the shared contract instead.
function gameFrom(body: unknown): GameView {
  return (body as ApiResponse<GameView>).data;
}

describe('Concurrent requests', () => {
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

  async function startGame(players: string[], key: string) {
    const created = await createGame(app, players, `${key}-create`);
    const game = created.game as GameView;

    await created.agent
      .post(`/games/${game.id}/start`)
      .set('Idempotency-Key', `${key}-start`)
      .send()
      .expect(201);

    return { agent: created.agent, game };
  }

  function roll(agent: Agent, gameId: string, playerId: string, key: string) {
    return agent
      .post(`/games/${gameId}/roll`)
      .set('Idempotency-Key', key)
      .send({ playerId, dice: [1, 1, 1, 2, 3] });
  }

  function countEvents(gameId: string, actionType: string) {
    return prisma.eventLog.count({ where: { gameId, actionType } });
  }

  // DECYZJE.md §5 and §6: the limit has to hold in the database, a check in the service alone
  // lets two simultaneous requests through.
  it('never lets one device host two active games', async () => {
    const { agent, game } = await createGame(app, ['Piotr'], 'race-host-first');
    // after leaving, the device keeps its host identity but has no active game
    await agent
      .post(`/games/${game.id}/leave`)
      .set('Idempotency-Key', 'race-host-leave')
      .send()
      .expect(201);

    const responses = await Promise.all(
      ['race-host-a', 'race-host-b', 'race-host-c'].map((key) =>
        agent.post('/games').set('Idempotency-Key', key).send({ mode: 'LOCAL', players: ['Piotr'] }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.game.count({ where: { status: { in: ['LOBBY', 'IN_PROGRESS'] } } })).toBe(1);
  });

  it('creates one game when the same creation request arrives twice at once', async () => {
    const agent = request.agent(app.getHttpServer());

    const [first, second] = await Promise.all(
      [1, 2].map(() =>
        agent.post('/games').set('Idempotency-Key', 'race-create-replay').send({ mode: 'LOCAL', players: ['Piotr'] }),
      ),
    );

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(gameFrom(second.body).id).toBe(gameFrom(first.body).id);
    expect(await prisma.game.count()).toBe(1);
    expect(await prisma.identity.count()).toBe(1);
  });

  // The web client puts a fresh Idempotency-Key on every request, so a double click reaches the
  // server as two different actions.
  it('saves one category when a turn is scored twice at once', async () => {
    const { agent, game } = await startGame(['Piotr', 'Ania'], 'race-score');
    const playerId = game.participants[0].id;
    await roll(agent, game.id, playerId, 'race-score-roll').expect(201);

    const responses = await Promise.all(
      (['one', 'chance'] as const).map((category) =>
        agent
          .post(`/games/${game.id}/score`)
          .set('Idempotency-Key', `race-score-${category}`)
          .send({ playerId, category }),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);

    const player = await prisma.participant.findUniqueOrThrow({ where: { id: playerId } });
    const filled = Object.values(scoreCardSchema.parse(player.scoreCard)).filter((value) => value !== null);
    expect(filled).toHaveLength(1);
    expect(await countEvents(game.id, 'saveCategory')).toBe(1);
  });

  it('records a roll once when the same request arrives twice at once', async () => {
    const { agent, game } = await startGame(['Piotr'], 'race-roll');
    const playerId = game.participants[0].id;

    const responses = await Promise.all(
      [1, 2].map(() => roll(agent, game.id, playerId, 'race-roll-same-key')),
    );

    expect(responses.map((response) => response.status)).toContain(201);
    expect(responses.every((response) => response.status < 500)).toBe(true);
    expect(await countEvents(game.id, 'diceConfirmation')).toBe(1);

    const stored = await prisma.game.findUniqueOrThrow({ where: { id: game.id } });
    // one start and one roll
    expect(stored.revision).toBe(2);
  });

  it('keeps the revision in step with the event log under simultaneous joins', async () => {
    const { agent, game } = await createGame(app, ['Piotr'], 'race-join-create');

    const responses = await Promise.all(
      ['Ania', 'Jan', 'Ola', 'Ewa'].map((name) =>
        agent.post(`/games/${game.id}/join`).set('Idempotency-Key', `race-join-${name}`).send({ name }),
      ),
    );

    const joined = responses.filter((response) => response.status === 201).length;
    expect(joined).toBeGreaterThanOrEqual(1);
    expect(responses.every((response) => response.status === 201 || response.status === 409)).toBe(true);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: game.id },
      include: { participants: true },
    });
    expect(stored.participants).toHaveLength(1 + joined);
    expect(stored.revision).toBe(joined);
    expect(await countEvents(game.id, 'playerJoined')).toBe(joined);
  });
});
