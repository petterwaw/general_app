import { useEffect, useState } from 'react';
import type { GameView } from '@dice-app/contracts';
import { getHostedGame } from '../api/games';

export default function useHostedGame() {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // bumped by retry(), so the effect below asks the API again
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function fetchGame() {
      try {
        setLoading(true);
        setError(null);
        setGame(await getHostedGame());
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
  }, [attempt]);

  return {
    game,
    loading,
    error,
    setGame,
    retry: () => setAttempt((count) => count + 1),
  };
}
