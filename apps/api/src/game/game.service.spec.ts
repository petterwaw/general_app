import { Test, TestingModule } from '@nestjs/testing';
jest.mock('@dice-app/game-core', () => ({
  ...jest.requireActual<object>('@dice-app/game-core'),
  createEmptyScoreCard: jest.fn(),
  reducer: jest.fn(),
  isGameOver: jest.fn(),
}));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }));
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { GameUpdates } from './game-updates';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, GameUpdates, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
