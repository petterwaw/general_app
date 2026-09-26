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

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Shown instead of Create / Join while the host still runs a game: a host runs one game at a
// time (DECYZJE.md §5), so a new one waits until this one is finished or left.
export function ActiveGameCard({ game, onLeave, pending = false }: ActiveGameCardProps) {
  return (
    <Card className="grid gap-5">
      {/* text inset by px-2: at the 52px corners the card padding alone reads as cramped */}
      <div className="grid gap-0.5 px-2">
        <p className="text-lg font-bold">Hey, you still have a game going.</p>
        <p className="text-xs font-semibold text-ink-faint">Game from {formatCreatedAt(game.createdAt)}</p>
      </div>

      <ul aria-label="Players" className="flex flex-wrap gap-x-4 gap-y-2 px-2">
        {game.participants.map((participant, seat) => (
          <li key={participant.id} className="flex items-center gap-2 font-semibold">
            <Avatar seed={participant.name} seat={seat} size={28} />
            {participant.name}
          </li>
        ))}
      </ul>

      {/* stacked: side by side the lg button does not fit a phone */}
      <div className="grid gap-1">
        <Button render={<Link href={`/games/${game.id}`} />} nativeButton={false} size="lg">
          Back to the game
        </Button>
        {/* a quiet text action, so leaving does not compete with going back */}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className={[
            'cursor-pointer rounded-full px-2 py-3 font-bold text-ink-muted transition-colors duration-150',
            'hover:text-danger disabled:cursor-not-allowed disabled:text-ink-faint',
          ].join(' ')}
        >
          Leave game
        </button>
      </div>
    </Card>
  );
}
