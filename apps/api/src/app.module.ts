import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';


@Module({
  imports: [PrismaModule, GameModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{
        name: 'default',
        ttl: minutes(1),
        limit: 300,
      }],
      errorMessage: 'Too many requests — try again in a moment'
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
