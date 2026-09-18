import { describe, it, expect } from 'vitest'
import {
    isCategoryFree,
    isLowerSectionUnlocked,
    isRollScoringInCategory,
    isForcedZero,
    canWriteChance,
    isLowerSectionCategory
} from './validation.js'
import type { ScoreCard } from './types.js'

function createEmptyScoreCard(overrides: Partial<ScoreCard> = {}): ScoreCard {
    return {
        one: null, two: null, three: null, four: null, five: null, six: null,
        pair: null, twoPairs: null, threeOfKind: null, fourOfKind: null,
        full: null, smallStraight: null, largeStraight: null, general: null, chance: null,
        ...overrides,
    }
}

describe('isCategoryFree', () => {
    it('should return false when the category is occupied', () => {
        expect(isCategoryFree(createEmptyScoreCard({'one': 3}), 'one')).toBe(false)
    })

    it('should return true when the category is free', () => {
        expect(isCategoryFree(createEmptyScoreCard(), 'one')).toBe(true)
    })

    it('should return false when the category is occupied with a zero score', () => {
        expect(isCategoryFree(createEmptyScoreCard({'one': 0}), 'one')).toBe(false)
    })
})

describe('isLowerSectionUnlocked', () => {
    it('should return false when the lower section is locked', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3}))).toBe(false)
    })

    it('should return true when the lower section is unlocked', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16}))).toBe(true)
    })
})

describe('isRollScoringInCategory', () => {
    it('should return false when the category scores no points', () => {
        expect(isRollScoringInCategory([1, 2, 3, 4, 5], 'one')).toBe(false)
    })

    it('should return true when the category scores points', () => {
        expect(isRollScoringInCategory([1, 1, 3, 1, 5], 'one')).toBe(true)
    })

    it('should return true for a scoring lower section category', () => {
        expect(isRollScoringInCategory([4, 4, 4, 2, 5], 'threeOfKind')).toBe(true)
    })
})

describe('isForcedZero', () => {
    it('should return true when no category can be scored', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16, 'smallStraight': 25, 'largeStraight': 40}))).toBe(true)
    })

    it('should return false when at least one category can be scored', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16, 'smallStraight': 25}))).toBe(false)
    })

    it('should return true when no category can be scored', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'four': 16, 'smallStraight': 25}))).toBe(true)
    })

    it('should return true even when only chance is free and would score points', () => {
        expect(isForcedZero([3, 3, 3, 3, 3], createEmptyScoreCard({
            one: 3, two: 6, three: 9, four: 16, five: 15, six: 18,
            pair: 0, twoPairs: 0, threeOfKind: 0, fourOfKind: 0,
            full: 0, smallStraight: 0, largeStraight: 0, general: 0,
        }))).toBe(true)
    })
})

describe('canWriteChance', () => {
    it('should return false when chance cannot be written', () => {
        expect(canWriteChance(createEmptyScoreCard({'chance': 24}))).toBe(false)
    })

    it('should return true when chance can be written', () => {
        expect(canWriteChance(createEmptyScoreCard())).toBe(true)
    })
})

describe('isLowerSectionCategory', () => {
    it('should return false for an upper section category (one)', () => {
        expect(isLowerSectionCategory('one')).toBe(false)
    })

    it('should return false for an upper section category (six)', () => {
        expect(isLowerSectionCategory('six')).toBe(false)
    })

    it('should return true for a lower section category (pair)', () => {
        expect(isLowerSectionCategory('pair')).toBe(true)
    })

    it('should return true for a lower section category (full)', () => {
        expect(isLowerSectionCategory('full')).toBe(true)
    })

    it('should return false for chance (exception to the lower section)', () => {
        expect(isLowerSectionCategory('chance')).toBe(false)
    })
})
