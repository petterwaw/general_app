'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { createGame } from '../../api/games';

export function OfflineGameForm() {
  const [players, setPlayers] = useState<string[]>(['']);

  const router = useRouter();

  function addPlayer() {
    setPlayers((current) => [...current, '']);
  }

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
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
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Players</h2>

        <Button
          type="button"
          onClick={addPlayer}
          aria-label="Add player"
          className="h-10 w-10 rounded-full p-0 text-xl"
        >
          +
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {players.map((player, index) => (
          <div key={index} className="animate-in fade-in slide-in-from-top-2 duration-200">
            <Input
              value={player}
              onChange={(event) => updatePlayer(index, event.target.value)}
              placeholder={`Player ${index + 1}`}
              maxLength={50}
            />
          </div>
        ))}
      </div>

      <Button type="button" onClick={addPlayers} className="mt-6 w-full">
        Create game
      </Button>
    </>
  );
}
