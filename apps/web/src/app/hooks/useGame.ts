import { useEffect, useState } from 'react'
import type { DiceRoll, ScoreCard } from '@dice-app/game-core';
import type { Game, Participant } from '../types/gameTypes'

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
          `http://localhost:3000/games/${gameId}`,
        );

        if (!res.ok) {
          throw new Error('Could not fetch game');
        }

        const data: Game = await res.json();

        setGame(data);
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