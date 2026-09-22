import type { DiceRoll } from '../types/gameTypes';
import type { ApiResponse } from '../types/apiTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function rollDice(
    gameId: string,
    playerId: string,
    dice: DiceRoll,
) {
    const response = await fetch(`${API_URL}/games/${gameId}/roll`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
            playerId,
            dice,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to submit dice');
    }

    const result: ApiResponse<unknown> = await response.json();

    return result.data;
}