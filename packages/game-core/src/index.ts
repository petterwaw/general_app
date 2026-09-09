export type { Category, DieFace, DiceRoll, ScoreCard } from './types'

// scoring.ts i validation.ts nie są tu re-eksportowane — reducer wywołuje je
// wewnętrznie przy saveCategory, więc na zewnątrz pakietu są szczegółem implementacji.
export type { Player, GameState, Action } from './reducer'
export { createInitialState, isPlayerTurn, nextPlayerId, isGameOver, reducer } from './reducer'
