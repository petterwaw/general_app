import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { io } from 'socket.io-client';
import type { GameView } from '@dice-app/contracts';
import { resolveApiUrl } from '../api/client';

export default function useGameSocket(
  gameId: string,
  game: GameView | null,
  setGame: Dispatch<SetStateAction<GameView | null>>,
) {
  const revisionRef = useRef(0);

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
  }, [gameId, setGame, seat]);
}
