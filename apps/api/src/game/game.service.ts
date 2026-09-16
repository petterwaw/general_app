import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JoinGameDto } from './dto/join-game.dto';
import { createEmptyScoreCard } from '@dice-app/game-core';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createGameDto: CreateGameDto) {
    const game = await this.prisma.gra.create({
      data: {},
    });

    return `Game has been created, id: ${game.id}`
  }

  findAll() {
    return this.prisma.gra.findMany()
  }

  async findOne(id: string) {
    const game = await this.prisma.gra.findUnique({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  update(id: number, updateGameDto: UpdateGameDto) {
    return `This action updates a #${id} game`;
  }

  remove(id: number) {
    return `This action removes a #${id} game`;
  }

  async join(id: string, joinGameDto: JoinGameDto) {

    const count = await this.prisma.uczestnik.count({
      where: {
        gameId: id,
      },
    });

    const player =  await this.prisma.uczestnik.create({
      data: {
        imie: joinGameDto.imie,
        kartaWynikow: createEmptyScoreCard(),
        kolejnosc: count+1,
        gameId: id
      }
    })
    console.log('CREATED PLAYER:', player);
    return player
  }
}
