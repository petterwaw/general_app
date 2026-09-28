import type { Category, DiceRoll, ScoreCard } from './types.js'
import { dispatchPoints } from './scoring.js'
import { GameRuleError } from './errors.js'
import { isCategoryFree, isLowerSectionCategory, isLowerSectionUnlocked } from './validation.js'

export type Player = { id: string, name: string }
export type PlayersList = Player[]
export type GameState = { players: (Player & { card: ScoreCard })[], currentPlayerId: string }
export type Action = { type: 'saveCategory', playerId: string, category: Category, dice: DiceRoll }

export function createEmptyScoreCard(): ScoreCard {
    return {
        one: null, two: null, three: null, four: null, five: null, six: null,
        pair: null, twoPairs: null, threeOfKind: null, fourOfKind: null,
        full: null, smallStraight: null, largeStraight: null, general: null, chance: null
    }
}

export function createInitialState(playersList: PlayersList): GameState {
    if (playersList.length === 0) {
        throw new Error('playersList must not be empty')
    }

    return {
        players: playersList.map((player) => ({ ...player, card: createEmptyScoreCard() })),
        currentPlayerId: playersList[0].id
    }
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

function applySaveCategory(gameState: GameState, action: Action): GameState {
    if (!isPlayerTurn(gameState, action.playerId)) {
        throw new GameRuleError(`It is not player ${action.playerId}'s turn`)
    }

    const player = findPlayer(gameState, action.playerId)

    if (!isCategoryFree(player.card, action.category)) {
        throw new GameRuleError(`Category ${action.category} is already taken`)
    }

    // a zero goes anywhere; a locked lower category takes nothing else (docs/ZASADY-GRY.md)
    const lowerLocked = isLowerSectionCategory(action.category) && !isLowerSectionUnlocked(player.card)
    const score = lowerLocked ? 0 : dispatchPoints(action.category, action.dice)

    const players = gameState.players.map(player =>
        player.id === action.playerId
            ? { ...player, card: { ...player.card, [action.category]: score } }
            : player
    )

    return {
        players,
        currentPlayerId: nextPlayerId(gameState)
    }
}

export function reducer(gameState: GameState, action: Action): GameState {
    switch (action.type) {
        case 'saveCategory':
            return applySaveCategory(gameState, action)
        default:
            throw new Error(`Unknown action type: ${action.type}`)
    }
}
