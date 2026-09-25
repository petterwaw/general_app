'use client';

import Link from 'next/link';
import type { GameView } from '@dice-app/contracts';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { LeaveIcon } from '../ui/icons';
import Avatar from '../players/avatar';

type ActiveGameCardProps = {
  game: GameView;
  onLeave: () => void;
  pending?: boolean;
};

// The game the host still runs. A host runs one game at a time (DECYZJE.md §5), so creating
// a new one waits until this one is resumed and finished, or left.
export function ActiveGameCard({ game, onLeave, pending = false }: ActiveGameCardProps) {
  return (
    <Card className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Unfinished game</h2>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            Resume it, or leave it to start a new one.
          </p>
        </div>
        <Badge className="shrink-0">{game.status === 'LOBBY' ? 'Lobby' : 'In progress'}</Badge>
      </div>

      <ul aria-label="Players" className="flex flex-wrap gap-x-4 gap-y-2">
        {game.participants.map((participant, seat) => (
          <li key={participant.id} className="flex items-center gap-2 font-semibold">
            <Avatar participantId={participant.id} seat={seat} size={28} />
            {participant.name}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button
          render={<Link href={`/games/${game.id}`} />}
          nativeButton={false}
          className="flex-1"
        >
          Resume game
        </Button>
        <Button variant="secondary" onClick={onLeave} disabled={pending} className="flex-1">
          <LeaveIcon />
          Leave game
        </Button>
      </div>
    </Card>
  );
}
