'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_PLAYERS } from '@dice-app/contracts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CloseIcon } from '../ui/icons';
import { createGame } from '../../api/games';

type OfflineGameFormProps = {
  // the host already runs a game and has to leave it first (DECYZJE.md §5)
  disabled?: boolean;
};

export function OfflineGameForm({ disabled = false }: OfflineGameFormProps) {
  const [players, setPlayers] = useState<string[]>(['']);

  const router = useRouter();

  function addPlayer() {
    setPlayers((current) => [...current, '']);
  }

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
  }

  function removePlayer(index: number) {
    setPlayers((current) => current.filter((_, i) => i !== index));
  }

  async function addPlayers() {
    if (players.length === 0 || players.some((player) => !player.trim())) {
      return;
    }

    try {
      const game = await createGame(players);
      router.push(`/games/${game.id}`);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    // a disabled fieldset disables every field and button inside it
    <fieldset disabled={disabled} className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Players{' '}
          <span className="text-sm font-semibold text-ink-muted tabular-nums">
            {players.length}/{MAX_PLAYERS}
          </span>
        </h2>

        {/* plain text action: no fill or outline, just the action colour */}
        <button
          type="button"
          onClick={addPlayer}
          disabled={players.length >= MAX_PLAYERS}
          className={[
            "cursor-pointer rounded-full px-2 py-1 font-bold text-primary transition-colors duration-150",
            "hover:text-primary-hover disabled:cursor-not-allowed disabled:text-ink-faint",
          ].join(" ")}
        >
          + Add player
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {players.map((player, index) => (
          <li key={index} className="flex items-center gap-2 motion-safe:animate-rise">
            <Input
              value={player}
              onChange={(event) => updatePlayer(index, event.target.value)}
              placeholder={`Player ${index + 1}`}
              aria-label={`Player ${index + 1} name`}
              maxLength={50}
            />
            {/* the first player always stays, so only the others can be removed */}
            {index > 0 && (
              <button
                type="button"
                onClick={() => removePlayer(index)}
                aria-label={`Remove player ${index + 1}`}
                className={[
                  "grid h-9 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted",
                  "transition-colors duration-150 hover:text-danger",
                ].join(" ")}
              >
                <CloseIcon size={20} />
              </button>
            )}
          </li>
        ))}
      </ol>

      <Button type="button" size="lg" onClick={addPlayers} className="mt-6">
        Create game
      </Button>
    </fieldset>
  );
}
