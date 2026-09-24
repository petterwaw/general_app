import { z } from 'zod';
import { CATEGORIES } from '@dice-app/game-core';
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';

export const MAX_PLAYERS = 8;
export const PLAYER_NAME_MAX_LENGTH = 50;

export { CATEGORIES };

const playerNameSchema = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);
const dieFaceSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const diceRollSchema = z.tuple([
  dieFaceSchema,
  dieFaceSchema,
  dieFaceSchema,
  dieFaceSchema,
  dieFaceSchema,
]) satisfies z.ZodType<DiceRoll>;

export const categorySchema = z.enum(CATEGORIES);

export const createGameSchema = z.strictObject({
  players: z.array(playerNameSchema).min(1).max(MAX_PLAYERS),
});

export const joinGameSchema = z.strictObject({
  name: playerNameSchema,
});

export const rollSchema = z.strictObject({
  playerId: z.string().min(1),
  dice: diceRollSchema,
});

export const scoreSchema = z.strictObject({
  playerId: z.string().min(1),
  category: categorySchema,
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type RollInput = z.infer<typeof rollSchema>;
export type ScoreInput = z.infer<typeof scoreSchema>;

export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
export type ParticipantRole = 'HOST' | 'PLAYER' | 'OBSERVER';

// Public shape of a participant — never add identity/user secrets here.
export type ParticipantView = {
  id: string;
  name: string;
  role: ParticipantRole;
  turnOrder: number;
  scoreCard: ScoreCard;
};

// Public shape of a game returned by every game endpoint.
export type GameView = {
  id: string;
  status: GameStatus;
  revision: number;
  currentPlayerId: string | null;
  currentDice: DiceRoll | null;
  participants: ParticipantView[];
};
