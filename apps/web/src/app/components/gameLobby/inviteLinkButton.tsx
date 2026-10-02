import { useEffect, useState } from 'react';

import { useErrorToast } from '../ui/toast';

const COPIED_MS = 1800;

// A quiet text action in the lobby header of an online game: the link to this game, which
// anyone opens to watch the lobby and join it.
export function InviteLinkButton({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false);
  const showError = useErrorToast();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/games/${gameId}`);
      setCopied(true);
    } catch (err) {
      showError(err);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="cursor-pointer rounded-full px-2 py-1 font-bold text-primary transition-colors duration-150 hover:text-primary-hover"
    >
      {/* aria-live, so a screen reader hears that the copy worked */}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy invite link'}</span>
    </button>
  );
}
