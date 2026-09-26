import type { DiceRoll, GameView, ScoreCard } from '@dice-app/contracts';
import type { Prisma } from '../../generated/prisma/client';

export const gameInclude = {
  participants: {
    orderBy: { turnOrder: 'asc' },
  },
} satisfies Prisma.GameInclude;

export type GameWithParticipants = Prisma.GameGetPayload<{
  include: typeof gameInclude;
}>;

// The only place that decides which game fields leave the server.
export function toGameView(game: GameWithParticipants): GameView {
  return {
    id: game.id,
    status: game.status,
    revision: game.revision,
    currentPlayerId: game.currentPlayerId,
    currentDice: game.currentDice as DiceRoll | null,
    participants: game.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: participant.role,
      turnOrder: participant.turnOrder,
      scoreCard: participant.scoreCard as ScoreCard,
      // the total stays hidden until the last round is scored
      finalScore: game.status === 'COMPLETED' ? participant.finalScore : null,
      upperBonus: game.status === 'COMPLETED' ? participant.upperBonus : null,
    })),
    createdAt: game.createdAt.toISOString(),
  };
}
