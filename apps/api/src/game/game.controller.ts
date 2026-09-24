import { Controller, Req, Get, Post, Body, Param, Headers, Res } from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  createGameSchema,
  joinGameSchema,
  rollSchema,
  scoreSchema,
  type CreateGameInput,
  type JoinGameInput,
  type RollInput,
  type ScoreInput,
} from '@dice-app/contracts';
import { GameService } from './game.service';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) { }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createGameSchema)) input: CreateGameInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.gameService.create(input, idempotencyKey);

    if (result.hostSecret) {
      response.cookie('host_secret', result.hostSecret, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    }

    return result.game;
  }

  @Get()
  findAll() {
    return this.gameService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameService.findOne(id);
  }

  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(joinGameSchema)) input: JoinGameInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.gameService.join(id, input, idempotencyKey);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.start(id, idempotencyKey, hostSecretFrom(request));
  }

  @Post(':id/roll')
  roll(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rollSchema)) input: RollInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.roll(id, input, idempotencyKey, hostSecretFrom(request));
  }

  @Post(':id/score')
  score(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(scoreSchema)) input: ScoreInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.score(id, input, idempotencyKey, hostSecretFrom(request));
  }
}

function hostSecretFrom(request: Request): string | undefined {
  const secret: unknown = request.cookies?.host_secret;
  return typeof secret === 'string' ? secret : undefined;
}
