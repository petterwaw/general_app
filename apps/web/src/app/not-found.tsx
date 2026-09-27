import Link from 'next/link';

import { ErrorScreen } from './components/errors/errorScreen';
import { Button } from './components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <ErrorScreen title="Oops, this page rolled off the table">
        <Button render={<Link href="/games" />} nativeButton={false}>
          Go to games
        </Button>
      </ErrorScreen>
    </main>
  );
}
