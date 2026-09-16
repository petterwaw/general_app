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
    it('zwraca false gdy kategoria jest zajeta', () => {
        expect(isCategoryFree(createEmptyScoreCard({'one': 3}), 'one')).toBe(false)
    })

    it('zwraca true gdy kategoria jest wolna', () => {
        expect(isCategoryFree(createEmptyScoreCard(), 'one')).toBe(true)
    })

    it('zwraca false gdy kategoria jest zajeta wynikiem zero', () => {
        expect(isCategoryFree(createEmptyScoreCard({'one': 0}), 'one')).toBe(false)
    })
})

describe('isLowerSectionUnlocked', () => {
    it('zwraca false gdy sekcja dolna jest nieodblokowana', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3}))).toBe(false)
    })

    it('zwraca true gdy sekcja dolna jest odblokowana', () => {
        expect(isLowerSectionUnlocked(createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16}))).toBe(true)
    })
})

describe('isRollScoringInCategory', () => {
    it('zwraca false gdy kategoria nie zdobywa punktow', () => {
        expect(isRollScoringInCategory([1, 2, 3, 4, 5], 'one')).toBe(false)
    })

    it('zwraca true gdy kategoria zdobywa punkty', () => {
        expect(isRollScoringInCategory([1, 1, 3, 1, 5], 'one')).toBe(true)
    })

    it('zwraca true dla kategorii z dolnej sekcji, ktora zdobywa punkty', () => {
        expect(isRollScoringInCategory([4, 4, 4, 2, 5], 'threeOfKind')).toBe(true)
    })
})

describe('isForcedZero', () => {
    it('zwraca true gdy zadna kategoria nie mozliwa do wpisania', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16, 'smallStraight': 25, 'largeStraight': 40}))).toBe(true)
    })

    it('zwraca false gdy ktoras kategoria mozliwa do wpisania', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'two': 6, 'four': 16, 'smallStraight': 25}))).toBe(false)
    })

    it('zwraca true gdy zadna kategoria nie mozliwa do wpisani', () => {
        expect(isForcedZero([1, 2, 3, 4, 5], createEmptyScoreCard({'one': 3, 'four': 16, 'smallStraight': 25}))).toBe(true)
    })

    it('zwraca true nawet gdy tylko chance jest wolne i punktowaloby', () => {
        expect(isForcedZero([3, 3, 3, 3, 3], createEmptyScoreCard({
            one: 3, two: 6, three: 9, four: 16, five: 15, six: 18,
            pair: 0, twoPairs: 0, threeOfKind: 0, fourOfKind: 0,
            full: 0, smallStraight: 0, largeStraight: 0, general: 0,
        }))).toBe(true)
    })
})

describe('canWriteChance', () => {
    it('zwraca false gdy nie mozna wpisac chance', () => {
        expect(canWriteChance(createEmptyScoreCard({'chance': 24}))).toBe(false)
    })

    it('zwraca true gdy mozna wpisac chance', () => {
        expect(canWriteChance(createEmptyScoreCard())).toBe(true)
    })
})

describe('isLowerSectionCategory', () => {
    it('zwraca false dla kategorii gornej sekcji (one)', () => {
        expect(isLowerSectionCategory('one')).toBe(false)
    })

    it('zwraca false dla kategorii gornej sekcji (six)', () => {
        expect(isLowerSectionCategory('six')).toBe(false)
    })

    it('zwraca true dla kategorii dolnej sekcji (pair)', () => {
        expect(isLowerSectionCategory('pair')).toBe(true)
    })

    it('zwraca true dla kategorii dolnej sekcji (full)', () => {
        expect(isLowerSectionCategory('full')).toBe(true)
    })

    it('zwraca false dla chance (wyjatek od dolnej sekcji, na tym polega reducer)', () => {
        expect(isLowerSectionCategory('chance')).toBe(false)
    })
})
