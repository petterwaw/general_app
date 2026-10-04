import { diceRollSchema, scoreCardSchema, type GameView } from '@dice-app/contracts';
import type { Prisma } from '../../generated/prisma/client';

export const gameInclude = {
  participants: {
    orderBy: { turnOrder: 'asc' },
  },
} satisfies Prisma.GameInclude;

export type GameWithParticipants = Prisma.GameGetPayload<{
  include: typeof gameInclude;
}>;

// The only place that decides which game fields leave the server. isHost describes the device
// asking, not the game, so the caller works it out.
export function toGameView(game: GameWithParticipants, isHost: boolean, myParticipantId: string | null): GameView {
  return {
    id: game.id,
    status: game.status,
    revision: game.revision,
    diceSource: game.diceSource,
    currentPlayerId: game.currentPlayerId,
    currentDice: diceRollSchema.nullable().parse(game.currentDice),
    rollNumber: game.rollNumber,
    heldInLastRoll: game.heldInLastRoll,
    participants: game.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: participant.role,
      turnOrder: participant.turnOrder,
      scoreCard: scoreCardSchema.parse(participant.scoreCard),
      // once the game ends every participant is inactive, so only a game in progress tells who left
      left: game.status === 'IN_PROGRESS' && !participant.active,
      // the total stays hidden until the last round is scored
      finalScore: game.status === 'COMPLETED' ? participant.finalScore : null,
      upperBonus: game.status === 'COMPLETED' ? participant.upperBonus : null,
    })),
    createdAt: game.createdAt.toISOString(),
    isHost,
    myParticipantId,
    inviteCode: game.diceSource === 'VIRTUAL' && (game.status === 'IN_PROGRESS' || game.status === 'LOBBY') ? game.inviteCode : null
  };
}

// The participant that the device creating or hosting the game plays as.
export function hostParticipantId(game: GameWithParticipants): string | null {
  return game.participants.find((participant) => participant.role === 'HOST')?.id ?? null;
}
