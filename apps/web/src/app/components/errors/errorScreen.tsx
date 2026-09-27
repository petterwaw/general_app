'use client';

import { sad, scared, sick, sleepy } from 'blobatar/expression';

import Avatar from '../players/avatar';

// Named here, not passed in: an expression carries functions, and a server page cannot hand
// functions to a client component.
const MOODS = { sad, scared, sick, sleepy };

// One mascot on every error screen; only its mood changes.
const MASCOT = {
  seed: 'greta',
  seat: 5,
  traits: { tone: [0.1, 0.865, 0.965] },
};

type ErrorScreenProps = {
  // leave out to keep the eyes the seed gives
  mood?: keyof typeof MOODS;
  title: string;
  // what to do next: a way out, or a retry
  children: React.ReactNode;
};

// Shared look of the error screens: a large avatar straight on the backdrop, what went wrong
// under it, then the actions. flex-1 rather than a screen height: it fills whatever frame it
// lands in, the bare page body or the game screen's padded frame.
export function ErrorScreen({ mood, title, children }: ErrorScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-[480px] justify-items-center gap-6 text-center motion-safe:animate-rise">
        <Avatar {...MASCOT} size={180} expression={mood && MOODS[mood]} />

        <h1 className="text-2xl font-extrabold">{title}</h1>

        <div className="flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}
