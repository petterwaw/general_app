// Thrown when an action breaks the game rules (wrong turn, taken category).
// Any other error from the reducer means an inconsistent state, not a bad move.
export class GameRuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GameRuleError'
    }
}
