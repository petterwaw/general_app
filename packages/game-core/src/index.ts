export type { Category, DieFace, DiceRoll, DiceSource, ScoreCard, TurnState } from './types.js';
export { CATEGORIES } from './types.js';

export type { Player, GameState, Action } from './reducer.js';

export { GameRuleError } from './errors.js';

export {
  createEmptyScoreCard,
  createInitialState,
  isPlayerTurn,
  nextPlayerId,
  isGameOver,
  reducer,
} from './reducer.js';

export { dispatchPoints } from './scoring.js';

export {
  isCategoryFree,
  isLowerSectionUnlocked,
  isLowerSectionCategory,
  canRoll,
} from './validation.js';

export {
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  upperSectionSum,
  upperBonus,
  totalScore,
} from './totals.js';