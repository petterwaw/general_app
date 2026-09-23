import type { Game } from './gameTypes'

export type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type CreateGameResponse = {
  game: Game;
  hostSecret: string;
};