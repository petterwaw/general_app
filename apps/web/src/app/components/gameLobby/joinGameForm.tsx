import { useRef, useState } from 'react';
import type { GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import PlayerNameRow from '../players/playerNameRow';
import { joinGame } from '../../api/games';
import { useErrorToast } from '../ui/toast';

type JoinGameFormProps = {
  gameId: string;
  // the seat the new player takes, so the avatar shows the colour they will play with
  seat: number;
  onJoined: (game: GameView) => void;
};

// Someone who opened an invite link watches the online lobby until they type a name and join.
export function JoinGameForm({ gameId, seat, onJoined }: JoinGameFormProps) {
  const [name, setName] = useState('');
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const showError = useErrorToast();

  const canJoin = name.trim() !== '' && !pending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // a ref, not state: a fast double submit would pass a state check twice
    if (!canJoin || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      onJoined(await joinGame(gameId, name.trim()));
    } catch (err) {
      showError(err);
      setPending(false);
      pendingRef.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <PlayerNameRow
        autoFocus
        value={name}
        onChange={setName}
        seat={seat}
        placeholder="Tell us your name"
        label="Your name"
      />
      <Button type="submit" size="lg" disabled={!canJoin} loading={pending}>
        Join game
      </Button>
    </form>
  );
}
