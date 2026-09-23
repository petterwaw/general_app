import type {
  Category,
  DiceRoll,
  DieFace,
  ScoreCard,
} from '@dice-app/game-core';

export type {
  Category,
  DiceRoll,
  DieFace,
  ScoreCard,
} from '@dice-app/game-core';

export type Participant = {
  id: string;
  name: string;
  scoreCard: ScoreCard;
  turnOrder: number;
  role: 'HOST' | 'PLAYER';
};

export type Game = {
  id: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
  revision: number;
  lastActivity: string;
  createdAt: string;
  currentPlayerId: string | null;
  currentDice: DiceRoll | null;
  participants: Participant[];
};

export type LocalRoll = [
  DieFace | null,
  DieFace | null,
  DieFace | null,
  DieFace | null,
  DieFace | null,
];
