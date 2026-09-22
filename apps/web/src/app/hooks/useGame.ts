import { useEffect, useState } from 'react';
import type { Game } from '../types/gameTypes';
import type { ApiResponse } from '../types/apiTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function useGame(gameId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGame() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_URL}/games/${gameId}`,
        );

        if (!res.ok) {
          throw new Error('Could not fetch game');
        }

        const response: ApiResponse<Game> = await res.json();

        setGame(response.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong',
        );
      } finally {
        setLoading(false);
      }
    }

    fetchGame();
  }, [gameId]);

  return {
    game,
    loading,
    error,
  };
}