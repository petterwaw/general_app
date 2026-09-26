'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '../ui/button';
import PlayerNameRow from '../players/playerNameRow';
import { GameModeSwitch } from './gameModeSwitch';
import { createGame } from '../../api/games';

type GameMode = 'offline' | 'online';

const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  offline:
    'Played at one table on real dice. This device runs the game: you enter the dice at the end of each turn and the app keeps score for everyone. Players are added in the lobby.',
  online:
    'Everyone plays on their own device. The app rolls the dice, and each turn has a 90-second limit.',
};

// Only the host's name here: the other players are added in the lobby.
export function CreateGameForm() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GameMode>('offline');
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // online play is outside the MVP; the switch does not let it be picked yet
  const canCreate = mode === 'offline' && name.trim() !== '' && !pending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // a ref, not state: a fast double submit would pass a state check twice
    if (!canCreate || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const game = await createGame([name.trim()]);
      router.push(`/games/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
        <p className="px-2 text-center text-sm text-ink-muted">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      {error && (
        <p role="alert" className="text-center font-semibold text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={!canCreate}>
        Create game
      </Button>
    </form>
  );
}
