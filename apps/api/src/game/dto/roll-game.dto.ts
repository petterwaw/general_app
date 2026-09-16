import type { DiceRoll } from '@dice-app/game-core';

export class RollGameDto {
  playerId!: string;
  dice!: DiceRoll;
}