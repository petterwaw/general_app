import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  hostName!: string;
}
