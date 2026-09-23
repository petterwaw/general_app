import { Button } from '../ui/button';
import { startGame } from '../../api/startApi';
import type { Game } from '../../types/gameTypes'

type GameLobbyProps = {
  gameId: string;
  onGameStarted: (game: Game) => void;
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
