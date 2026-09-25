'use client';

import Link from 'next/link';
import type { GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import Avatar from '../players/avatar';

type ActiveGameCardProps = {
  game: GameView;
  onLeave: () => void;
  pending?: boolean;
};

// Shown instead of Create / Join while the host still runs a game: a host runs one game at a
// time (DECYZJE.md §5), so a new one waits until this one is finished or left.
export function ActiveGameCard({ game, onLeave, pending = false }: ActiveGameCardProps) {
  return (
    <Card className="grid gap-5">
      <p className="text-lg font-bold">Hey, you still have a game going. What do you want to do?</p>

      <ul aria-label="Players" className="flex flex-wrap gap-x-4 gap-y-2">
        {game.participants.map((participant, seat) => (
          <li key={participant.id} className="flex items-center gap-2 font-semibold">
            <Avatar participantId={participant.id} seat={seat} size={28} />
            {participant.name}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button render={<Link href={`/games/${game.id}`} />} nativeButton={false} className="flex-1">
          Back to the game
        </Button>
        {/* a quiet text action, so leaving does not compete with going back */}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className={[
            'flex-1 cursor-pointer rounded-full px-2 py-3 font-bold text-ink-muted transition-colors duration-150',
            'hover:text-danger disabled:cursor-not-allowed disabled:text-ink-faint',
          ].join(' ')}
        >
          Leave game
        </button>
      </div>
    </Card>
  );
}
