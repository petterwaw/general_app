'use client';

import { ErrorScreen } from './components/errors/errorScreen';
import { Button } from './components/ui/button';
import { nunito } from './fonts';
import './globals.css';

// Last resort, for an error in the root layout itself: it replaces the layout, so it brings its
// own document, styles and font.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <title>Something went wrong</title>
        <main className="flex min-h-dvh flex-col">
          <ErrorScreen mood="sick" title="Something went wrong. Even the dice gave up">
            <Button onClick={() => retry()}>Try again</Button>
          </ErrorScreen>
        </main>
      </body>
    </html>
  );
}
