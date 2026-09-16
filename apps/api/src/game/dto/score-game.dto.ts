import type { Category } from '@dice-app/game-core';

export class ScoreGameDto {
  playerId!: string;
  category!: Category;
}