import type { Category, GameEventView, ParticipantView } from '@dice-app/contracts';

import LogItem from './logItem';
import { CHANCE_ROW, LOWER_ROWS, UPPER_ROWS } from '../scorecard/categories';
import type { GameLogEntry } from '../../hooks/useGameLog';

type GameLogProps = {
  entries: GameLogEntry[];
  participants: ParticipantView[];
};

const CATEGORY_LABELS = Object.fromEntries(
  [...UPPER_ROWS, ...LOWER_ROWS, CHANCE_ROW].map(({ category, label }) => [category, label]),
) as Record<Category, string>;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function describe(event: GameEventView, name: string): React.ReactNode {
  switch (event.type) {
    case 'gameStarted':
      return 'Game started';
    case 'diceConfirmed':
      return (
        <>
          {name} rolled <span className="font-bold tabular-nums">{event.dice.join(' ')}</span>
        </>
      );
    case 'categorySaved':
      return categorySaved(name, event.category, event.points);
  }
}

function categorySaved(name: string, category: Category, points: number | null) {
  const label = CATEGORY_LABELS[category];
  if (points === null) return `${name} took ${label}`;
  return (
    <>
      {name} scored{' '}
      <span className={['font-bold tabular-nums', points === 0 ? 'text-danger' : ''].join(' ')}>
        {points}
      </span>{' '}
      in {label}
    </>
  );
}

// Newest on top, right under the players. Entries that do not fit are simply cut off, no
// scrolling; the bottom fades out, so the oldest entries seem to sink into the background and a
// cut row is already transparent (a mask, not an overlay: the drawer has a different background).
// Not flex-wrap: with no room left (many players in the drawer) every entry became its own
// clipped column, thousands of pixels wide.
export default function GameLog({ entries, participants }: GameLogProps) {
  return (
    <div
      aria-label="Game log"
      className={[
        'flex min-h-[30vh] flex-1 flex-col gap-2 overflow-hidden',
        '[mask-image:linear-gradient(to_bottom,#000_calc(100%-5rem),transparent)]',
      ].join(' ')}
    >
      {entries.map(({ event, isNew }) => {
        const seat =
          'playerId' in event ? participants.findIndex((participant) => participant.id === event.playerId) : -1;
        const name = seat === -1 ? 'Someone' : participants[seat].name;
        return (
          <div key={event.revision} className={['shrink-0', isNew ? 'motion-safe:animate-log-in' : ''].join(' ')}>
            <LogItem seat={seat === -1 ? undefined : seat} time={formatTime(event.createdAt)}>
              {describe(event, name)}
            </LogItem>
          </div>
        );
      })}
    </div>
  );
}
