import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { RATE_LIMIT_MESSAGE } from './utils/rate-limit';


@Module({
  imports: [SentryModule.forRoot(), PrismaModule, GameModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{
        name: 'default',
        ttl: minutes(1),
        limit: 300,
        // a sliding window only: past the limit a request waits for the oldest one to expire,
        // with no extra block on top (routes that override ttl and limit keep this)
        blockDuration: 0,
      }],
      errorMessage: RATE_LIMIT_MESSAGE
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Reports what HttpExceptionFilter does not catch, i.e. real 500s; HTTP errors are expected
    // and stay out of Sentry.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
