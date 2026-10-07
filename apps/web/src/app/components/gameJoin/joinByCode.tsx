'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ApiError } from '../../api/client';
import { findGameByInviteCode } from '../../api/games';
import { ErrorScreen } from '../errors/errorScreen';
import { Button } from '../ui/button';

// rate-limited carries the server's message, so the wait it asks for is worded in one place
type Failure = { kind: 'not-found' } | { kind: 'unreachable' } | { kind: 'rate-limited'; message: string };

// Turns an invite code into its game and moves on to the game's page, which shows the lobby to
// join or, once the game is going, the game to watch.
export function JoinByCode({ code }: { code: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    findGameByInviteCode(code)
      .then((game) => {
        if (!cancelled) router.replace(`/games/${game.id}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 400 is a code that cannot exist, 404 one no active game has: the same to the person typing it
        const notFound = err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 400);
        if (err instanceof ApiError && err.statusCode === 429) {
          setFailure({ kind: 'rate-limited', message: err.message });
        } else {
          setFailure({ kind: notFound ? 'not-found' : 'unreachable' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, router, attempt]);

  if (failure?.kind === 'not-found') {
    return (
      <ErrorScreen title="No game with this code. Maybe it has already ended">
        <Button render={<Link href="/games" />} nativeButton={false}>
          Go to games
        </Button>
      </ErrorScreen>
    );
  }

  if (failure) {
    return (
      <ErrorScreen
        title={failure.kind === 'rate-limited' ? failure.message : "Something went wrong. The table isn't answering"}
      >
        <Button
          onClick={() => {
            setFailure(null);
            setAttempt((count) => count + 1);
          }}
        >
          Try again
        </Button>
      </ErrorScreen>
    );
  }

  return null;
}
