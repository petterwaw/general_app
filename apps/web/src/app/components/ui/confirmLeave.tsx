import { useEffect, useRef, useState } from 'react';

import { CheckIcon, CloseIcon } from './icons';
import { ThreeBodySpinner } from './threeBodySpinner';

type ConfirmLeaveProps = {
  // the usual leave button; calling ask() turns it into the question
  trigger: (ask: () => void) => React.ReactNode;
  onConfirm: () => void;
  // the leave request is on its way: the dark pill keeps a spinner instead of the answers
  loading?: boolean;
  // layout of the slot the button sits in, e.g. flex-1 beside another button
  className?: string;
};

const answerButton =
  'grid size-8 cursor-pointer place-items-center rounded-full bg-white/20 transition-colors duration-150 hover:bg-white/35';

// Leaving a game the host runs abandons it for everyone, so the button asks first: it darkens to
// the app's ink and shows "Leave?" with a tick and a cross. Esc or a click elsewhere drops the
// question.
export function ConfirmLeave({ trigger, onConfirm, loading = false, className = '' }: ConfirmLeaveProps) {
  const [asking, setAsking] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!asking || loading) return;
    // the safe answer takes the focus, so an Enter pressed out of habit does not leave
    stayRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setAsking(false);
    }
    function onPointer(event: PointerEvent) {
      if (!slotRef.current?.contains(event.target as Node)) setAsking(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [asking, loading]);

  const open = asking || loading;

  return (
    // The usual button stays in the layout, only hidden, and the question is laid over it: the
    // slot keeps its size, so nothing around it moves. The question starts at the button's left
    // edge and may reach past its right one (the icon-only button on phones is narrower).
    <div ref={slotRef} className={['relative grid', className].join(' ')}>
      <div className={['grid', open ? 'invisible' : ''].join(' ')}>
        {trigger(() => setAsking(true))}
      </div>

      {open && (
        <div
          role="group"
          aria-label="Leave the game?"
          aria-busy={loading || undefined}
          className="absolute inset-y-0 left-0 z-10 flex min-w-full items-center justify-between gap-2 rounded-full bg-ink pr-1.5 pl-4 font-bold whitespace-nowrap text-white motion-safe:animate-rise"
        >
          {loading ? (
            <span className="relative grid flex-1 place-items-center">
              {/* the question stays, hidden, so the pill keeps its size */}
              <span className="invisible">Leave?</span>
              <ThreeBodySpinner className="absolute" />
            </span>
          ) : (
            <>
              <span>Leave?</span>
              <span className="flex gap-1">
                <button type="button" aria-label="Yes, leave" onClick={onConfirm} className={answerButton}>
                  <CheckIcon />
                </button>
                <button
                  ref={stayRef}
                  type="button"
                  aria-label="No, stay"
                  onClick={() => setAsking(false)}
                  className={answerButton}
                >
                  <CloseIcon />
                </button>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
