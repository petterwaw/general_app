import type {
  Category,
  CreateGameInput,
  DiceRoll,
  GameView,
  RollInput,
  ScoreInput,
} from '@dice-app/contracts';
import { apiRequest } from './client';

export function createGame(players: string[]) {
  const body: CreateGameInput = { players };
  return apiRequest<GameView>('/games', { method: 'POST', body });
}

export function getGame(gameId: string) {
  return apiRequest<GameView>(`/games/${gameId}`);
}

export function startGame(gameId: string) {
  return apiRequest<GameView>(`/games/${gameId}/start`, { method: 'POST' });
}

export function submitRoll(gameId: string, playerId: string, dice: DiceRoll) {
  const body: RollInput = { playerId, dice };
  return apiRequest<GameView>(`/games/${gameId}/roll`, { method: 'POST', body });
}

export function scoreCategory(gameId: string, playerId: string, category: Category) {
  const body: ScoreInput = { playerId, category };
  return apiRequest<GameView>(`/games/${gameId}/score`, { method: 'POST', body });
}
