// isCategoryFree — czy kategoria nie ma jeszcze zapisanego wyniku
// isLowerSectionUnlocked — czy min. 3 kategorie górne mają wpisany wynik (obojętnie, realny czy zero)
// meetsTopSectionThreshold — czy w danym rzucie jest min. 3 sztuki wartości danej kategorii górnej
// isForcedZero — wśród 14 kategorii (bez 'chance') żadna dostępna (wolna, poza blokadą) nie punktuje -> zero wymuszone
// canWriteChance — czy 'chance' jest jeszcze wolne (chance omija blokadę sekcji dolnej)

// Przykłady konkretnych danych wejście/wyjście (nie implementacja, tylko ilustracja kształtu):
//
// card (ScoreCard) to obiekt z 15 kluczami (jeden na kategorię), null = wolna, liczba = zajęta:
// { one: 3, two: null, three: 9, four: null, five: null, six: null,
//   pair: null, twoPairs: null, threeOfKind: null, fourOfKind: null,
//   full: null, smallStraight: null, largeStraight: null, general: null, chance: null }
//
// isCategoryFree(card, 'two')   -> true   (bo card.two === null)
// isCategoryFree(card, 'three') -> false  (bo card.three === 9, czyli już zapisane)
//
// isLowerSectionUnlocked(card) -> false
//   (tylko 2 kategorie górne mają wpisany wynik: 'one' i 'three' — potrzeba min. 3)
//
// meetsTopSectionThreshold([6, 6, 6, 2, 3], 'six') -> true   (trzy szóstki, próg spełniony)
// meetsTopSectionThreshold([6, 6, 2, 2, 3], 'six') -> false  (tylko dwie szóstki)
//
// isForcedZero(card, [6, 6, 2, 2, 3])
//   -> zależy od isLowerSectionUnlocked(card) i meetsTopSectionThreshold dla każdej kategorii górnej
//   -> jeśli sekcja dolna zablokowana ORAZ żaden rzut nie osiąga progu w żadnej górnej -> true

import type { Category, DiceRoll, ScoreCard } from './types'
import { dispatchPoints } from './scoring'

const UPPER_CATEGORIES: Category[] = ['one', 'two', 'three', 'four', 'five', 'six']
const LOWER_CATEGORIES: Category[] = ['pair', 'twoPairs', 'threeOfKind', 'fourOfKind', 'full', 'smallStraight', 'largeStraight', 'general']
const CHANCE: Category = 'chance'
const ALL_CATEGORIES: Category[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES, CHANCE]

export function isCategoryFree(scoreCard: ScoreCard, category: Category) {
    if (scoreCard[category] === null) return true
    return false
}

export function isLowerSectionUnlocked(scoreCard: ScoreCard) {
    const count = Object.entries(scoreCard)
        .slice(0, 6)
        .filter(([key, value]) => value !== null)
        .length

    return count >= 3
}

export function isRollScoringInCategory(dice: DiceRoll, category: Category) { 
    if (dispatchPoints(category, dice) > 0) return true
    return false
}

export function isForcedZero(dice: DiceRoll, scoreCard: ScoreCard) {
    const categoriesToCheck = isLowerSectionUnlocked(scoreCard) ? [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] : UPPER_CATEGORIES

    const hasScoringOption = categoriesToCheck
        .filter((category) => isCategoryFree(scoreCard, category))
        .some((category) => isRollScoringInCategory(dice, category))

    return !hasScoringOption
}

export function canWriteChance(scoreCard: ScoreCard) {
    return isCategoryFree(scoreCard, CHANCE)
}