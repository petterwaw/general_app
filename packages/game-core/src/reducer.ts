import type { Category, DiceRoll, DiceSource, ScoreCard, TurnState } from './types.js'
import { dispatchPoints } from './scoring.js'
import { GameRuleError } from './errors.js'
import { canRoll, isCategoryFree, isLowerSectionCategory, isLowerSectionUnlocked } from './validation.js'

export type Player = { id: string, name: string }
export type PlayersList = Player[]

type GameStateBase = { players: (Player & { card: ScoreCard })[], currentPlayerId: string }

// Physical dice are rolled at the table, so only virtual games track the turn (DECYZJE.md §4).
export type GameState =
    | GameStateBase & { diceSource: 'PHYSICAL' }
    | GameStateBase & { diceSource: 'VIRTUAL', turn: TurnState }

// `dice` comes with physical dice only; virtual games score the dice kept in `turn`.
// `rolled` always holds five server-drawn values; positions listed in `held` keep their die.
export type Action =
    | { type: 'saveCategory', playerId: string, category: Category, dice?: DiceRoll }
    | { type: 'roll', playerId: string, held: number[], rolled: DiceRoll }

type SaveCategoryAction = Extract<Action, { type: 'saveCategory' }>
type RollAction = Extract<Action, { type: 'roll' }>

export function createEmptyScoreCard(): ScoreCard {
    return {
        one: null, two: null, three: null, four: null, five: null, six: null,
        pair: null, twoPairs: null, threeOfKind: null, fourOfKind: null,
        full: null, smallStraight: null, largeStraight: null, general: null, chance: null
    }
}

export function createInitialState(playersList: PlayersList, diceSource: DiceSource): GameState {
    if (playersList.length === 0) {
        throw new Error('playersList must not be empty')
    }

    const base: GameStateBase = {
        players: playersList.map((player) => ({ ...player, card: createEmptyScoreCard() })),
        currentPlayerId: playersList[0].id
    }

    return diceSource === 'VIRTUAL'
        ? { ...base, diceSource, turn: { rollNumber: 0 } }
        : { ...base, diceSource }
}

export function isPlayerTurn(gameState: GameState, playerId: Player['id']): boolean {
    return gameState.currentPlayerId === playerId
}

export function nextPlayerId(gameState: GameState): Player['id'] {
    const currentIndex = gameState.players.findIndex(player => player.id === gameState.currentPlayerId)

    if (currentIndex === -1) {
        throw new Error(`Player ${gameState.currentPlayerId} does not exist in the state`)
    }

    const nextIndex = (currentIndex + 1) % gameState.players.length
    return gameState.players[nextIndex].id
}

export function isGameOver(gameState: GameState): boolean {
    return gameState.players.every(player => {
        return Object.entries(player.card).every(([category, value]) => value !== null)
    })
}

function findPlayer(gameState: GameState, playerId: Player['id']): Player & { card: ScoreCard } {
    const player = gameState.players.find(p => p.id === playerId)

    if (!player) {
        throw new Error(`Player ${playerId} does not exist in the state`)
    }

    return player
}

// The dice a saveCategory action is scored with, depending on where the dice come from.
function scoredDice(gameState: GameState, action: SaveCategoryAction): DiceRoll {
    if (gameState.diceSource === 'PHYSICAL') {
        if (!action.dice) throw new Error('A physical dice game needs the dice in the action')
        return action.dice
    }

    if (action.dice) throw new GameRuleError('A virtual dice game scores the rolled dice only')
    // rollNumber 0 is never persisted, so reaching it means the server skipped the turn's roll
    if (gameState.turn.rollNumber === 0) throw new Error('The turn has not been rolled yet')
    return gameState.turn.dice
}

function applySaveCategory(gameState: GameState, action: SaveCategoryAction): GameState {
    if (!isPlayerTurn(gameState, action.playerId)) {
        throw new GameRuleError(`It is not player ${action.playerId}'s turn`)
    }

    const player = findPlayer(gameState, action.playerId)

    if (!isCategoryFree(player.card, action.category)) {
        throw new GameRuleError(`Category ${action.category} is already taken`)
    }

    const dice = scoredDice(gameState, action)

    // a zero goes anywhere; a locked lower category takes nothing else (docs/ZASADY-GRY.md)
    const lowerLocked = isLowerSectionCategory(action.category) && !isLowerSectionUnlocked(player.card)
    const score = lowerLocked ? 0 : dispatchPoints(action.category, dice)

    const players = gameState.players.map(player =>
        player.id === action.playerId
            ? { ...player, card: { ...player.card, [action.category]: score } }
            : player
    )

    const currentPlayerId = nextPlayerId(gameState)

    return gameState.diceSource === 'VIRTUAL'
        ? { ...gameState, players, currentPlayerId, turn: { rollNumber: 0 } }
        : { ...gameState, players, currentPlayerId }
}

function isDieFace(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 6
}

function isValidHeld(held: number[]): boolean {
    const inRange = held.every(index => Number.isInteger(index) && index >= 0 && index <= 4)
    return inRange && new Set(held).size === held.length
}

// `held` comes from the player, so a bad one is a GameRuleError; `rolled`, `playerId` and the
// turn's first roll come from the server, so a bad one is an Error.
function applyRoll(gameState: GameState, action: RollAction): GameState {
    if (gameState.diceSource === 'PHYSICAL') {
        throw new GameRuleError('Physical dice are rolled at the table')
    }

    findPlayer(gameState, action.playerId)

    if (isGameOver(gameState)) {
        throw new GameRuleError('The game is over')
    }

    if (!isPlayerTurn(gameState, action.playerId)) {
        throw new GameRuleError(`It is not player ${action.playerId}'s turn`)
    }

    if (action.rolled.length !== 5 || !action.rolled.every(isDieFace)) {
        throw new Error('Rolled dice must be five values from 1 to 6')
    }

    if (!isValidHeld(action.held)) {
        throw new GameRuleError('Held dice must be distinct positions from 0 to 4')
    }

    const turn = gameState.turn

    if (!canRoll(turn)) {
        throw new GameRuleError('No rolls left in this turn')
    }

    const dice: DiceRoll = [...action.rolled]

    if (turn.rollNumber === 0) {
        if (action.held.length > 0) throw new Error('The first roll of a turn cannot hold dice')
    } else {
        for (const index of action.held) dice[index] = turn.dice[index]
    }

    // canRoll keeps rollNumber below 3, so the next one stays within 1–3
    const rollNumber = (turn.rollNumber + 1) as 1 | 2 | 3

    return { ...gameState, turn: { rollNumber, dice, heldInLastRoll: action.held } }
}

export function reducer(gameState: GameState, action: Action): GameState {
    switch (action.type) {
        case 'saveCategory':
            return applySaveCategory(gameState, action)
        case 'roll':
            return applyRoll(gameState, action)
        default: {
            const unknownAction: { type: string } = action
            throw new Error(`Unknown action type: ${unknownAction.type}`)
        }
    }
}
