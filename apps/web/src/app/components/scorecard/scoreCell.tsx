import { useState } from 'react';

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
  // the column of a player who left the game
  dimmed?: boolean;
};

const base = 'px-2 py-[3px] text-center tabular-nums';
export const DIMMED = 'opacity-40';
// the suggested-points box; identical in the hint and selected states. The negative margin
// cancels the vertical padding, so the pill is no taller than a plain "–": showing hints after
// Confirm must not grow the rows
const pill = 'inline-block rounded-lg px-2.5 py-0.5 -my-0.5 font-extrabold inset-ring-2 inset-ring-primary';

// a cell just saved with the tick: the number blows in like a die and the cell flashes green
const justSavedCell = 'motion-safe:animate-saved-flash';
const justSavedValue = 'inline-block motion-safe:animate-bubble-in';

export default function ScoreCell({
  state,
  isActive,
  categoryLabel,
  tickOnLeft = false,
  dimmed = false,
}: ScoreCellProps) {
  const dim = dimmed ? DIMMED : '';
  const fill = `${isActive ? 'bg-primary-soft' : 'bg-white/55'} ${dim}`;
  // selected -> scored means the tick was just used (not a page load, not another player's cell)
  const [lastKind, setLastKind] = useState(state.kind);
  const [justSaved, setJustSaved] = useState(false);
  if (state.kind !== lastKind) {
    setLastKind(state.kind);
    setJustSaved(lastKind === 'selected' && (state.kind === 'scored' || state.kind === 'zero'));
  }

  switch (state.kind) {
    case 'scored':
      return (
        <td className={`${base} ${fill} ${justSaved ? justSavedCell : ''}`}>
          <span className={justSaved ? justSavedValue : ''}>{state.value}</span>
        </td>
      );

    case 'zero':
      return (
        <td className={`${base} ${fill} font-bold text-danger ${justSaved ? justSavedCell : ''}`}>
          <span className={justSaved ? justSavedValue : ''}>0</span>
        </td>
      );

    case 'open':
      return (
        <td className={`${base} ${fill} text-ink-faint`}>
          <span aria-hidden="true">–</span>
          <span className="sr-only">Open</span>
        </td>
      );

    case 'locked':
      return (
        <td title="Lower section locked" className={`${base} bg-locked-stripes text-ink-faint ${dim}`}>
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
                // pops out on select like a die; pressed in under the finger on click
                'motion-safe:animate-bubble-in transition-[scale] duration-100 active:scale-80',
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
