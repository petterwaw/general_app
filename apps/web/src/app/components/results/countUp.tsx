import { useEffect, useEffectEvent, useRef } from 'react';

import { prefersReducedMotion } from '../ui/reducedMotion';

type CountUpProps = {
  to: number;
  // holds at 0 this long before counting
  delayMs?: number;
  durationMs?: number;
  onEnd?: () => void;
};

// Exponential ease-out: races through most of the count, then crawls over the last few points.
function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// A number counting up from 0 (after React Bits' Count Up, without the motion library). Writes
// the text directly each frame instead of re-rendering React 60 times a second.
export default function CountUp({ to, delayMs = 400, durationMs = 2200, onEnd }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // the latest callback without restarting the count when the parent re-renders
  const end = useEffectEvent(() => onEnd?.());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (prefersReducedMotion()) {
      element.textContent = String(to);
      end();
      return;
    }

    element.textContent = '0';
    let frame = 0;
    let start: number | null = null;

    function tick(now: number) {
      if (!element) return;
      start ??= now;
      const t = (now - start - delayMs) / durationMs;
      element.textContent = String(Math.round(to * easeOutExpo(Math.max(0, t))));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        end();
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delayMs, durationMs]);

  // the final value for screen readers from the start; the counting is visual only
  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        0
      </span>
      <span className="sr-only">{to}</span>
    </>
  );
}
