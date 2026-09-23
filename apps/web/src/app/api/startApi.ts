import type { StartGameResponse } from '../types/gameTypes';
import type { ApiResponse } from '../types/apiTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function startGame(
    gameId: string,
) {
    const response = await fetch(`${API_URL}/games/${gameId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
        },
    });

    if (!response.ok) {
        throw new Error('Failed to start game');
    }

    const result: ApiResponse<StartGameResponse> = await response.json();

    return result.data;
}