import type { ApiResponse, CreateGameResponse } from '../types/apiTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createOfflineGame(
    players: string[],
) {
    const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
            players,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create game');
    }

    const result: ApiResponse<CreateGameResponse> = await response.json();

    return result.data;
}