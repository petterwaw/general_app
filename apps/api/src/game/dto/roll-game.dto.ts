import type { DiceRoll } from '@dice-app/game-core';
import { IsArray, IsInt, IsNotEmpty, IsString, Max, Min, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RollGameDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(6, { each: true })
  dice!: DiceRoll;
}
