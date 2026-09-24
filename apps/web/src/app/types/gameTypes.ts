import type { DieFace } from '@dice-app/contracts';

// Dice entered by the host before all five values are known — frontend-only draft state.
export type LocalRoll = [
  DieFace | null,
  DieFace | null,
  DieFace | null,
  DieFace | null,
  DieFace | null,
];
