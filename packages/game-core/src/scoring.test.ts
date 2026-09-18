import { describe, it, expect } from 'vitest'
import {
    countPair,
    countTopSection,
    countTwoPairs,
    countThreeOfKind,
    countFourOfKind,
    countFull,
    countSmallStraight,
    countLargeStraight,
    countGeneral,
    countChance,
    dispatchPoints,
    countFrequencies,
    countEveryDice
} from './scoring.js'

describe('countFrequencies', () => {
    it('should count occurrences of each number', () => {
        expect(countFrequencies([1, 4, 1, 3, 5])).toStrictEqual({ '1': 2, '3': 1, '4': 1, '5': 1 })
    })
})

describe('countEveryDice', () => {
    it('should return the sum of all dice', () => {
        expect(countEveryDice([1, 4, 5, 3, 5])).toBe(18)
    })
})

describe('countPair', () => {
    it('should return the pair value when there is one pair', () => {
        expect(countPair([1, 4, 1, 3, 5])).toBe(2)
    })

    it('should return 0 when there is no pair', () => {
        expect(countPair([1, 4, 6, 3, 5])).toBe(0)
    })

    it('should choose the higher pair when there are two pairs', () => {
        expect(countPair([4, 4, 6, 3, 6])).toBe(12)
    })

    it('should count a three of a kind or four of a kind as a pair', () => {
        expect(countPair([1, 4, 4, 4, 4])).toBe(8)
    })
})

describe('countTopSection', () => {
    it('should count the score when exactly the threshold is reached', () => {
        expect(countTopSection(6, [6, 6, 6, 3, 1])).toBe(18)
    })

    it('should count all matching dice when there are more than the threshold', () => {
        expect(countTopSection(6, [6, 6, 6, 6, 6])).toBe(30)
    })

    it('should return 0 when the number of matching dice is below the threshold', () => {
        expect(countTopSection(6, [6, 6, 3, 3, 1])).toBe(0)
    })
})

describe('countTwoPairs', () => {
    it('should count two different pairs', () => {
        expect(countTwoPairs([2, 2, 4, 4, 6])).toBe(12)
    })

    it('should return 0 when there is only one qualifying value', () => {
        expect(countTwoPairs([3, 3, 3, 5, 6])).toBe(0)
    })

    it('should count a three of a kind and a pair as two pairs', () => {
        expect(countTwoPairs([2, 2, 2, 4, 4])).toBe(12)
    })

    it('should return 0 when there is no pair', () => {
        expect(countTwoPairs([1, 2, 3, 4, 5])).toBe(0)
    })

    it('should count four of a kind as two pairs', () => {
        expect(countTwoPairs([1, 1, 1, 1, 5])).toBe(4)
    })
})

describe('countThreeOfKind', () => {
    it('should sum all dice when there is a three of a kind', () => {
        expect(countThreeOfKind([3, 3, 3, 5, 6])).toBe(20)
    })

    it('should sum all dice when there is a four of a kind', () => {
        expect(countThreeOfKind([3, 3, 3, 3, 6])).toBe(18)
    })

    it('should return 0 when there is no three of a kind', () => {
        expect(countThreeOfKind([1, 2, 3, 4, 5])).toBe(0)
    })
})

describe('countFourOfKind', () => {
    it('should sum all dice when there is a four of a kind', () => {
        expect(countFourOfKind([3, 3, 3, 3, 6])).toBe(18)
    })

    it('should sum all dice when there is a general', () => {
        expect(countFourOfKind([6, 6, 6, 6, 6])).toBe(30)
    })

    it('should return 0 when there is no four of a kind', () => {
        expect(countFourOfKind([3, 3, 3, 5, 6])).toBe(0)
    })
})

describe('countFull', () => {
    it('should return 25 for a classic full house', () => {
        expect(countFull([2, 2, 5, 5, 5])).toBe(25)
    })

    it('should return 25 for a general', () => {
        expect(countFull([6, 6, 6, 6, 6])).toBe(25)
    })

    it('should return 0 for four of a kind with an extra die', () => {
        expect(countFull([6, 6, 6, 6, 3])).toBe(0)
    })
})

describe('countSmallStraight', () => {
    it('should return 25 for a 1-2-3-4 straight', () => {
        expect(countSmallStraight([1, 2, 3, 4, 6])).toBe(25)
    })

    it('should return 25 for a 2-3-4-5 straight', () => {
        expect(countSmallStraight([2, 3, 4, 5, 1])).toBe(25)
    })

    it('should return 25 for a 3-4-5-6 straight', () => {
        expect(countSmallStraight([3, 4, 5, 6, 1])).toBe(25)
    })

    it('should return 0 when there are no four consecutive values', () => {
        expect(countSmallStraight([1, 1, 4, 4, 6])).toBe(0)
    })
})

describe('countLargeStraight', () => {
    it('should return 40 for a 1-2-3-4-5 straight', () => {
        expect(countLargeStraight([1, 2, 3, 4, 5])).toBe(40)
    })

    it('should return 40 for a 2-3-4-5-6 straight', () => {
        expect(countLargeStraight([2, 3, 4, 5, 6])).toBe(40)
    })

    it('should return 0 when one value is missing from the straight', () => {
        expect(countLargeStraight([1, 2, 3, 4, 4])).toBe(0)
    })
})

describe('countGeneral', () => {
    it('should return 50 for five identical dice', () => {
        expect(countGeneral([6, 6, 6, 6, 6])).toBe(50)
    })

    it('should return 0 for four identical dice', () => {
        expect(countGeneral([6, 6, 6, 6, 3])).toBe(0)
    })
})

describe('countChance', () => {
    it('should always sum all dice regardless of their arrangement', () => {
        expect(countChance([1, 2, 3, 4, 5])).toBe(15)
    })
})

describe('dispatchPoints', () => {
    it('should dispatch "one" to countTopSection(1, ...)', () => {
        expect(dispatchPoints('one', [1, 1, 1, 6, 3])).toBe(3)
    })

    it('should dispatch "two" to countTopSection(2, ...)', () => {
        expect(dispatchPoints('two', [2, 2, 2, 6, 3])).toBe(6)
    })

    it('should dispatch "three" to countTopSection(3, ...)', () => {
        expect(dispatchPoints('three', [3, 3, 3, 6, 2])).toBe(9)
    })

    it('should dispatch "four" to countTopSection(4, ...)', () => {
        expect(dispatchPoints('four', [4, 4, 4, 6, 3])).toBe(12)
    })

    it('should dispatch "five" to countTopSection(5, ...)', () => {
        expect(dispatchPoints('five', [5, 5, 5, 5, 3])).toBe(20)
    })

    it('should dispatch "six" to countTopSection(6, ...)', () => {
        expect(dispatchPoints('six', [6, 6, 6, 6, 3])).toBe(24)
    })

    it('should dispatch "pair" to countPair', () => {
        expect(dispatchPoints('pair', [6, 6, 3, 4, 1])).toBe(12)
    })

    it('should dispatch "twoPairs" to countTwoPairs', () => {
        expect(dispatchPoints('twoPairs', [2, 2, 4, 4, 6])).toBe(12)
    })

    it('should count four of a kind as two pairs', () => {
        expect(dispatchPoints('twoPairs', [1, 1, 1, 1, 5])).toBe(4);
    });

    it('should dispatch "threeOfKind" to countThreeOfKind', () => {
        expect(dispatchPoints('threeOfKind', [3, 3, 3, 5, 6])).toBe(20)
    })

    it('should dispatch "fourOfKind" to countFourOfKind', () => {
        expect(dispatchPoints('fourOfKind', [3, 3, 3, 3, 6])).toBe(18)
    })

    it('should dispatch "full" to countFull', () => {
        expect(dispatchPoints('full', [2, 2, 5, 5, 5])).toBe(25)
    })

    it('should dispatch "smallStraight" to countSmallStraight', () => {
        expect(dispatchPoints('smallStraight', [1, 2, 3, 4, 6])).toBe(25)
    })

    it('should dispatch "largeStraight" to countLargeStraight', () => {
        expect(dispatchPoints('largeStraight', [1, 2, 3, 4, 5])).toBe(40)
    })

    it('should dispatch "general" to countGeneral', () => {
        expect(dispatchPoints('general', [6, 6, 6, 6, 6])).toBe(50)
    })

    it('should dispatch "chance" to countChance', () => {
        expect(dispatchPoints('chance', [1, 2, 3, 4, 5])).toBe(15)
    })
})
