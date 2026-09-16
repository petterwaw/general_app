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
    it('zwraca ilosc wystapień danej liczby', () => {
        expect(countFrequencies([1, 4, 1, 3, 5])).toStrictEqual({'1': 2, '3': 1, '4': 1, '5': 1})
    })
})

describe('countEveryDice', () => {
    it('zwraca sume wszystkich kosci', () => {
        expect(countEveryDice([1, 4, 5, 3, 5])).toBe(18)
    })
})

describe('countPair', () => {
    it('zwraca wartość pary, gdy jest jedna para', () => {
        expect(countPair([1, 4, 1, 3, 5])).toBe(2)
    })

    it('zwraca 0, gdy nie ma żadnej pary', () => {
        expect(countPair([1, 4, 6, 3, 5])).toBe(0)
    })

    it('przy dwóch parach wybiera wyższą', () => {
        expect(countPair([4, 4, 6, 3, 6])).toBe(12)
    })

    it('liczy trójkę/karetę jako parę, jeśli nie ma pasującej kategorii', () => {
        expect(countPair([1, 4, 4, 4, 4])).toBe(8)
    })
})

describe('countTopSection', () => {
    it('liczy, gdy jest dokładnie próg (3 sztuki)', () => {
        expect(countTopSection(6, [6, 6, 6, 3, 1])).toBe(18)
    })

    it('liczy wszystkie sztuki, gdy jest ich więcej niż próg (5 sztuk)', () => {
        expect(countTopSection(6, [6, 6, 6, 6, 6])).toBe(30)
    })

    it('zwraca 0, gdy jest poniżej progu (2 sztuki)', () => {
        expect(countTopSection(6, [6, 6, 3, 3, 1])).toBe(0)
    })
})

describe('countTwoPairs', () => {
    it('liczy dwie różne pary', () => {
        expect(countTwoPairs([2, 2, 4, 4, 6])).toBe(12)
    })

    it('zwraca 0, gdy jest tylko jedna kwalifikująca się wartość (regresja NaN)', () => {
        // dawniej rzut z samą trójką/karetą/generałem wywalał NaN
        expect(countTwoPairs([3, 3, 3, 5, 6])).toBe(0)
    })

    it('liczy trójkę + parę (full) jako dwie pary', () => {
        expect(countTwoPairs([2, 2, 2, 4, 4])).toBe(12)
    })

    it('zwraca 0, gdy nie ma żadnej pary', () => {
        expect(countTwoPairs([1, 2, 3, 4, 5])).toBe(0)
    })
})

describe('countThreeOfKind', () => {
    it('sumuje wszystkie kości, gdy jest trójka', () => {
        expect(countThreeOfKind([3, 3, 3, 5, 6])).toBe(20)
    })

    it('sumuje wszystkie kości, gdy jest kareta (spełnia próg trójki)', () => {
        expect(countThreeOfKind([3, 3, 3, 3, 6])).toBe(18)
    })

    it('zwraca 0, gdy nie ma trójki', () => {
        expect(countThreeOfKind([1, 2, 3, 4, 5])).toBe(0)
    })
})

describe('countFourOfKind', () => {
    it('sumuje wszystkie kości, gdy jest kareta', () => {
        expect(countFourOfKind([3, 3, 3, 3, 6])).toBe(18)
    })

    it('sumuje wszystkie kości, gdy jest generał (spełnia próg karety)', () => {
        expect(countFourOfKind([6, 6, 6, 6, 6])).toBe(30)
    })

    it('zwraca 0, gdy nie ma karety', () => {
        expect(countFourOfKind([3, 3, 3, 5, 6])).toBe(0)
    })
})

describe('countFull', () => {
    it('liczy 25 przy klasycznym fullu (trójka + para z różnych wartości)', () => {
        expect(countFull([2, 2, 5, 5, 5])).toBe(25)
    })

    it('liczy 25 przy generale (5 jednakowych)', () => {
        expect(countFull([6, 6, 6, 6, 6])).toBe(25)
    })

    it('zwraca 0 przy karecie + dokładce (to nie jest full)', () => {
        expect(countFull([6, 6, 6, 6, 3])).toBe(0)
    })
})

describe('countSmallStraight', () => {
    it('liczy 25 dla ciągu 1-2-3-4', () => {
        expect(countSmallStraight([1, 2, 3, 4, 6])).toBe(25)
    })

    it('liczy 25 dla ciągu 2-3-4-5', () => {
        expect(countSmallStraight([2, 3, 4, 5, 1])).toBe(25)
    })

    it('liczy 25 dla ciągu 3-4-5-6', () => {
        expect(countSmallStraight([3, 4, 5, 6, 1])).toBe(25)
    })

    it('zwraca 0 dla rzutu bez czterech kolejnych wartości (regresja fałszywego trafienia)', () => {
        // dawniej [1,1,4,4,6] błędnie liczyło się jako strit przez sumę
        expect(countSmallStraight([1, 1, 4, 4, 6])).toBe(0)
    })
})

describe('countLargeStraight', () => {
    it('liczy 40 dla ciągu 1-2-3-4-5', () => {
        expect(countLargeStraight([1, 2, 3, 4, 5])).toBe(40)
    })

    it('liczy 40 dla ciągu 2-3-4-5-6', () => {
        expect(countLargeStraight([2, 3, 4, 5, 6])).toBe(40)
    })

    it('zwraca 0, gdy brakuje jednej wartości do pełnego ciągu', () => {
        expect(countLargeStraight([1, 2, 3, 4, 4])).toBe(0)
    })
})

describe('countGeneral', () => {
    it('liczy 50 przy pięciu jednakowych', () => {
        expect(countGeneral([6, 6, 6, 6, 6])).toBe(50)
    })

    it('zwraca 0 przy karecie (4 sztuki to za mało)', () => {
        expect(countGeneral([6, 6, 6, 6, 3])).toBe(0)
    })
})

describe('countChance', () => {
    it('zawsze sumuje wszystkie kości, niezależnie od układu', () => {
        expect(countChance([1, 2, 3, 4, 5])).toBe(15)
    })
})

describe('dispatchPoints', () => {
    it('kieruje "one" do countTopSection(1, ...)', () => {
        expect(dispatchPoints('one', [1, 1, 1, 6, 3])).toBe(3)
    })

    it('kieruje "two" do countTopSection(2, ...)', () => {
        expect(dispatchPoints('two', [2, 2, 2, 6, 3])).toBe(6)
    })

    it('kieruje "three" do countTopSection(3, ...)', () => {
        expect(dispatchPoints('three', [3, 3, 3, 6, 2])).toBe(9)
    })

    it('kieruje "four" do countTopSection(4, ...)', () => {
        expect(dispatchPoints('four', [4, 4, 4, 6, 3])).toBe(12)
    })

    it('kieruje "five" do countTopSection(5, ...)', () => {
        expect(dispatchPoints('five', [5, 5, 5, 5, 3])).toBe(20)
    })

    it('kieruje "six" do countTopSection(6, ...)', () => {
        expect(dispatchPoints('six', [6, 6, 6, 6, 3])).toBe(24)
    })

    it('kieruje "pair" do countPair', () => {
        expect(dispatchPoints('pair', [6, 6, 3, 4, 1])).toBe(12)
    })

    it('kieruje "twoPairs" do countTwoPairs', () => {
        expect(dispatchPoints('twoPairs', [2, 2, 4, 4, 6])).toBe(12)
    })

    it('kieruje "threeOfKind" do countThreeOfKind', () => {
        expect(dispatchPoints('threeOfKind', [3, 3, 3, 5, 6])).toBe(20)
    })

    it('kieruje "fourOfKind" do countFourOfKind', () => {
        expect(dispatchPoints('fourOfKind', [3, 3, 3, 3, 6])).toBe(18)
    })

    it('kieruje "full" do countFull', () => {
        expect(dispatchPoints('full', [2, 2, 5, 5, 5])).toBe(25)
    })

    it('kieruje "smallStraight" do countSmallStraight', () => {
        expect(dispatchPoints('smallStraight', [1, 2, 3, 4, 6])).toBe(25)
    })

    it('kieruje "largeStraight" do countLargeStraight', () => {
        expect(dispatchPoints('largeStraight', [1, 2, 3, 4, 5])).toBe(40)
    })

    it('kieruje "general" do countGeneral', () => {
        expect(dispatchPoints('general', [6, 6, 6, 6, 6])).toBe(50)
    })

    it('kieruje "chance" do countChance', () => {
        expect(dispatchPoints('chance', [1, 2, 3, 4, 5])).toBe(15)
    })
})
