import { describe, it, expect } from 'vitest'
import {
    createInitialState,
    isPlayerTurn,
    nextPlayerId,
    isGameOver,
    reducer
} from './reducer.js'
import type { Action } from './reducer.js'
import { GameRuleError } from './errors.js'
import type { Category, DiceRoll } from './types.js'

describe('createInitialState', () => {
    it('should throw when the player list is empty', () => {
        expect(() => createInitialState([])).toThrow()
    })

    it('should create a state with empty score cards for each player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        state.players.forEach((player) => {
            Object.values(player.card).forEach((value) => {
                expect(value).toBeNull()
            })
        })
    })

    it('should set currentPlayerId to the first player in the list', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(state.currentPlayerId).toBe('p1')
    })
})

describe('isPlayerTurn', () => {
    it('should return true when playerId matches currentPlayerId', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])

        expect(isPlayerTurn(state, 'p1')).toBe(true)
    })

    it('should return false when playerId belongs to another player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(isPlayerTurn(state, 'p2')).toBe(false)
    })
})

describe('nextPlayerId', () => {
    it('should return the next player id in turn order', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])

        expect(nextPlayerId(state)).toBe('p2')
    })

    it('should wrap around to the first player after the last player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        state.currentPlayerId = 'p2'

        expect(nextPlayerId(state)).toBe('p1')
    })

    it('should throw when currentPlayerId does not match any player in the state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.currentPlayerId = 'missing'

        expect(() => nextPlayerId(state)).toThrow()
    })
})

describe('isGameOver', () => {
    it('should return false for a newly created state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])

        expect(isGameOver(state)).toBe(false)
    })

    it('should return false when only some categories are filled', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3

        expect(isGameOver(state)).toBe(false)
    })

    it('should return true when all players have all 15 categories filled', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        Object.keys(state.players[0].card).forEach((category) => {
            state.players[0].card[category as Category] = 0
        })

        expect(isGameOver(state)).toBe(true)
    })

    it('should return false while another player still has free categories', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        Object.keys(state.players[0].card).forEach((category) => {
            state.players[0].card[category as Category] = 0
        })

        expect(isGameOver(state)).toBe(false)
    })
})

describe('reducer — saveCategory (legal moves)', () => {
    it('should save the score in a free upper section category and move the turn to the next player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.six).toBe(18)
        expect(newState.currentPlayerId).toBe('p2')
    })

    it('should save the score in a lower section category when the lower section is unlocked', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3
        state.players[0].card.two = 6
        state.players[0].card.three = 9

        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [5, 5, 2, 3, 4] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(10)
    })

    it('should allow saving "chance" even when the lower section is locked', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'chance', dice: [1, 2, 3, 4, 5] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.chance).toBe(15)
    })

    it('should save a zero in a locked lower section category when nothing fits', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [1, 1, 2, 3, 4] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in a locked lower section category even when another category would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        // three sixes would score 18 in Sixes, and the pair of sixes 12 once the section is unlocked
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in an upper section category even when another category would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        // three ones would score in Ones
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 1, 1, 1] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.six).toBe(0)
    })

    it('should keep the lower section locked when the upper categories hold only zeros', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 0
        state.players[0].card.two = 0
        state.players[0].card.three = 0

        // the pair of fives would score 10 in an unlocked section
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [5, 5, 5, 2, 3] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in a free category when nothing fits, even though chance would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3
        state.players[0].card.two = 6
        state.players[0].card.three = 9

        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'fourOfKind', dice: [1, 2, 3, 5, 6] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.fourOfKind).toBe(0)
    })
})

describe('reducer — state handling', () => {
    it('should not change the state it was given', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const cardBefore = { ...state.players[0].card }
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        reducer(state, action)

        expect(state.players[0].card).toStrictEqual(cardBefore)
        expect(state.currentPlayerId).toBe('p1')
    })

    it('should leave the other players\' cards untouched', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[1].card).toStrictEqual(state.players[1].card)
    })

    it('should keep the turn with the only player in a solo game', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.currentPlayerId).toBe('p1')
    })
})

describe('reducer — saveCategory (illegal moves throw)', () => {
    it('should throw when playerId does not match currentPlayerId', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }])
        const action: Action = { type: 'saveCategory', playerId: 'p2', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(GameRuleError)
    })

    it('should throw when the category is already occupied', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players[0].card.one = 3
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(GameRuleError)
    })

    it('should throw when playerId does not exist in the state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        state.players = []
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
        expect(() => reducer(state, action)).not.toThrow(GameRuleError)
    })

    it('should throw when the action type is unknown', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }])
        // @ts-expect-error
        const action: Action = { type: 'somethingElse', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(/Unknown action type/)
    })
})

describe('reducer — full game', () => {
    it('should play the entire game from createInitialState to isGameOver === true, including one forced zero round', () => {
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
