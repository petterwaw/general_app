import { z } from 'zod';
import { CATEGORIES } from '@dice-app/game-core';
import type { Category, DiceRoll, DiceSource, ScoreCard } from '@dice-app/game-core';

export const MAX_PLAYERS = 8;
export const MAX_ONLINE_PLAYERS = 5;
export const PLAYER_NAME_MAX_LENGTH = 50;
export const INVITE_CODE_LENGTH = 6;
// Digits and uppercase letters without the look-alike pairs 0/O and 1/I.
export const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

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

// Every category present: a number once scored, null while still free.
export const scoreCardSchema = z.record(
  categorySchema,
  z.number().int().min(0).nullable(),
) satisfies z.ZodType<ScoreCard>;

// The client picks the mode; the server derives the dice source from it (DECYZJE.md §1).
export const createGameSchema = z.discriminatedUnion('mode', [
  // the host types in everyone at the table
  z.strictObject({
    mode: z.literal('LOCAL'),
    players: z.array(playerNameSchema).min(1).max(MAX_PLAYERS),
  }),
  // the creator joins as the first player; the others join from their own devices
  z.strictObject({
    mode: z.literal('ONLINE'),
    name: playerNameSchema,
  }),
]);

export const joinGameSchema = z.strictObject({
  name: playerNameSchema,
});

export const rollSchema = z.strictObject({
  playerId: z.string().min(1),
  dice: diceRollSchema,
});

// Virtual dice: the player is known from the device, so only the positions to keep are sent.
export const rerollSchema = z.strictObject({
  held: z
    .array(z.number().int().min(0).max(4))
    .max(5)
    .refine((held) => new Set(held).size === held.length, 'Held positions must be distinct'),
});

// playerId names the player the host scores for in a local game; an online player is known from
// the device and sends only the category.
export const scoreSchema = z.strictObject({
  playerId: z.string().min(1).optional(),
  category: categorySchema,
});

export const subscribeSchema = z.strictObject({
  gameId: z.string().min(1),
  revision: z.number().int().min(0)
})

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`));

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type RollInput = z.infer<typeof rollSchema>;
export type RerollInput = z.infer<typeof rerollSchema>;
export type ScoreInput = z.infer<typeof scoreSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>

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
  // left an online game in progress: their turns are skipped and their column is dimmed
  left: boolean;
  // Set only once the game is COMPLETED; null before that, so the total stays hidden during play.
  finalScore: number | null;
  upperBonus: number | null;
};

// Public shape of a game returned by every game endpoint.
export type GameView = {
  id: string;
  status: GameStatus;
  revision: number;
  // PHYSICAL for local games, VIRTUAL for online ones
  diceSource: DiceSource;
  currentPlayerId: string | null;
  currentDice: DiceRoll | null;
  // Virtual dice only: rolls made this turn (1–3; null outside a turn and for physical dice) and
  // the positions that stayed on the table in the last roll, so viewers animate only the rest.
  rollNumber: number | null;
  heldInLastRoll: number[];
  participants: ParticipantView[];
  // ISO timestamp
  createdAt: string;
  // whether the device asking is this game's host (its host cookie); everyone else only watches.
  // Worked out per request from the cookie and never stored.
  isHost: boolean;
  myParticipantId: string | null
  inviteCode: string | null
};

// Public shape of a game-log entry. Only the events worth showing are exposed: the game start,
// the five dice entered or rolled for a turn, the category a player scored and a player leaving.
type GameEventBase = {
  revision: number;
  createdAt: string;
};

export type GameEventView =
  | (GameEventBase & { type: 'gameStarted' })
  | (GameEventBase & { type: 'diceConfirmed'; playerId: string; dice: DiceRoll })
  // virtual dice: the dice after the roll and the positions that stayed on the table
  | (GameEventBase & { type: 'diceRolled'; playerId: string; dice: DiceRoll; held: number[] })
  | (GameEventBase & {
      type: 'categorySaved';
      playerId: string;
      category: Category;
      // points as computed by the server; null for events logged before points were recorded
      points: number | null;
    })
  | (GameEventBase & { type: 'playerLeft'; playerId: string });
