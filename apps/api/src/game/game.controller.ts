import {
  Controller,
  Req,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  Res,
  Query,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  createGameSchema,
  gameEventsQuerySchema,
  joinGameSchema,
  rollSchema,
  rerollSchema,
  scoreSchema,
  inviteCodeSchema,
  type CreateGameInput,
  type GameEventsQuery,
  type JoinGameInput,
  type RollInput,
  type RerollInput,
  type ScoreInput,
  type InviteCodeInput,
} from '@dice-app/contracts';
import { GameService } from './game.service';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';
import { hostCookieOptions } from '../utils/host-cookie';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createGameSchema)) input: CreateGameInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.gameService.create(
      input,
      idempotencyKey,
      hostSecretFrom(request),
    );

    if (result.hostSecret) {
      response.cookie('host_secret', result.hostSecret, hostCookieOptions);
    }

    return result.game;
  }

  @Get()
  findAll() {
    return this.gameService.findAll();
  }

  @Get('active')
  active(@Req() request: Request) {
    return this.gameService.active(hostSecretFrom(request));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: Request) {
    return this.gameService.findOne(id, hostSecretFrom(request));
  }

  @Get(':id/events')
  events(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(gameEventsQuerySchema)) query: GameEventsQuery,
  ) {
    return this.gameService.events(id, query);
  }

  @Post(':id/join')
  async join(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(joinGameSchema)) input: JoinGameInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.gameService.join(
      id,
      input,
      idempotencyKey,
      hostSecretFrom(request),
    );

    if (result.newSecret) {
      response.cookie('host_secret', result.newSecret, hostCookieOptions);
    }

    return result.game;
  }

  @Post(':id/leave')
  leave(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.leave(id, idempotencyKey, hostSecretFrom(request));
  }

  @Delete(':id/participants/:participantId')
  removePlayer(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.removePlayer(
      id,
      participantId,
      idempotencyKey,
      hostSecretFrom(request),
    );
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
    return this.gameService.roll(
      id,
      input,
      idempotencyKey,
      hostSecretFrom(request),
    );
  }

  @Post(':id/reroll')
  reRoll(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rerollSchema)) input: RerollInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.reroll(
      id,
      input,
      idempotencyKey,
      hostSecretFrom(request),
    );
  }

  @Post(':id/score')
  score(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(scoreSchema)) input: ScoreInput,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.gameService.score(
      id,
      input,
      idempotencyKey,
      hostSecretFrom(request),
    );
  }

  @Get('by-code/:code')
  findByInviteCode(
    @Param('code', new ZodValidationPipe(inviteCodeSchema)) code: InviteCodeInput,
    @Req() request: Request,
  ) {
    return this.gameService.findByInviteCode(code, hostSecretFrom(request));
  }
}

function hostSecretFrom(request: Request): string | undefined {
  const secret: unknown = request.cookies?.host_secret;
  return typeof secret === 'string' ? secret : undefined;
}
