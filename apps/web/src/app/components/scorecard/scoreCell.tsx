import { CheckIcon } from '../ui/icons';

// Every look a scorecard cell can have (docs/DESIGN.md, "Komórki tabeli").
// Suggested points are display only — the server always recomputes the score.
export type ScoreCellState =
  | { kind: 'scored'; value: number }
  | { kind: 'zero' }
  | { kind: 'open' }
  | { kind: 'locked' }
  | { kind: 'hint'; points: number; onSelect: () => void }
  | { kind: 'selected'; points: number; onSave: () => void };

type ScoreCellProps = {
  state: ScoreCellState;
  // current player's column
  isActive: boolean;
  // used in aria labels of the hint and the tick
  categoryLabel: string;
  // the last column has no room on its right: the table's scroller would cut the tick off
  tickOnLeft?: boolean;
};

const base = 'px-2 py-[3px] text-center tabular-nums';
// the suggested-points box; identical in the hint and selected states. The negative margin
// cancels the vertical padding, so the pill is no taller than a plain "–": showing hints after
// Confirm must not grow the rows
const pill = 'inline-block rounded-lg px-2.5 py-0.5 -my-0.5 font-extrabold inset-ring-2 inset-ring-primary';

export default function ScoreCell({ state, isActive, categoryLabel, tickOnLeft = false }: ScoreCellProps) {
  const fill = isActive ? 'bg-primary-soft' : 'bg-white/55';

  switch (state.kind) {
    case 'scored':
      return <td className={`${base} ${fill}`}>{state.value}</td>;

    case 'zero':
      return <td className={`${base} ${fill} font-bold text-danger`}>0</td>;

    case 'open':
      return (
        <td className={`${base} ${fill} text-ink-faint`}>
          <span aria-hidden="true">–</span>
          <span className="sr-only">Open</span>
        </td>
      );

    case 'locked':
      return (
        <td title="Lower section locked" className={`${base} bg-locked-stripes text-ink-faint`}>
          <span aria-hidden="true">–</span>
          <span className="sr-only">Locked</span>
        </td>
      );

    case 'hint':
      return (
        <td className={`${base} ${fill}`}>
          <button
            type="button"
            onClick={state.onSelect}
            aria-label={`${categoryLabel}: ${state.points} points`}
            className={`${pill} cursor-pointer bg-white text-primary`}
          >
            {state.points}
          </button>
        </td>
      );

    case 'selected':
      return (
        <td className={`${base} ${fill}`}>
          {/* same box as the hint, and the tick is positioned out of flow: selecting must not
              change the cell's width, or the number and the neighbouring columns jump */}
          <span className="relative inline-block">
            <span className={`${pill} bg-primary text-primary-ink`}>{state.points}</span>
            {/* the hint button unmounts on select; without this, keyboard focus would fall to <body>.
                After a mouse click the browser shows no focus ring, so this only shows for keyboard users */}
            <button
              type="button"
              autoFocus
              onClick={state.onSave}
              aria-label={`Save ${state.points} in ${categoryLabel}`}
              className={[
                'absolute top-1/2 z-10 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-good text-white',
                tickOnLeft ? 'right-full mr-1' : 'left-full ml-1',
              ].join(' ')}
            >
              <CheckIcon />
            </button>
          </span>
        </td>
      );
  }
}
