'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameEventView } from '@dice-app/contracts';

import { getGameEvents } from '../api/games';

export type GameLogEntry = {
  event: GameEventView;
  // arrived after the screen opened; only these play the entry animation
  isNew: boolean;
};

// The public game log (docs/DECYZJE.md §13), newest first. Every new revision fetches only the
// events after the last one already held (?after=).
export default function useGameLog(gameId: string, revision: number) {
  const [entries, setEntries] = useState<GameLogEntry[]>([]);
  // revision of the newest event held; null until the first fetch comes back
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    const after = lastRef.current;
    if (after !== null && after >= revision) return;
    let cancelled = false;

    getGameEvents(gameId, after ?? undefined)
      .then((events) => {
        // a newer revision started its own fetch from the same point, so it gets these too
        if (cancelled) return;
        const fresh = events.filter((event) => after === null || event.revision > after);
        if (fresh.length === 0) return;
        lastRef.current = Math.max(...fresh.map((event) => event.revision));
        const added = fresh
          .map((event) => ({ event, isNew: after !== null }))
          .sort((a, b) => b.event.revision - a.event.revision);
        setEntries((current) => [...added, ...current]);
      })
      // the log is secondary: a failed fetch is retried with the next revision
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [gameId, revision]);

  return entries;
}
