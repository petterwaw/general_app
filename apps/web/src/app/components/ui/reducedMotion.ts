// The user asked the system for less motion: animations started from script check this; CSS ones
// use Tailwind's motion-safe: / motion-reduce: instead.
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
