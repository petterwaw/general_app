import type { DieFace } from '@dice-app/contracts';

// Pip positions in a 3x3 grid (0 = top-left, 8 = bottom-right).
const PIPS: Record<DieFace, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

type DieProps = {
  // null = empty slot, drawn as a dash on the felt
  value: DieFace | null;
  // any CSS length; slot and picker sizes are computed from the tray column (cqi)
  size?: string;
  held?: boolean;
  // tiny flat die next to an upper category name; decorative, hidden from screen readers
  mini?: boolean;
  className?: string;
};

export default function Die({ value, size = '64px', held = false, mini = false, className = '' }: DieProps) {
  const style = { '--s': mini ? '16px' : size } as React.CSSProperties;

  if (value === null) {
    return (
      <span
        aria-hidden="true"
        style={style}
        className={[
          'grid size-(--s) shrink-0 place-items-center rounded-[calc(var(--s)*.24)]',
          'text-[calc(var(--s)*.4)] font-extrabold text-white/55',
          held
            ? 'bg-secondary/16 inset-ring-2 inset-ring-secondary'
            : 'bg-white/8 inset-ring-2 inset-ring-white/35',
          className,
        ].join(' ')}
      >
        –
      </span>
    );
  }

  const on = PIPS[value];

  return (
    <span
      {...(mini ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Die ${value}` })}
      style={style}
      className={[
        'grid size-(--s) shrink-0 grid-cols-3 grid-rows-3 rounded-[calc(var(--s)*.24)]',
        mini ? 'p-px' : 'bg-die-face p-[calc(var(--s)*.16)] shadow-die',
        held ? 'outline-3 outline-offset-4 outline-secondary' : '',
        className,
      ].join(' ')}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          className={[
            'aspect-square place-self-center rounded-full bg-pip',
            mini ? 'w-[70%]' : 'w-[62%] shadow-[inset_0_2px_2px_rgb(0_0_0/.35)]',
            on.includes(i) ? '' : 'invisible',
          ].join(' ')}
        />
      ))}
    </span>
  );
}
