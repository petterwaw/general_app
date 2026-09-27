import { useEffect, useState } from 'react';
import type { GameView } from '@dice-app/contracts';
import { getGame } from '../api/games';

export default function useGame(gameId: string) {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  // the error itself, not its message: the game screen tells a missing game (404) from the rest
  const [error, setError] = useState<Error | null>(null);
  // bumped by retry(), so the effect below asks the API again
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function fetchGame() {
      try {
        setLoading(true);
        setError(null);
        setGame(await getGame(gameId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Something went wrong'));
      } finally {
        setLoading(false);
      }
    }

    fetchGame();
  }, [gameId, attempt]);

  return {
    game,
    loading,
    error,
    setGame,
    // asks the API again, e.g. after it could not be reached
    retry: () => setAttempt((count) => count + 1),
  };
}
