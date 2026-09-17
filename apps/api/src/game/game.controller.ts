import { Controller, Req, Get, Post, Body, Patch, Param, Delete, Headers, Res } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { RollGameDto } from './dto/roll-game.dto'
import { ScoreGameDto } from './dto/score-game.dto'
import type { Response, Request } from 'express';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) { }

  @Post()
  async create(
    @Body() createGameDto: CreateGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.gameService.create(
      createGameDto,
      idempotencyKey,
    );

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
    @Body() joinGameDto: JoinGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.gameService.join(id, joinGameDto, idempotencyKey)
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request
  ) {
    return this.gameService.start(
      id,
      idempotencyKey,
      request.cookies.host_secret,
    );
  }

  @Post(':id/roll')
  roll(
    @Param('id') id: string,
    @Body() rollGameDto: RollGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.gameService.roll(id, rollGameDto, idempotencyKey);
  }

  @Post(':id/score')
  score(
    @Param('id') id: string,
    @Body() scoreGameDto: ScoreGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.gameService.score(id, scoreGameDto, idempotencyKey)
  }


  /*@Patch(':id')
  update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
    return this.gameService.update(+id, updateGameDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gameService.remove(+id);
  }*/
}
