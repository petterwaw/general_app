'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ThreeBodySpinner } from '../ui/threeBodySpinner';
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
  // a link has no request to wait on: it spins from the click until the game screen replaces it
  const [goingBack, setGoingBack] = useState(false);

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

      {/* side by side, wrapping to stacked only when the labels do not fit on one line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* wrapper sized by the label, so the lg size's w-full fills it instead of the whole row;
            inert while leaving: blocked, but not greyed out next to the spinning Leave */}
        <div className="grow" inert={pending}>
          <Button
            render={
              <Link
                href={`/games/${game.id}`}
                onClick={(event) => {
                  // a new-tab click leaves this page where it is, so nothing to wait for
                  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) setGoingBack(true);
                }}
              />
            }
            nativeButton={false}
            size="lg"
            loading={goingBack}
            className="whitespace-nowrap"
          >
            Back to the game
          </Button>
        </div>
        {/* a quiet text action, so leaving does not compete with going back */}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          inert={goingBack}
          aria-busy={pending || undefined}
          className={[
            'relative grid grow cursor-pointer place-items-center whitespace-nowrap rounded-full px-2 py-3',
            'font-bold text-ink-muted transition-colors duration-150 enabled:hover:text-danger disabled:cursor-default',
          ].join(' ')}
        >
          {/* the label stays, hidden, so the button keeps its size */}
          <span className={pending ? 'invisible' : undefined}>Leave game</span>
          {pending && <ThreeBodySpinner className="absolute" />}
        </button>
      </div>
    </Card>
  );
}
