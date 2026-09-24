import { Button } from '../ui/button';
import { startGame } from '../../api/games';
import type { GameView } from '@dice-app/contracts';

type GameLobbyProps = {
  gameId: string;
  onGameStarted: (game: GameView) => void;
};

export default function GameLobby({ gameId, onGameStarted }: GameLobbyProps) {
  async function start() {
    try {
      const game = await startGame(gameId);
      onGameStarted(game);
    } catch (err) {
      console.log(err);
    }
  }

  return <Button onClick={start}>Start</Button>;
}
