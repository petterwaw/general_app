'use client';

import { ErrorScreen } from './components/errors/errorScreen';
import { Button } from './components/ui/button';

// Catches what nothing else did while rendering a page; the root layout stays.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <ErrorScreen title="Something went wrong. The dice landed on their edge">
        <Button onClick={() => retry()}>Try again</Button>
      </ErrorScreen>
    </main>
  );
}
