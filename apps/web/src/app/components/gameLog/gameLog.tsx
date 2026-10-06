import { useLayoutEffect, useRef } from 'react';
import type { Category, GameEventView, ParticipantView } from '@dice-app/contracts';

import LogItem from './logItem';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { CHANCE_ROW, LOWER_ROWS, UPPER_ROWS } from '../scorecard/categories';
import type { GameLogEntry } from '../../hooks/useGameSocket';

type GameLogProps = {
  entries: GameLogEntry[];
  participants: ParticipantView[];
};

// older entries slide down this long when new ones arrive on top
const LOG_MOVE_MS = 500;

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
    case 'diceRolled':
      const diceHeld = event.dice.filter((_,index) => event.held.includes(index))
      return (
        <>
          {name} rolled{' '}
          <span className="font-bold tabular-nums">
            {event.dice.join(' ')}{' '}
          </span>
          {diceHeld.length > 0 && 'held:'}
          <span className="font-bold tabular-nums"> 
            {diceHeld.length > 0 && ` ${diceHeld.join(' ')}`}
          </span>
        </>
      ); 
    case 'playerLeft':
      return (
        <>
          <span className="font-bold tabular-nums">{name}</span> left the game
        </>
      );
    default: {
      const unhandled: never = event;
      return unhandled;
    }
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
export default function GameLog({ entries, participants }: GameLogProps) {
  const items = useRef(new Map<number, HTMLDivElement>());
  const lastTops = useRef(new Map<number, number>());

  // FLIP: the new entries take their room at once, and every older entry is drawn back where it
  // was and slides down from there with a transform only.
  useLayoutEffect(() => {
    const tops = new Map<number, number>();
    items.current.forEach((element, revision) => tops.set(revision, element.offsetTop));

    if (!prefersReducedMotion()) {
      items.current.forEach((element, revision) => {
        const before = lastTops.current.get(revision);
        const after = tops.get(revision);
        if (before === undefined || after === undefined || before === after) return;
        element.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'translateY(0)' }], {
          duration: LOG_MOVE_MS,
          easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
        });
      });
    }
    lastTops.current = tops;
  }, [entries]);

  return (
    <div
      aria-label="Game log"
      className={[
        // mt-auto: capped at half the screen, the log sits on the bottom edge; the free space goes above it
        'relative mt-auto flex min-h-[30vh] max-h-[50vh] flex-1 flex-col gap-2 overflow-hidden',
        '[mask-image:linear-gradient(to_bottom,#000_calc(100%-5rem),transparent)]',
      ].join(' ')}
    >
      {entries.map(({ event, isNew }) => {
        const seat =
          'playerId' in event ? participants.findIndex((participant) => participant.id === event.playerId) : -1;
        const name = seat === -1 ? 'Someone' : participants[seat].name;
        return (
          <div
            key={event.revision}
            ref={(element) => {
              if (!element) return;
              items.current.set(event.revision, element);
              return () => {
                items.current.delete(event.revision);
              };
            }}
            className={['shrink-0', isNew ? 'motion-safe:animate-log-in' : ''].join(' ')}
          >
            <LogItem seat={seat === -1 ? undefined : seat} time={formatTime(event.createdAt)}>
              {describe(event, name)}
            </LogItem>
          </div>
        );
      })}
    </div>
  );
}
