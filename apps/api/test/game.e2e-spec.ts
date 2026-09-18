import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Games API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a game', async () => {
    const response = await request(app.getHttpServer())
      .post('/games')
      .set('Idempotency-Key', 'test-create-game')
      .send({
        hostName: 'Piotr',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('LOBBY');
    expect(response.body.id).toBeDefined();
    expect(response.body.participants).toHaveLength(1);
  });
});