import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { io } from 'socket.io-client';
import type { GameEventView, GameView } from '@dice-app/contracts';
import { resolveApiUrl } from '../api/client';

export type GameLogEntry = {
  event: GameEventView;
  // arrived after the screen opened; only these play the entry animation
  isNew: boolean;
};

// Keeps the game live and returns its public game log (docs/DECYZJE.md §13), newest first.
export default function useGameSocket(
  gameId: string,
  game: GameView | null,
  setGame: Dispatch<SetStateAction<GameView | null>>,
) {
  const revisionRef = useRef(0);
  const [log, setLog] = useState<GameLogEntry[]>([]);
  // revision of the newest log entry held; null until the first entries arrive
  const logRevisionRef = useRef<number | null>(null);

  useEffect(() => {
    revisionRef.current = game?.revision ?? 0;
  }, [game]);

  // The server puts a socket in the room of whoever the device is when it subscribes, and never
  // moves it. So the socket opens once the game is known, and opens again when the device joins
  // the game or stops playing in it.
  const seat = game ? (game.myParticipantId ?? 'watching') : null;

  useEffect(() => {
    if (seat === null) return;
    const socket = io(resolveApiUrl() ?? '', { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('subscribe', {
        gameId,
        revision: revisionRef.current,
        eventsAfter: logRevisionRef.current ?? 0,
      });
    });

    socket.on('game', (incoming: GameView) => {
      if (incoming.revision > revisionRef.current) {
        setGame(incoming);
      }
    });

    // A reconnect can bring entries the broadcast already delivered, in either order, so
    // duplicates are dropped by revision rather than by the newest revision held.
    socket.on('events', (incoming: GameEventView[]) => {
      if (incoming.length === 0) return;
      const isFirst = logRevisionRef.current === null;

      setLog((current) => {
        const held = new Set(current.map((entry) => entry.event.revision));
        const added = incoming
          .filter((event) => !held.has(event.revision))
          .map((event) => ({ event, isNew: !isFirst }));
        return [...added, ...current].sort((a, b) => b.event.revision - a.event.revision);
      });

      logRevisionRef.current = Math.max(
        logRevisionRef.current ?? 0,
        ...incoming.map((event) => event.revision),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [gameId, setGame, seat]);

  return log;
}
