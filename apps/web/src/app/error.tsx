'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { ErrorScreen } from './components/errors/errorScreen';
import { Button } from './components/ui/button';

// Catches what nothing else did while rendering a page; the root layout stays.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // The boundary handles the error, so Sentry would not see it on its own.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col">
      <ErrorScreen title="Something went wrong. The dice landed on their edge">
        <Button onClick={() => retry()}>Try again</Button>
      </ErrorScreen>
    </main>
  );
}
