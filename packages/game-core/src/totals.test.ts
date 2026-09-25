import { describe, it, expect } from 'vitest'
import { upperSectionSum, upperBonus, totalScore, UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE } from './totals.js'
import type { ScoreCard } from './types.js'

function createScoreCard(overrides: Partial<ScoreCard> = {}): ScoreCard {
    return {
        one: null, two: null, three: null, four: null, five: null, six: null,
        pair: null, twoPairs: null, threeOfKind: null, fourOfKind: null,
        full: null, smallStraight: null, largeStraight: null, general: null, chance: null,
        ...overrides,
    }
}

// three of each face: 3 + 6 + 9 + 12 + 15 + 18 = 63, exactly the bonus threshold
const UPPER_AT_THRESHOLD: Partial<ScoreCard> = { one: 3, two: 6, three: 9, four: 12, five: 15, six: 18 }

describe('bonus constants', () => {
    it('should use the threshold of 63 and the value of 35 from the rules', () => {
        expect(UPPER_BONUS_THRESHOLD).toBe(63)
        expect(UPPER_BONUS_VALUE).toBe(35)
    })
})

describe('upperSectionSum', () => {
    it('should return 0 for an empty card', () => {
        expect(upperSectionSum(createScoreCard())).toBe(0)
    })

    it('should add only the upper section categories', () => {
        expect(upperSectionSum(createScoreCard({ one: 3, six: 18, pair: 12, chance: 20 }))).toBe(21)
    })

    it('should treat empty categories as 0 mid-game', () => {
        expect(upperSectionSum(createScoreCard({ four: 12, five: null }))).toBe(12)
    })
})

describe('upperBonus', () => {
    it('should award the bonus when the upper section reaches exactly 63', () => {
        expect(upperBonus(createScoreCard(UPPER_AT_THRESHOLD))).toBe(35)
    })

    it('should award the bonus above 63', () => {
        expect(upperBonus(createScoreCard({ ...UPPER_AT_THRESHOLD, six: 30 }))).toBe(35)
    })

    it('should not award the bonus at 62', () => {
        expect(upperBonus(createScoreCard({ ...UPPER_AT_THRESHOLD, one: 2 }))).toBe(0)
    })

    it('should not count lower section points towards the threshold', () => {
        expect(upperBonus(createScoreCard({ six: 18, general: 50, chance: 30 }))).toBe(0)
    })

    it('should not award the bonus when upper categories were scratched for 0', () => {
        expect(upperBonus(createScoreCard({ ...UPPER_AT_THRESHOLD, six: 0 }))).toBe(0)
    })

    it('should award the bonus as soon as it is reached, before the card is full', () => {
        expect(upperBonus(createScoreCard({ four: 20, five: 25, six: 30 }))).toBe(35)
    })
})

describe('totalScore', () => {
    it('should return 0 for an empty card', () => {
        expect(totalScore(createScoreCard())).toBe(0)
    })

    it('should add all categories without a bonus below the threshold', () => {
        const card = createScoreCard({
            one: 3, two: 0, three: 9, four: 12, five: 15, six: 18,
            pair: 12, twoPairs: 18, threeOfKind: 15, fourOfKind: 0,
            full: 25, smallStraight: 25, largeStraight: 40, general: 50, chance: 22,
        })

        expect(totalScore(card)).toBe(57 + 207)
    })

    it('should add the bonus once the upper section reaches 63', () => {
        const card = createScoreCard({
            ...UPPER_AT_THRESHOLD,
            pair: 12, twoPairs: 18, threeOfKind: 15, fourOfKind: 0,
            full: 25, smallStraight: 25, largeStraight: 40, general: 50, chance: 22,
        })

        expect(totalScore(card)).toBe(63 + 35 + 207)
    })

    it('should count scratched categories as 0', () => {
        expect(totalScore(createScoreCard({ one: 0, general: 0, chance: 17 }))).toBe(17)
    })
})
