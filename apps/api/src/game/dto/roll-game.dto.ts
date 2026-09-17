import type { DiceRoll } from '@dice-app/game-core';

export class RollGameDto {
  playerId!: string;

  // TODO(validation): Validate this value at runtime: it must be an array of
  // exactly five integers, each between 1 and 6. TypeScript's DiceRoll type
  // does not validate data received over HTTP.
  dice!: DiceRoll;
}
