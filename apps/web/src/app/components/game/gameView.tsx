'use client';

import Link from 'next/link';

import { ApiError } from '../../api/client';
import useGame from '../../hooks/useGame';
import { ErrorScreen } from '../errors/errorScreen';
import { Button } from '../ui/button';
import GameLobby from '../gameLobby/gameLobby';
import GameScreen from './gameScreen';

export default function GameView({ gameId }: { gameId: string }) {
  const { game, loading, error, setGame } = useGame(gameId);

  if (loading) return <div>Loading...</div>;
  if (error instanceof ApiError && error.statusCode === 404) {
    return (
      <ErrorScreen mood="unsure" title="No game here. Someone must have pocketed the dice">
        <GoToGames />
      </ErrorScreen>
    );
  }
  if (error) return <div>{error.message}</div>;
  if (!game) return null;

  if (game.status === 'LOBBY') {
    return <GameLobby game={game} onGameChange={setGame} />;
  }

  if (game.status === 'COMPLETED') {
    return <GameScreen game={game} onGameChange={setGame} />;
  }

  if (game.status === 'ABANDONED' || game.status === 'EXPIRED') {
    return <div>Game is no longer available</div>;
  }

  if (game.status === 'IN_PROGRESS') {
    if (!game.currentPlayerId) {
      return <div>Waiting for active player...</div>;
    }

    return <GameScreen game={game} onGameChange={setGame} />;
  }

  return null;
}

function GoToGames() {
  return (
    <Button render={<Link href="/games" />} nativeButton={false}>
      Go to games
    </Button>
  );
}
