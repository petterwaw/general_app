import { describe, it, expect } from 'vitest'
import {
    createInitialState,
    isPlayerTurn,
    nextPlayerId,
    isGameOver,
    reducer
} from './reducer.js'
import type { Action } from './reducer.js'
import type { Category, DiceRoll } from './types.js'

describe('createInitialState', () => {
    it('rzuca blad, gdy lista graczy jest pusta', () => {
        expect(() => createInitialState([])).toThrow()
    })

    it('buduje stan z pustymi kartami (wszystkie 15 kategorii = null) dla kazdego gracza', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        state.players.forEach((player) => {
            Object.values(player.card).forEach((value) => {
                expect(value).toBeNull()
            })
        })
    })

    it('ustawia currentPlayerId na id pierwszego gracza z listy', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(state.currentPlayerId).toBe('p1')
    })
})

describe('isPlayerTurn', () => {
    it('zwraca true, gdy playerId zgadza sie z currentPlayerId', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])

        expect(isPlayerTurn(state, 'p1')).toBe(true)
    })

    it('zwraca false, gdy playerId to inny gracz', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(isPlayerTurn(state, 'p2')).toBe(false)
    })
})

describe('nextPlayerId', () => {
    it('zwraca id kolejnego gracza w kolejnosci', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(nextPlayerId(state)).toBe('p2')
    })

    it('zawija sie z powrotem na poczatek listy po ostatnim graczu', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        state.currentPlayerId = 'p2'

        expect(nextPlayerId(state)).toBe('p1')
    })

    it('rzuca blad, gdy currentPlayerId nie odpowiada zadnemu graczowi w state (stan niespojny)', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.currentPlayerId = 'nieistniejacy'

        expect(() => nextPlayerId(state)).toThrow()
    })
})

describe('isGameOver', () => {
    it('zwraca false na swiezo utworzonym stanie (wszystko null)', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])

        expect(isGameOver(state)).toBe(false)
    })

    it('zwraca false, gdy tylko czesc kategorii jest wypelniona', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3

        expect(isGameOver(state)).toBe(false)
    })

    it('zwraca true, gdy wszyscy gracze maja wszystkie 15 kategorii wypelnionych', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        Object.keys(state.players[0].card).forEach((category) => {
            state.players[0].card[category as Category] = 0
        })

        expect(isGameOver(state)).toBe(true)
    })
})

describe('reducer — saveCategory (legalne ruchy)', () => {
    it('zapisuje realny wynik w wolnej kategorii gornej i przesuwa ture do kolejnego gracza', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.six).toBe(18)
        expect(newState.currentPlayerId).toBe('p2')
    })

    it('zapisuje wynik w kategorii dolnej, gdy sekcja dolna jest odblokowana', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3
        state.players[0].card.two = 6
        state.players[0].card.three = 9

        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [5, 5, 2, 3, 4] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(10)
    })

    it("pozwala zapisac 'chance' nawet gdy sekcja dolna zablokowana", () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'chance', dice: [1, 2, 3, 4, 5] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.chance).toBe(15)
    })

    it('zapisuje wymuszone zero w kategorii dolnej, gdy sekcja zablokowana i isForcedZero === true', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [1, 1, 2, 3, 4] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })
})

describe('reducer — saveCategory (nielegalne ruchy, oczekuj throw)', () => {
    it('rzuca, gdy playerId z akcji nie jest currentPlayerId (nie jego tura)', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const action: Action = { type: 'saveCategory', playerId: 'p2', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
    })

    it('rzuca, gdy kategoria jest juz zajeta', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
    })

    it('rzuca, gdy kategoria dolna zablokowana i NIE jest to sytuacja forced zero', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [6, 6, 6, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
    })

    it('rzuca, gdy playerId w ogole nie istnieje w state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players = []
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
    })

    it('rzuca, gdy typ akcji jest nieznany', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        // @ts-expect-error
        const action: Action = { type: 'somethingElse', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(/Nieznany typ akcji/)
    })
})

describe('reducer — pelna partia', () => {
    it('rozgrywa cala partie od createInitialState do isGameOver === true, w tym jedna runde forced zero', () => {
        let state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        const rolls: Record<Category, DiceRoll> = {
            one: [1, 1, 1, 2, 3],
            two: [2, 2, 2, 3, 4],
            three: [3, 3, 3, 4, 5],
            four: [4, 4, 4, 5, 6],
            five: [5, 5, 5, 6, 1],
            six: [6, 6, 6, 1, 2],

            pair: [1, 1, 2, 3, 4],
            twoPairs: [5, 5, 3, 3, 1],
            threeOfKind: [4, 4, 4, 2, 1],
            fourOfKind: [4, 4, 4, 4, 2],
            full: [3, 3, 3, 2, 2],
            smallStraight: [1, 2, 3, 4, 6],
            largeStraight: [2, 3, 4, 5, 6],
            general: [6, 6, 6, 6, 6],
            chance: [1, 2, 3, 4, 5],
        }

        const categoryOrder: Category[] = [
            'six', 'pair', 'one', 'two', 'three', 'four', 'five',
            'twoPairs', 'threeOfKind', 'fourOfKind', 'full',
            'smallStraight', 'largeStraight', 'general', 'chance',
        ]

        categoryOrder.forEach((category) => {
            state.players.forEach((player) => {
                state = reducer(state, {
                    type: 'saveCategory',
                    playerId: player.id,
                    category,
                    dice: rolls[category],
                })
            })

            if (category === 'pair') {
                state.players.forEach((player) => {
                    expect(player.card.pair).toBe(0)
                })
            }
        })

        expect(isGameOver(state)).toBe(true)
    })
})
