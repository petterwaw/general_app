import type {
  Category,
  CreateGameInput,
  DiceRoll,
  GameView,
  RollInput,
  RerollInput,
  ScoreInput,
  JoinGameInput,
  GameEventView
} from '@dice-app/contracts';
import { apiRequest } from './client';

export function createGame(input: CreateGameInput) {
  return apiRequest<GameView>('/games', { method: 'POST', body: input });
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

// `playerId` only in a local game, where the host scores for whoever's turn it is; an online
// player scores for themselves and the server refuses a player sent along
export function scoreCategory(gameId: string, category: Category, playerId?: string) {
  const body: ScoreInput = playerId === undefined ? { category } : { playerId, category };
  return apiRequest<GameView>(`/games/${gameId}/score`, { method: 'POST', body });
}

export function rerollDice(gameId: string, held: number[]): Promise<GameView> {
  const body: RerollInput = {held}
  return apiRequest<GameView>(`/games/${gameId}/reroll`, { method: 'POST', body });
}

export function leaveGame(gameId: string) {
  return apiRequest<GameView>(`/games/${gameId}/leave`, { method: 'POST' });
}

export function joinGame(gameId: string, name: string) {
  const body: JoinGameInput = { name };
  return apiRequest<GameView>(`/games/${gameId}/join`, { method: 'POST', body });
}

export function getHostedGame() {
  return apiRequest<GameView | null>(`/games/hosted`);
}

export function getGameEvents(gameId: string, after?: number) {
  return apiRequest<GameEventView[]>(`/games/${gameId}/events${after !== undefined ? '?after=' + after: ''}`);
}

export function removeParticipant(gameId: string, participantId: string) {
  return apiRequest<GameView>(`/games/${gameId}/participants/${participantId}`, { method: 'DELETE' });
}