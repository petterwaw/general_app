import type { Category, DiceRoll, GameEventView } from '@dice-app/contracts';
import type { EventLog } from '../../generated/prisma/client';

// Event types stored in EventLog that the game log exposes. Everything else (e.g. playerJoined)
// stays internal.
export const PUBLIC_EVENT_TYPES = [
  'gameStarted',
  'diceConfirmation',
  'saveCategory',
] as const;

type StoredPayload = {
  playerId?: string;
  roll?: DiceRoll;
  category?: Category;
  points?: number;
};

// The only place that decides which event fields leave the server.
export function toGameEventView(event: EventLog): GameEventView {
  const base = {
    revision: event.revisionAfter,
    createdAt: event.createdAt.toISOString(),
  };
  const payload = event.payload as StoredPayload;

  switch (event.actionType) {
    case 'gameStarted':
      return { ...base, type: 'gameStarted' };

    case 'diceConfirmation':
      return {
        ...base,
        type: 'diceConfirmed',
        playerId: payload.playerId!,
        dice: payload.roll!,
      };

    case 'saveCategory':
      return {
        ...base,
        type: 'categorySaved',
        playerId: payload.playerId!,
        category: payload.category!,
        points: payload.points ?? null,
      };

    default:
      throw new Error(`Event type ${event.actionType} is not public`);
  }
}
