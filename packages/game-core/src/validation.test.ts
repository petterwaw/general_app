import { describe, it, expect } from 'vitest'
import {
    isCategoryFree,
    isLowerSectionUnlocked,
    canWriteChance,
    isLowerSectionCategory,
    canRoll
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

    it('should return false with only two upper categories filled', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3, 'two': 6}))).toBe(false)
    })

    it('should not count upper categories filled with zeros', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 0, 'two': 0, 'three': 0}))).toBe(false)
    })

    it('should need three upper categories with points, whatever zeros sit beside them', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 0, 'two': 6, 'three': 0, 'four': 12}))).toBe(false)
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 0, 'two': 6, 'three': 9, 'four': 12}))).toBe(true)
    })

    it('should not count lower section categories or chance', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3, 'two': 6, 'pair': 0, 'twoPairs': 0, 'chance': 15}))).toBe(false)
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

describe('canRoll', () => {
    it('should allow the first roll of a turn', () => {
        expect(canRoll({ rollNumber: 0 })).toBe(true)
    })

    it.each([1, 2] as const)('should allow another roll after roll %i', (rollNumber) => {
        expect(canRoll({ rollNumber, dice: [1, 2, 3, 4, 5], heldInLastRoll: [] })).toBe(true)
    })

    it('should not allow a fourth roll', () => {
        expect(canRoll({ rollNumber: 3, dice: [1, 2, 3, 4, 5], heldInLastRoll: [] })).toBe(false)
    })
})
