// Medal for places 1-3 on the final scores: a ribbon and a disc with the place on it. Flat, like the
// rest of the app: no shadow, no outline.
const DISC: Record<1 | 2 | 3, string> = {
  1: 'fill-medal-gold',
  2: 'fill-medal-silver',
  3: 'fill-medal-bronze',
};

export default function Medal({ place }: { place: 1 | 2 | 3 }) {
  return (
    <svg width="32" height="36" viewBox="0 0 32 36" role="img" aria-label={`Place ${place}`}>
      <path d="M8 0h7l4 12h-7z" className="fill-primary" />
      <path d="M24 0h-7l-4 12h7z" className="fill-secondary" />
      <circle cx="16" cy="23" r="12" className={DISC[place]} />
      <text
        x="16"
        y="23"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-[13px] font-extrabold"
      >
        {place}
      </text>
    </svg>
  );
}
