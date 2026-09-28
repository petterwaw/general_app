import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { io } from 'socket.io-client';
import type { GameView } from '@dice-app/contracts';
import { resolveApiUrl } from '../api/client';

// Live updates for an open game (docs/DECYZJE.md §10). The first state still comes over HTTP
// (useGame); the socket then brings every committed action and, after a reconnect, whatever
// was missed while offline.
export default function useGameSocket(
  gameId: string,
  game: GameView | null,
  setGame: Dispatch<SetStateAction<GameView | null>>,
) {
  // The revision on screen. A ref, not the `game` prop: the socket handlers below are created
  // once and would otherwise keep seeing the revision from the render that created them.
  const revisionRef = useRef(0);

  useEffect(() => {
    revisionRef.current = game?.revision ?? 0;
  }, [game]);

  useEffect(() => {
    const socket = io(resolveApiUrl() ?? '', { withCredentials: true });

    socket.on('connect', () => {
      // fires again after every reconnect: the server then sends whatever was missed
      socket.emit('subscribe', { gameId, revision: revisionRef.current })
    });

    socket.on('game', (incoming: GameView) => {
      if (incoming.revision > revisionRef.current) {
        setGame(incoming);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [gameId, setGame]);
}
