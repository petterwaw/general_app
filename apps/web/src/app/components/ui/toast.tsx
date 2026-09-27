'use client';

import { Toast } from '@base-ui/react/toast';

import { ApiError } from '../../api/client';
import { CloseIcon } from './icons';

// How long a toast stays before it goes by itself.
const TOAST_TIMEOUT = 5000;

// Wraps the app once (root layout): toasts pop up at the top, in the middle of the screen.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={TOAST_TIMEOUT}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="up"
      className={[
        // the same dark pill as the "Coming soon" bubble; no border or shadow
        'flex max-w-[480px] items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-white',
        // Tailwind v4 moves with the `translate` property, not `transform`: both must transition
        'transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none',
        'data-starting-style:-translate-y-3 data-starting-style:opacity-0',
        'data-ending-style:-translate-y-3 data-ending-style:opacity-0',
      ].join(' ')}
    >
      <Toast.Description className="text-sm font-bold" />
      <Toast.Close
        aria-label="Close"
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
      >
        <CloseIcon size={16} />
      </Toast.Close>
    </Toast.Root>
  ));
}

// Tells the person that something they clicked did not go through.
export function useErrorToast() {
  const { add } = Toast.useToastManager();

  return (err: unknown) =>
    add({
      // the server's own message when it answered; otherwise the request never got through
      // (network down, API off), and the browser's "Failed to fetch" means nothing to a player
      description: err instanceof ApiError ? err.message : "Couldn't reach the table. Try again.",
      // read out right away by screen readers: the action they just took failed
      priority: 'high',
    });
}
