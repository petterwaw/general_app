import { useEffect, useState } from 'react';
import type { GameView } from '@dice-app/contracts';
import { getGame } from '../api/games';

export default function useGame(gameId: string) {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGame() {
      try {
        setLoading(true);
        setError(null);
        setGame(await getGame(gameId));
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
    setGame,
  };
}
