import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { Category } from '@dice-app/game-core';

const categories = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'pair',
  'twoPairs',
  'threeOfKind',
  'fourOfKind',
  'full',
  'smallStraight',
  'largeStraight',
  'general',
  'chance',
] as const;

export class ScoreGameDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsIn(categories)
  category!: Category;
}
