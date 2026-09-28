import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GameGateway } from './game.gateway'
import { GameUpdates } from './game-updates';

@Module({
  imports: [PrismaModule],
  controllers: [GameController],
  providers: [GameService, GameGateway, GameUpdates],
})
export class GameModule {}
