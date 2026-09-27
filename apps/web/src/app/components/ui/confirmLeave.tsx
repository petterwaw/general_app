import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CheckIcon, CloseIcon } from './icons';
import { prefersReducedMotion } from './reducedMotion';
import { ThreeBodySpinner } from './threeBodySpinner';

type ConfirmLeaveProps = {
  // the usual leave button; ask(event) turns it into the question, from where it was clicked
  trigger: (ask: (event: React.MouseEvent) => void) => React.ReactNode;
  onConfirm: () => void;
  // the leave request is on its way: the dark pill keeps a spinner instead of the answers
  loading?: boolean;
  // layout of the slot the button sits in, e.g. flex-1 beside another button
  className?: string;
};

// where the button was clicked, relative to its own box
type Origin = { x: number; y: number };

const OPEN_MS = 320;

const answerButton =
  'grid size-8 cursor-pointer place-items-center rounded-full bg-white/20 transition-colors duration-150 hover:bg-white/35';

// Leaving a game the host runs abandons it for everyone, so the button asks first: it turns the
// app's ink and shows "Leave?" with a tick and a cross. Esc or a click elsewhere drops the
// question.
//
// The question is laid over the button, which stays where it is, so nothing around it moves.
// Where the question fits on the button, the ink spreads from the click point in a circle; where
// the button is narrower (icon only, on phones), it grows to the right while the colour fades
// into ink.
export function ConfirmLeave({ trigger, onConfirm, loading = false, className = '' }: ConfirmLeaveProps) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const asking = origin !== null;
  const open = asking || loading;

  function ask(event: React.MouseEvent) {
    // the clicked button fills the slot, so its box is the slot's
    const slot = event.currentTarget.getBoundingClientRect();
    // a keyboard press has no pointer position: spread from the middle
    const fromPointer = event.clientX !== 0 || event.clientY !== 0;
    setOrigin(
      fromPointer
        ? { x: event.clientX - slot.left, y: event.clientY - slot.top }
        : { x: slot.width / 2, y: slot.height / 2 },
    );
  }

  // the opening animation, measured against the button it covers
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const slot = slotRef.current;
    if (!origin || !pill || !slot || prefersReducedMotion()) return;

    const from = slot.getBoundingClientRect();
    const to = pill.getBoundingClientRect();
    const button = slot.querySelector('button');
    const buttonColor = button ? getComputedStyle(button).backgroundColor : 'transparent';

    if (to.width > from.width + 1) {
      // grows to the right out of the button, in the button's colour turning ink
      pill.animate(
        [
          { clipPath: `inset(0 ${to.width - from.width}px 0 0 round 9999px)`, backgroundColor: buttonColor },
          { clipPath: 'inset(0 0 0 0 round 9999px)' },
        ],
        { duration: OPEN_MS, easing: 'cubic-bezier(0.3, 0.9, 0.35, 1)' },
      );
    } else {
      // a circle of ink from the click point, big enough to reach the farthest corner
      const radius = Math.hypot(
        Math.max(origin.x, to.width - origin.x),
        Math.max(origin.y, to.height - origin.y),
      );
      pill.animate(
        [
          { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
          { clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` },
        ],
        { duration: OPEN_MS, easing: 'ease-out' },
      );
    }
    // the words come in once there is ink under them
    for (const child of pill.children) {
      child.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS / 2,
        delay: OPEN_MS / 2,
        fill: 'backwards',
      });
    }
  }, [origin]);

  useEffect(() => {
    if (!asking || loading) return;
    // the safe answer takes the focus, so an Enter pressed out of habit does not leave
    stayRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOrigin(null);
    }
    function onPointer(event: PointerEvent) {
      if (!slotRef.current?.contains(event.target as Node)) setOrigin(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [asking, loading]);

  return (
    <div ref={slotRef} className={['relative grid', className].join(' ')}>
      {/* stays visible under the question: the circle of ink spreads over it */}
      <div className="grid" inert={open}>
        {trigger(ask)}
      </div>

      {open && (
        <div
          ref={pillRef}
          role="group"
          aria-label="Leave the game?"
          aria-busy={loading || undefined}
          className="absolute inset-y-0 left-0 z-10 flex min-w-full items-center justify-between gap-2 rounded-full bg-ink pr-1.5 pl-4 font-bold whitespace-nowrap text-white"
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
                  onClick={() => setOrigin(null)}
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
