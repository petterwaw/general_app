import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateGameInput, GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import PlayerNameRow from '../players/playerNameRow';
import { GameModeSwitch } from './gameModeSwitch';
import { createGame, getHostedGame } from '../../api/games';
import { useErrorToast } from '../ui/toast';

type GameMode = 'offline' | 'online';

const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  offline:
    'Everyone plays at one table with real dice. You enter the dice after each turn, and the app keeps score.',
  online:
    'Everyone joins from their own device, and the app rolls virtual dice for everyone.',
};

type CreateGameFormProps = {
  // called when creating failed but this device turns out to host a game after all
  onHostedGame: (game: GameView) => void;
};

// Only the host's name here: the other players are added in the lobby.
export function CreateGameForm({ onHostedGame }: CreateGameFormProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GameMode>('offline');
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const showError = useErrorToast();
  const router = useRouter();

  const canCreate = name.trim() !== '' && !pending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // a ref, not state: a fast double submit would pass a state check twice
    if (!canCreate || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const input: CreateGameInput =
        mode === 'online'
          ? { mode: 'ONLINE', name: name.trim() }
          : { mode: 'LOCAL', players: [name.trim()] };
      const game = await createGame(input);
      router.push(`/games/${game.id}`);
    } catch (err) {
      // The game may exist after all: the response got lost on the way, or another tab of this
      // device created one first (409). Show that game instead of the error.
      const hostedGame = await getHostedGame().catch(() => null);
      if (hostedGame) {
        onHostedGame(hostedGame);
        return;
      }
      showError(err);
      setPending(false);
      pendingRef.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <PlayerNameRow
        autoFocus
        value={name}
        onChange={setName}
        seat={0}
        placeholder="Tell us your name"
        label="Your name"
      />

      <div className="grid gap-2.5">
        <GameModeSwitch mode={mode} onChange={setMode} />
        {/* both descriptions share one grid cell, so the card keeps the height of the longer one
            and does not jump when the mode changes; the other one fades out */}
        <div className="grid">
          {(Object.keys(MODE_DESCRIPTIONS) as GameMode[]).map((option) => (
            <p
              key={option}
              className={[
                'col-start-1 row-start-1 px-2 text-center text-sm text-ink-muted',
                'transition-[opacity,visibility] duration-300 motion-reduce:transition-none',
                option === mode ? 'visible opacity-100' : 'invisible opacity-0',
              ].join(' ')}
            >
              {MODE_DESCRIPTIONS[option]}
            </p>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={!canCreate} loading={pending}>
        Create game
      </Button>
    </form>
  );
}
