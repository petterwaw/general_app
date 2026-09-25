import type { ScoreCard } from './types.js'
import { UPPER_CATEGORIES } from './validation.js'

export const UPPER_BONUS_THRESHOLD = 63
export const UPPER_BONUS_VALUE = 35

// Empty categories count as 0, so these work mid-game as well as on a full card.
export function upperSectionSum(scoreCard: ScoreCard): number {
    return UPPER_CATEGORIES.reduce((sum, category) => sum + (scoreCard[category] ?? 0), 0)
}

export function upperBonus(scoreCard: ScoreCard): number {
    return upperSectionSum(scoreCard) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0
}

export function totalScore(scoreCard: ScoreCard): number {
    const categoriesSum = Object.values(scoreCard).reduce<number>((sum, value) => sum + (value ?? 0), 0)

    return categoriesSum + upperBonus(scoreCard)
}
