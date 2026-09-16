import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { RollGameDto } from './dto/roll-game.dto'
import { ScoreGameDto } from './dto/score-game.dto'

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  create(@Body() createGameDto: CreateGameDto) {
    return this.gameService.create(createGameDto);
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
    @Body() joinGameDto: JoinGameDto
  ) {
    return this.gameService.join(id, joinGameDto)
  }

  @Post(':id/start')
  start(
    @Param('id') id:string
  ) {
    return this.gameService.start(id)
  }

  @Post(':id/roll')
  roll(
    @Param('id') id: string,
    @Body() rollGameDto: RollGameDto,
   ) {
    return this.gameService.roll(id, rollGameDto);
  }

  @Post(':id/score')
  score(
    @Param('id') id: string,
    @Body() scoreGameDto: ScoreGameDto
  ) {
    return this.gameService.score(id, scoreGameDto)
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
