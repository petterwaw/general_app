export const CATEGORIES = [
    'one', 'two', 'three', 'four', 'five', 'six',
    'pair', 'twoPairs', 'threeOfKind', 'fourOfKind', 'full', 'smallStraight', 'largeStraight',
    'general', 'chance',
] as const

export type Category = (typeof CATEGORIES)[number]
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6
export type DiceRoll = [DieFace, DieFace, DieFace, DieFace, DieFace]

type ScoreCardElement = number | null

export type ScoreCard = Record<Category, ScoreCardElement>

export type DiceSource = 'PHYSICAL' | 'VIRTUAL'

// rollNumber 0: the turn has started but its first roll is not applied yet. The server rolls
// in the same transaction that starts the turn, so this state is never persisted.
export type TurnState =
    | { rollNumber: 0 }
    | { rollNumber: 1 | 2 | 3, dice: DiceRoll, heldInLastRoll: number[] }
