import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JoinGameDto } from './dto/join-game.dto';
import { createEmptyScoreCard, reducer, isGameOver } from '@dice-app/game-core';
import { RollGameDto } from './dto/roll-game.dto'
import { ScoreGameDto } from './dto/score-game.dto'
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) { }

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

    const player = await this.prisma.uczestnik.create({
      data: {
        imie: joinGameDto.imie,
        kartaWynikow: createEmptyScoreCard(),
        kolejnosc: count + 1,
        gameId: id
      }
    })
    console.log('CREATED PLAYER:', player);
    return player
  }

  async start(id: string) {
    const game = await this.prisma.gra.findUnique({
      where: { id },
      include: {
        uczestnicy: {
          orderBy: {
            kolejnosc: 'asc',
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.uczestnicy.length === 0) {
      throw new BadRequestException('Game needs at least one player');
    }

    const firstPlayer = game.uczestnicy[0];

    const updatedGame = await this.prisma.gra.update({
      where: { id },
      data: {
        status: 'TRWA',
        aktualnyGraczId: firstPlayer.id,
        revision: {
          increment: 1,
        },
        ostatniaAktywnosc: new Date(),
      },
    });

    return updatedGame;
  }

  async roll(id: string, rollGameDto: RollGameDto) {
    const game = await this.prisma.gra.findUnique({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== 'TRWA') {
      throw new BadRequestException('Game is not in progress');
    }

    if (game.aktualnyGraczId !== rollGameDto.playerId) {
      throw new BadRequestException('It is not this player\'s turn');
    }

    const updatedGame = await this.prisma.gra.update({
      where: { id },
      data: {
        aktualneKosci: rollGameDto.dice,
        revision: {
          increment: 1,
        },
        ostatniaAktywnosc: new Date(),
      },
    });

    return updatedGame;
  }

  async score(id: string, scoreGameDto: ScoreGameDto) {
    const game = await this.prisma.gra.findUnique({
      where: { id },
      include: {
        uczestnicy: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== 'TRWA') {
      throw new BadRequestException('Game is not in progress');
    }

    if (!game.aktualneKosci) {
      throw new BadRequestException('There is no dice roll to score');
    }

    if (game.aktualnyGraczId !== scoreGameDto.playerId) {
      throw new BadRequestException('It is not this player\'s turn');
    }

    const gameState = {
      players: game.uczestnicy.map((player) => ({
        id: player.id,
        name: player.imie,
        card: player.kartaWynikow as ScoreCard,
      })),
      currentPlayerId: game.aktualnyGraczId!,
    };

    const newState = reducer(gameState, {
      type: 'saveCategory',
      playerId: scoreGameDto.playerId,
      category: scoreGameDto.category,
      dice: game.aktualneKosci as DiceRoll,
    });

    const gameOver = isGameOver(newState);

    const updatedGame = await this.prisma.$transaction([
      ...newState.players.map((player) =>
        this.prisma.uczestnik.update({
          where: { id: player.id },
          data: {
            kartaWynikow: player.card,
          },
        }),
      ),

      this.prisma.gra.update({
        where: { id },
        data: {
          aktualnyGraczId: gameOver
            ? null
            : newState.currentPlayerId,
          aktualneKosci: Prisma.DbNull,
          status: gameOver
            ? 'ZAKONCZONA'
            : 'TRWA',
          revision: {
            increment: 1,
          },
          ostatniaAktywnosc: new Date(),
        },
      }),
    ]);

    return updatedGame;
  }
}
