import { z } from 'zod';
import { CATEGORIES } from '@dice-app/game-core';
import type { Category, DiceRoll, ScoreCard } from '@dice-app/game-core';

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

// GET /games/:id/events?after=<revision> — only events newer than the revision the client already has.
export const gameEventsQuerySchema = z.strictObject({
  after: z.coerce.number().int().min(0).optional(),
});

export type GameEventsQuery = z.infer<typeof gameEventsQuerySchema>;

export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
export type ParticipantRole = 'HOST' | 'PLAYER' | 'OBSERVER';

// Public shape of a participant — never add identity/user secrets here.
export type ParticipantView = {
  id: string;
  name: string;
  role: ParticipantRole;
  turnOrder: number;
  scoreCard: ScoreCard;
  // Set only once the game is COMPLETED; null before that, so the total stays hidden during play.
  finalScore: number | null;
  upperBonus: number | null;
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

// Public shape of a game-log entry. Only the events worth showing are exposed:
// the game start, the five dice entered for a turn, and the category a player scored.
type GameEventBase = {
  revision: number;
  createdAt: string;
};

export type GameEventView =
  | (GameEventBase & { type: 'gameStarted' })
  | (GameEventBase & { type: 'diceConfirmed'; playerId: string; dice: DiceRoll })
  | (GameEventBase & {
      type: 'categorySaved';
      playerId: string;
      category: Category;
      // points as computed by the server; null for events logged before points were recorded
      points: number | null;
    });
