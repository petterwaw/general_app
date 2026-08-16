import type { Category, DiceRoll, ScoreCard } from './types'
import { dispatchPoints } from './scoring'

type Section = 'upper' | 'lower' | 'chance'

const CATEGORY_SECTION: Record<Category, Section> = {
    one: 'upper', two: 'upper', three: 'upper', four: 'upper', five: 'upper', six: 'upper',
    pair: 'lower', twoPairs: 'lower', threeOfKind: 'lower', fourOfKind: 'lower',
    full: 'lower', smallStraight: 'lower', largeStraight: 'lower', general: 'lower',
    chance: 'chance',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_SECTION) as Category[]
const UPPER_CATEGORIES = ALL_CATEGORIES.filter((category) => CATEGORY_SECTION[category] === 'upper')
const LOWER_CATEGORIES = ALL_CATEGORIES.filter((category) => CATEGORY_SECTION[category] === 'lower')
const CHANCE: Category = 'chance'

export function isCategoryFree(scoreCard: ScoreCard, category: Category): boolean {
    if (scoreCard[category] === null) return true
    return false
}

export function isLowerSectionUnlocked(scoreCard: ScoreCard): boolean {
    const count = UPPER_CATEGORIES
        .filter((category) => !isCategoryFree(scoreCard, category))
        .length

    return count >= 3
}

export function isRollScoringInCategory(dice: DiceRoll, category: Category): boolean { 
    if (dispatchPoints(category, dice) > 0) return true
    return false
}

export function isForcedZero(dice: DiceRoll, scoreCard: ScoreCard): boolean {
    const categoriesToCheck = isLowerSectionUnlocked(scoreCard) ? [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] : UPPER_CATEGORIES

    const hasScoringOption = categoriesToCheck
        .filter((category) => isCategoryFree(scoreCard, category))
        .some((category) => isRollScoringInCategory(dice, category))

    return !hasScoringOption
}

export function canWriteChance(scoreCard: ScoreCard): boolean {
    return isCategoryFree(scoreCard, CHANCE)
}

export function isLowerSectionCategory(category: Category): boolean {
    return LOWER_CATEGORIES.includes(category)
}