
import type { Category, DiceRoll } from './types'

const scorers: Record<Category, (dice: DiceRoll) => number> = {
    one: (dice) => countTopSection(1, dice),
    two: (dice) => countTopSection(2, dice),
    three: (dice) => countTopSection(3, dice),
    four: (dice) => countTopSection(4, dice),
    five: (dice) => countTopSection(5, dice),
    six: (dice) => countTopSection(6, dice),
    pair: countPair,
    twoPairs: countTwoPairs,
    threeOfKind: countThreeOfKind,
    fourOfKind: countFourOfKind,
    full: countFull,
    smallStraight: countSmallStraight,
    largeStraight: countLargeStraight,
    general: countGeneral,
    chance: countChance
};

export function dispatchPoints(category: Category, dice: DiceRoll) {
    return scorers[category](dice);
}

export function countTopSection(valueToCount: number, dice: DiceRoll) {
    let count = 0
    dice.forEach( currentDice => {
        if (currentDice === valueToCount) {
            count += valueToCount
        }   
    })
    return valueToCount * 3 <= count ? count : 0
}   

export function countFrequencies(dice: DiceRoll): Record<number, number> {
    const frequencies: Record<number, number> = {}
    dice.forEach((value) => {
        frequencies[value] = (frequencies[value] ?? 0) + 1
    });
    return frequencies
}

export function countEveryDice(dice: DiceRoll) {
    let count = 0
    dice.forEach( currentDice => count += currentDice)
    return count
}

export function countPair(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const pairValues = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] >= 2)

    if (pairValues.length === 0) {
        return 0
    }

    const highestPairValue = Math.max(...pairValues)

    return highestPairValue * 2
}

export function countTwoPairs(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const pairValues = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] >= 2)

    if (pairValues.length < 2) {
        return 0
    }

    return (pairValues[0] + pairValues[1]) * 2
}

export function countThreeOfKind(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const threeOfKind = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] >= 3)

    if (threeOfKind.length === 0) {
        return 0
    }

    return countEveryDice(dice)
}

export function countFourOfKind(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const fourOfKind = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] >= 4)

    if (fourOfKind.length === 0) {
        return 0
    }

    return countEveryDice(dice)
}

export function countFull(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const isPair = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] === 2)
        .length > 0

    const isThreeOfKind = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] === 3)
        .length > 0

    const isFiveOfKind = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] === 5)
        .length > 0

    if ((isPair && isThreeOfKind) || isFiveOfKind) return 25

    return 0
}

export function countSmallStraight(dice: DiceRoll) {
    const uniqueValues = new Set(dice)
    const possibleStraights = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
    ]

    const hasStraight = possibleStraights.some((straight) =>
        straight.every((value) => uniqueValues.has(value))
    )

    return hasStraight ? 25 : 0
}

export function countLargeStraight(dice: DiceRoll) {
    const uniqueValues = new Set(dice)
    const possibleStraights = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
    ]

    const hasStraight = possibleStraights.some((straight) =>
        straight.every((value) => uniqueValues.has(value))
    )

    return hasStraight ? 40 : 0
}

export function countGeneral(dice: DiceRoll) {
    const frequencies = countFrequencies(dice)
    const isGeneral = Object.keys(frequencies)
        .map(Number)
        .filter((value) => frequencies[value] === 5)
        .length > 0
    
    return isGeneral ? 50 : 0
}

export function countChance(dice: DiceRoll) {
    return countEveryDice(dice)
}