import { describe, it, expect } from 'vitest'
import {
    createInitialState,
    isPlayerTurn,
    nextPlayerId,
    isGameOver,
    reducer
} from './reducer.js'
import type { Action, GameState } from './reducer.js'
import { GameRuleError } from './errors.js'
import { CATEGORIES } from './types.js'
import type { Category, DiceRoll, TurnState } from './types.js'

describe('createInitialState', () => {
    it('should throw when the player list is empty', () => {
        expect(() => createInitialState([], 'PHYSICAL')).toThrow()
    })

    it('should create a state with empty score cards for each player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')

        state.players.forEach((player) => {
            Object.values(player.card).forEach((value) => {
                expect(value).toBeNull()
            })
        })
    })

    it('should set currentPlayerId to the first player in the list', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')

        expect(state.currentPlayerId).toBe('p1')
    })
})

describe('isPlayerTurn', () => {
    it('should return true when playerId matches currentPlayerId', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')

        expect(isPlayerTurn(state, 'p1')).toBe(true)
    })

    it('should return false when playerId belongs to another player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')

        expect(isPlayerTurn(state, 'p2')).toBe(false)
    })
})

describe('nextPlayerId', () => {
    it('should return the next player id in turn order', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')

        expect(nextPlayerId(state)).toBe('p2')
    })

    it('should wrap around to the first player after the last player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        state.currentPlayerId = 'p2'

        expect(nextPlayerId(state)).toBe('p1')
    })

    it('should throw when currentPlayerId does not match any player in the state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.currentPlayerId = 'missing'

        expect(() => nextPlayerId(state)).toThrow()
    })
})

describe('isGameOver', () => {
    it('should return false for a newly created state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')

        expect(isGameOver(state)).toBe(false)
    })

    it('should return false when only some categories are filled', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.players[0].card.one = 3

        expect(isGameOver(state)).toBe(false)
    })

    it('should return true when all players have all 15 categories filled', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        Object.keys(state.players[0].card).forEach((category) => {
            state.players[0].card[category as Category] = 0
        })

        expect(isGameOver(state)).toBe(true)
    })

    it('should return false while another player still has free categories', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        Object.keys(state.players[0].card).forEach((category) => {
            state.players[0].card[category as Category] = 0
        })

        expect(isGameOver(state)).toBe(false)
    })
})

describe('reducer — saveCategory (legal moves)', () => {
    it('should save the score in a free upper section category and move the turn to the next player', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.six).toBe(18)
        expect(newState.currentPlayerId).toBe('p2')
    })

    it('should save the score in a lower section category when the lower section is unlocked', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.players[0].card.one = 3
        state.players[0].card.two = 6
        state.players[0].card.three = 9

        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [5, 5, 2, 3, 4] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(10)
    })

    it('should allow saving "chance" even when the lower section is locked', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'chance', dice: [1, 2, 3, 4, 5] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.chance).toBe(15)
    })

    it('should save a zero in a locked lower section category when nothing fits', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [1, 1, 2, 3, 4] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in a locked lower section category even when another category would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        // three sixes would score 18 in Sixes, and the pair of sixes 12 once the section is unlocked
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in an upper section category even when another category would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        // three ones would score in Ones
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 1, 1, 1] }

        const newState = reducer(state, action)

        expect(newState.players[0].card.six).toBe(0)
    })

    it('should keep the lower section locked when the upper categories hold only zeros', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.players[0].card.one = 0
        state.players[0].card.two = 0
        state.players[0].card.three = 0

        // the pair of fives would score 10 in an unlocked section
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'pair', dice: [5, 5, 5, 2, 3] }
        const newState = reducer(state, action)

        expect(newState.players[0].card.pair).toBe(0)
    })

    it('should save a zero in a free category when nothing fits, even though chance would score', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
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
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        const cardBefore = { ...state.players[0].card }
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        reducer(state, action)

        expect(state.players[0].card).toStrictEqual(cardBefore)
        expect(state.currentPlayerId).toBe('p1')
    })

    it('should leave the other players\' cards untouched', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.players[1].card).toStrictEqual(state.players[1].card)
    })

    it('should keep the turn with the only player in a solo game', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 2, 3] }

        const newState = reducer(state, action)

        expect(newState.currentPlayerId).toBe('p1')
    })
})

describe('reducer — saveCategory (illegal moves throw)', () => {
    it('should throw when playerId does not match currentPlayerId', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p2', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(GameRuleError)
    })

    it('should throw when the category is already occupied', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.players[0].card.one = 3
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(GameRuleError)
    })

    it('should throw when playerId does not exist in the state', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        state.players = []
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow()
        expect(() => reducer(state, action)).not.toThrow(GameRuleError)
    })

    it('should throw when the action type is unknown', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        // @ts-expect-error
        const action: Action = { type: 'somethingElse', playerId: 'p1', category: 'one', dice: [1, 1, 1, 2, 3] }

        expect(() => reducer(state, action)).toThrow(/Unknown action type/)
    })
})

describe('reducer — full game', () => {
    it('should play the entire game from createInitialState to isGameOver === true, including one forced zero round', () => {
        let state = createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'PHYSICAL')

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

function createVirtualGame(): GameState {
    return createInitialState([{ id: 'p1', name: 'Ala' }, { id: 'p2', name: 'Bartek' }], 'VIRTUAL')
}

function turnOf(state: GameState): TurnState {
    if (state.diceSource !== 'VIRTUAL') throw new Error('Expected a virtual dice game')
    return state.turn
}

function roll(state: GameState, playerId: string, held: number[], rolled: DiceRoll): GameState {
    return reducer(state, { type: 'roll', playerId, held, rolled })
}

describe('createInitialState — virtual dice', () => {
    it('should start the first turn without a roll', () => {
        expect(turnOf(createVirtualGame())).toEqual({ rollNumber: 0 })
    })

    it('should not track the turn in a physical dice game', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')

        expect(state).not.toHaveProperty('turn')
    })
})

describe('reducer — roll (legal moves)', () => {
    it('should put all five rolled dice on the table on the first roll', () => {
        const state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])

        expect(turnOf(state)).toEqual({ rollNumber: 1, dice: [1, 2, 3, 4, 5], heldInLastRoll: [] })
    })

    it('should keep the held dice and reroll only the others', () => {
        let state = roll(createVirtualGame(), 'p1', [], [6, 2, 6, 4, 5])
        state = roll(state, 'p1', [0, 2], [1, 1, 1, 1, 1])

        expect(turnOf(state)).toEqual({ rollNumber: 2, dice: [6, 1, 6, 1, 1], heldInLastRoll: [0, 2] })
    })

    it('should let the player release a die held in the previous roll', () => {
        let state = roll(createVirtualGame(), 'p1', [], [6, 2, 6, 4, 5])
        state = roll(state, 'p1', [0, 2], [1, 1, 1, 1, 1])
        state = roll(state, 'p1', [0], [3, 3, 3, 3, 3])

        expect(turnOf(state)).toEqual({ rollNumber: 3, dice: [6, 3, 3, 3, 3], heldInLastRoll: [0] })
    })

    it('should reroll every die when nothing is held after the first roll', () => {
        let state = roll(createVirtualGame(), 'p1', [], [6, 6, 6, 6, 6])
        state = roll(state, 'p1', [], [1, 2, 3, 4, 5])

        expect(turnOf(state)).toEqual({ rollNumber: 2, dice: [1, 2, 3, 4, 5], heldInLastRoll: [] })
    })

    it('should keep the turn with the rolling player', () => {
        const state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])

        expect(state.currentPlayerId).toBe('p1')
    })

    it('should not change the state it was given', () => {
        const state = createVirtualGame()
        const snapshot = structuredClone(state)

        roll(state, 'p1', [], [1, 2, 3, 4, 5])

        expect(state).toEqual(snapshot)
    })
})

describe('reducer — roll (illegal moves)', () => {
    it('should reject a fourth roll in one turn', () => {
        let state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])
        state = roll(state, 'p1', [], [1, 2, 3, 4, 5])
        state = roll(state, 'p1', [], [1, 2, 3, 4, 5])

        expect(() => roll(state, 'p1', [], [1, 2, 3, 4, 5])).toThrow(GameRuleError)
    })

    it('should reject a roll by a player whose turn it is not', () => {
        expect(() => roll(createVirtualGame(), 'p2', [], [1, 2, 3, 4, 5])).toThrow(GameRuleError)
    })

    it('should reject a roll in a physical dice game', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')

        expect(() => roll(state, 'p1', [], [1, 2, 3, 4, 5])).toThrow(GameRuleError)
    })

    it('should reject a roll once the game is over', () => {
        let state = createInitialState([{ id: 'p1', name: 'Ala' }], 'VIRTUAL')
        for (const category of CATEGORIES) {
            state = roll(state, 'p1', [], [1, 2, 3, 4, 5])
            state = reducer(state, { type: 'saveCategory', playerId: 'p1', category })
        }

        expect(() => roll(state, 'p1', [], [1, 2, 3, 4, 5])).toThrow(GameRuleError)
    })

    it.each([
        { held: [5], reason: 'a position past the last die' },
        { held: [-1], reason: 'a negative position' },
        { held: [1.5], reason: 'a fractional position' },
        { held: [0, 0], reason: 'the same position twice' },
    ])('should reject held dice with $reason', ({ held }) => {
        const state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])

        expect(() => roll(state, 'p1', held, [1, 2, 3, 4, 5])).toThrow(GameRuleError)
    })

    it('should treat held dice on the first roll of a turn as a server error', () => {
        const state = createVirtualGame()

        expect(() => roll(state, 'p1', [0], [1, 2, 3, 4, 5])).toThrow()
        expect(() => roll(state, 'p1', [0], [1, 2, 3, 4, 5])).not.toThrow(GameRuleError)
    })

    it('should treat rolled values outside 1–6 as a server error', () => {
        const state = createVirtualGame()
        // @ts-expect-error
        const rolled: DiceRoll = [0, 2, 3, 4, 7]

        expect(() => roll(state, 'p1', [], rolled)).toThrow()
        expect(() => roll(state, 'p1', [], rolled)).not.toThrow(GameRuleError)
    })

    it('should treat fewer than five rolled values as a server error', () => {
        const state = createVirtualGame()
        // @ts-expect-error
        const rolled: DiceRoll = [1, 2, 3, 4]

        expect(() => roll(state, 'p1', [], rolled)).toThrow()
        expect(() => roll(state, 'p1', [], rolled)).not.toThrow(GameRuleError)
    })

    it('should treat a roll by a player missing from the state as a server error', () => {
        const state = createVirtualGame()
        state.players = []

        expect(() => roll(state, 'p1', [], [1, 2, 3, 4, 5])).toThrow()
        expect(() => roll(state, 'p1', [], [1, 2, 3, 4, 5])).not.toThrow(GameRuleError)
    })
})

describe('reducer — saveCategory with virtual dice', () => {
    it.each([1, 2, 3])('should score the dice on the table after roll %i', (rolls) => {
        let state = createVirtualGame()
        for (let i = 0; i < rolls; i++) state = roll(state, 'p1', [], [6, 6, 6, 2, 3])

        state = reducer(state, { type: 'saveCategory', playerId: 'p1', category: 'six' })

        expect(state.players[0].card.six).toBe(18)
    })

    it('should score the dice left after holding, not the raw rolled values', () => {
        let state = roll(createVirtualGame(), 'p1', [], [6, 6, 6, 1, 2])
        state = roll(state, 'p1', [0, 1, 2], [1, 1, 1, 6, 6])

        state = reducer(state, { type: 'saveCategory', playerId: 'p1', category: 'six' })

        expect(state.players[0].card.six).toBe(30)
    })

    it('should pass the turn to the next player with no roll yet', () => {
        let state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])

        state = reducer(state, { type: 'saveCategory', playerId: 'p1', category: 'chance' })

        expect(state.currentPlayerId).toBe('p2')
        expect(turnOf(state)).toEqual({ rollNumber: 0 })
    })

    it('should reject dice sent with the action', () => {
        const state = roll(createVirtualGame(), 'p1', [], [1, 2, 3, 4, 5])
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'six', dice: [6, 6, 6, 6, 6] }

        expect(() => reducer(state, action)).toThrow(GameRuleError)
    })

    it('should treat saving before the first roll of a turn as a server error', () => {
        const state = createVirtualGame()
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'chance' }

        expect(() => reducer(state, action)).toThrow()
        expect(() => reducer(state, action)).not.toThrow(GameRuleError)
    })
})

describe('reducer — saveCategory with physical dice', () => {
    it('should treat missing dice as a server error', () => {
        const state = createInitialState([{ id: 'p1', name: 'Ala' }], 'PHYSICAL')
        const action: Action = { type: 'saveCategory', playerId: 'p1', category: 'chance' }

        expect(() => reducer(state, action)).toThrow()
        expect(() => reducer(state, action)).not.toThrow(GameRuleError)
    })
})

describe('reducer — full virtual game', () => {
    it('should play the entire game with a reroll every turn until isGameOver === true', () => {
        let state = createVirtualGame()

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

        for (const category of CATEGORIES) {
            for (const player of state.players) {
                expect(turnOf(state)).toEqual({ rollNumber: 0 })

                state = roll(state, player.id, [], [1, 3, 5, 1, 3])
                state = roll(state, player.id, [], rolls[category])
                state = reducer(state, { type: 'saveCategory', playerId: player.id, category })
            }
        }

        expect(isGameOver(state)).toBe(true)
        for (const player of state.players) {
            expect(player.card.general).toBe(50)
            expect(player.card.largeStraight).toBe(40)
        }
    })
})
