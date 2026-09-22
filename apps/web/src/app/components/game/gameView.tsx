'use client';

import RollOffline from '../offlineGames/rollOffline';
import GameScoreBoard from '../gameScoreBoard';
import useGame from '../../hooks/useGame';

export default function GameView({
  gameId,
}: {
  gameId: string;
}) {
  const { game, loading, error } = useGame(gameId);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!game) {
    return <div>Game not found</div>;
  }

  return (
    <>
      {/* <GameScoreBoard participants={game.participants} /> */}

      <RollOffline
        currentDice={game.currentDice}
      />
    </>
  );
}