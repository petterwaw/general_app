import { useEffect, useState } from 'react';

import { CheckIcon, CopyIcon } from '../ui/icons';
import { useErrorToast } from '../ui/toast';

const COPIED_MS = 1800;

// The invite code in the lobby header of an online game, copied on click. Others type it in
// under "Join game" on /games.
export function InviteCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const showError = useErrorToast();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (err) {
      showError(err);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy invite code ${code}`}
      className="flex cursor-pointer items-center gap-2.5 rounded-full bg-primary-soft py-2 pr-3.5 pl-4.5 font-extrabold text-primary transition-colors duration-150 hover:text-primary-hover"
    >
      <span className="tracking-[0.15em] tabular-nums">{code}</span>
      {copied ? <CheckIcon size={16} /> : <CopyIcon />}
      {/* aria-live, so a screen reader hears that the copy worked */}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
