import { useEffect, useState } from 'react';
import type { GameView } from '@dice-app/contracts';
import { getGame } from '../api/games';

export default function useGame(gameId: string) {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  // the error itself, not its message: the game screen tells a missing game (404) from the rest
  const [error, setError] = useState<Error | null>(null);

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
  }, [gameId]);

  return {
    game,
    loading,
    error,
    setGame,
  };
}
