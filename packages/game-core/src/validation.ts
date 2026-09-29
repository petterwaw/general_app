import type { Category, ScoreCard, TurnState } from './types.js'

type Section = 'upper' | 'lower' | 'chance'

const CATEGORY_SECTION: Record<Category, Section> = {
    one: 'upper', two: 'upper', three: 'upper', four: 'upper', five: 'upper', six: 'upper',
    pair: 'lower', twoPairs: 'lower', threeOfKind: 'lower', fourOfKind: 'lower',
    full: 'lower', smallStraight: 'lower', largeStraight: 'lower', general: 'lower',
    chance: 'chance',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_SECTION) as Category[]
export const UPPER_CATEGORIES = ALL_CATEGORIES.filter((category) => CATEGORY_SECTION[category] === 'upper')
const LOWER_CATEGORIES = ALL_CATEGORIES.filter((category) => CATEGORY_SECTION[category] === 'lower')
const CHANCE: Category = 'chance'

export function isCategoryFree(scoreCard: ScoreCard, category: Category): boolean {
    if (scoreCard[category] === null) return true
    return false
}

// Only upper categories with points count; a zero written there does not (docs/ZASADY-GRY.md).
export function isLowerSectionUnlocked(scoreCard: ScoreCard): boolean {
    const count = UPPER_CATEGORIES
        .filter((category) => (scoreCard[category] ?? 0) > 0)
        .length

    return count >= 3
}

export function canWriteChance(scoreCard: ScoreCard): boolean {
    return isCategoryFree(scoreCard, CHANCE)
}

export function isLowerSectionCategory(category: Category): boolean {
    return LOWER_CATEGORIES.includes(category)
}

export function canRoll(turn: TurnState): boolean {
    return turn.rollNumber < 3
}
