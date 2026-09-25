export type { Category, DieFace, DiceRoll, ScoreCard } from './types.js';
export { CATEGORIES } from './types.js';

export type { Player, GameState, Action } from './reducer.js';

export {
  createEmptyScoreCard,
  createInitialState,
  isPlayerTurn,
  nextPlayerId,
  isGameOver,
  reducer,
} from './reducer.js';

// Exposed so the UI can show score suggestions; the server still recomputes every score.
export { dispatchPoints } from './scoring.js';

export {
  isCategoryFree,
  isLowerSectionUnlocked,
  isLowerSectionCategory,
  isForcedZero,
} from './validation.js';

export {
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  upperSectionSum,
  upperBonus,
  totalScore,
} from './totals.js';