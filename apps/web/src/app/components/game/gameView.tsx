'use client';

import Link from 'next/link';

import { ApiError } from '../../api/client';
import useGame from '../../hooks/useGame';
import useGameSocket from '../../hooks/useGameSocket';
import { ErrorScreen } from '../errors/errorScreen';
import { Button } from '../ui/button';
import { ThreeBodySpinner } from '../ui/threeBodySpinner';
import GameLobby from '../gameLobby/gameLobby';
import GameScreen from './gameScreen';

export default function GameView({ gameId }: { gameId: string }) {
  const { game, loading, error, setGame, retry } = useGame(gameId);
  const log = useGameSocket(gameId, game, setGame);

  if (loading) {
    return (
      <div role="status" className="flex flex-1 items-center justify-center text-primary">
        <ThreeBodySpinner size="3rem" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (error instanceof ApiError && error.statusCode === 404) {
    return (
      <ErrorScreen title="No game here. Someone must have pocketed the dice">
        <GoToGames />
      </ErrorScreen>
    );
  }
  // the API is down, the network dropped, the server failed or asked to slow down: worth another go
  if (error) {
    const rateLimited = error instanceof ApiError && error.statusCode === 429;
    return (
      <ErrorScreen title={rateLimited ? error.message : "Something went wrong. The table isn't answering"}>
        <Button onClick={retry}>Try again</Button>
      </ErrorScreen>
    );
  }
  if (!game) return null;

  if (game.status === 'LOBBY') {
    return <GameLobby game={game} onGameChange={setGame} />;
  }

  if (game.status === 'COMPLETED') {
    return <GameScreen game={game} log={log} onGameChange={setGame} />;
  }

  if (game.status === 'ABANDONED') {
    return (
      <ErrorScreen title="The host left and took the dice along">
        <GoToGames />
      </ErrorScreen>
    );
  }

  if (game.status === 'EXPIRED') {
    return (
      <ErrorScreen title="This game sat idle so long it fell asleep">
        <GoToGames />
      </ErrorScreen>
    );
  }

  if (game.status === 'IN_PROGRESS') {
    if (!game.currentPlayerId) {
      return <div>Waiting for active player...</div>;
    }

    return <GameScreen game={game} log={log} onGameChange={setGame} />;
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
