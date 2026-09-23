import {
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateGameDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  players!: string[];
}