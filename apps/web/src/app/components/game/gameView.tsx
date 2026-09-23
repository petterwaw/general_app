'use client';

import RollOffline from '../offlineGames/rollOffline';
import GameScoreBoard from '../gameScoreBoard';
import useGame from '../../hooks/useGame';
import GameLobby from '../gameLobby/gameLobby';

export default function GameView({ gameId }: { gameId: string }) {
  const { game, loading, error, setGame } = useGame(gameId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!game) return <div>Game not found</div>;

  if (game.status === 'LOBBY') {
    return (
      <GameLobby
        gameId={game.id}
        onGameStarted={(updatedGame) =>
          setGame((currentGame) => (currentGame ? { ...currentGame, ...updatedGame } : currentGame))
        }
      />
    );
  }

  if (game.status === 'COMPLETED') {
    return <div>Game completed</div>;
  }

  if (game.status === 'ABANDONED' || game.status === 'EXPIRED') {
    return <div>Game is no longer available</div>;
  }

  if (game.status === 'IN_PROGRESS') {
    if (!game.currentPlayerId) {
      return <div>Waiting for active player...</div>;
    }

    return (
      <>
        <RollOffline
          gameId={game.id}
          playerId={game.currentPlayerId}
          currentDice={game.currentDice}
        />

        <GameScoreBoard participants={game.participants} />
      </>
    );
  }

  return null;
}
