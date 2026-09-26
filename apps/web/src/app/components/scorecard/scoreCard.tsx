'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Category, DiceRoll, ParticipantView, ScoreCard as Card } from '@dice-app/contracts';
import {
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  dispatchPoints,
  isForcedZero,
  isLowerSectionCategory,
  isLowerSectionUnlocked,
  upperSectionSum,
} from '@dice-app/game-core';

import Avatar from '../players/avatar';
import Die from '../dice/die';
import ScoreCell, { type ScoreCellState } from './scoreCell';
import { CHANCE_ROW, LOWER_ROWS, UPPER_ROWS } from './categories';

type ScoreCardProps = {
  participants: ParticipantView[];
  currentPlayerId: string | null;
  // dice confirmed for this turn; suggestions show only once they are known to the server
  turnDice: DiceRoll | null;
  selected: Category | null;
  // null = drop the selection (Esc or a click anywhere else)
  onSelect: (category: Category | null) => void;
  onSave: (category: Category) => void;
  // natural width of the category-name column, needed by the screen to pick its layout
  onLabelWidth?: (width: number) => void;
};

// every player column gets at least this much; below it the table scrolls sideways
export const MIN_PLAYER_COL = 60;
// horizontal padding of a label cell (px-2 on both sides)
const LABEL_PAD = 16;

const cellBase = 'px-2 py-[3px]';
const labelCell = `${cellBase} sticky left-0 z-1 rounded-l-[10px] text-left shadow-[inset_-1px_0_0_var(--color-hairline)]`;
const rowBase = '[&>td:last-child]:rounded-r-[10px]';
// The table's outer corners follow the card's: card radius (28px) minus its padding (12px),
// so both curves share a centre. Scoped selectors outrank the per-row 10px rounding.
const headCorners = '[&>tr>th:first-child]:rounded-tl-2xl [&>tr>th:last-child]:rounded-tr-2xl';
const bodyCorners =
  '[&>tr:last-child>td:first-child]:rounded-bl-2xl [&>tr:last-child>td:last-child]:rounded-br-2xl';

// Suggestions are display only (docs/DECYZJE.md §4): the server recomputes every score.
function cellState(
  category: Category,
  card: Card,
  isCurrent: boolean,
  turnDice: DiceRoll | null,
  selected: Category | null,
  onSelect: (category: Category) => void,
  onSave: (category: Category) => void,
): ScoreCellState {
  const value = card[category];
  if (value !== null) return value === 0 ? { kind: 'zero' } : { kind: 'scored', value };

  const locked = isLowerSectionCategory(category) && !isLowerSectionUnlocked(card);

  // a locked lower category is still open for the forced zero (docs/ZASADY-GRY.md)
  if (isCurrent && turnDice && (!locked || isForcedZero(turnDice, card))) {
    const points = locked ? 0 : dispatchPoints(category, turnDice);
    return category === selected
      ? { kind: 'selected', points, onSave: () => onSave(category) }
      : { kind: 'hint', points, onSelect: () => onSelect(category) };
  }

  return locked ? { kind: 'locked' } : { kind: 'open' };
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <td colSpan={span} className="px-2 pt-1.5 text-[.82rem] font-bold text-ink-muted">
        {/* the row spans the scrolling columns; only its text stays in view */}
        <span className="sticky left-2">{label}</span>
      </td>
    </tr>
  );
}

export default function ScoreCard({
  participants,
  currentPlayerId,
  turnDice,
  selected,
  onSelect,
  onSave,
  onLabelWidth,
}: ScoreCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [sizes, setSizes] = useState<{ label: number; col: number } | null>(null);
  const count = participants.length;

  // Player columns share the width when everyone fits; otherwise they are sized so that 3.5 or
  // more players are in view — the half column tells people the table scrolls sideways.
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const table = tableRef.current;
    if (!box || !table) return;
    let active = true;

    function measure() {
      if (!active || !box || !table) return;
      const labels = table.querySelectorAll<HTMLElement>('[data-row-label]');
      const label = Math.ceil(Math.max(0, ...Array.from(labels, (el) => el.offsetWidth))) + LABEL_PAD;
      const avail = box.clientWidth - label;
      const inView = Math.max(3, Math.floor(avail / MIN_PLAYER_COL - 0.5));
      const scrolls = avail < count * MIN_PLAYER_COL && inView < count;

      setSizes({ label, col: scrolls ? avail / (inView + 0.5) : avail / count });
      if (!scrolls) box.scrollLeft = 0;
      onLabelWidth?.(label);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    // the label width changes once Nunito has loaded
    document.fonts.ready.then(measure);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [count, onLabelWidth]);

  // The wheel moves the players sideways: the rows rarely need it, the scrollbar is there for that.
  // At either end the wheel goes on to the page, so the stacked layout still scrolls.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    function onWheel(event: WheelEvent) {
      if (!box || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = box.scrollWidth - box.clientWidth;
      const canMove = event.deltaY > 0 ? box.scrollLeft < max - 1 : box.scrollLeft > 0;
      if (!canMove) return;
      event.preventDefault();
      box.scrollLeft += event.deltaY;
    }

    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  // When the players do not all fit, the turn's player slides in as the first column after the
  // labels (the browser stops at the end, so the last ones just come into view).
  const seatOfCurrent = participants.findIndex((participant) => participant.id === currentPlayerId);
  const alignedRef = useRef(false);
  useEffect(() => {
    const box = scrollRef.current;
    // nothing to align while every player fits (also on the first measurements, before fonts load)
    if (!box || !sizes || seatOfCurrent === -1 || box.scrollWidth <= box.clientWidth) return;
    // the first time the screen opens it jumps there without the animation
    const smooth = alignedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alignedRef.current = true;
    box.scrollTo({ left: seatOfCurrent * sizes.col, behavior: smooth ? 'smooth' : 'auto' });
  }, [seatOfCurrent, sizes]);

  // Esc or a click anywhere but a scorecard button drops the selection without saving
  useEffect(() => {
    if (!selected) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onSelect(null);
    }
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('button') && tableRef.current?.contains(target)) return;
      onSelect(null);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [selected, onSelect]);

  function cells(category: Category, label: string) {
    return participants.map((participant, seat) => {
      const isCurrent = participant.id === currentPlayerId;
      return (
        <ScoreCell
          key={participant.id}
          categoryLabel={label}
          isActive={isCurrent}
          tickOnLeft={seat === count - 1}
          state={cellState(category, participant.scoreCard, isCurrent, turnDice, selected, onSelect, onSave)}
        />
      );
    });
  }

  function lowerRow(category: Category, label: string) {
    return (
      <tr key={category} className={rowBase}>
        <td className={`${labelCell} bg-surface-solid`}>
          <span data-row-label className="inline-flex whitespace-nowrap">
            {label}
          </span>
        </td>
        {cells(category, label)}
      </tr>
    );
  }

  return (
    // relative: the screen-reader labels in the cells are absolutely positioned; without a
    // positioned box here they hang off the page, not this scroller, and widen it sideways
    <div
      ref={scrollRef}
      // the sideways scrollbar starts where the player columns do
      style={{ '--scrollbar-inset': `${sizes?.label ?? 0}px` } as React.CSSProperties}
      className="scrollbar-soft relative overflow-x-auto"
    >
      <table
        ref={tableRef}
        style={sizes ? { tableLayout: 'fixed', width: sizes.label + count * sizes.col } : undefined}
        className="h-full w-full border-separate border-spacing-y-0.5 text-[.92rem] leading-[1.25]"
      >
        <colgroup>
          <col style={sizes ? { width: sizes.label } : undefined} />
          {participants.map((participant) => (
            <col key={participant.id} style={sizes ? { width: sizes.col } : undefined} />
          ))}
        </colgroup>

        <thead className={headCorners}>
          <tr>
            {/* empty corner: opaque so scrolled headers slide under it, in the card colour so it does not show */}
            <th className="sticky left-0 z-1 bg-surface-flat" />
            {participants.map((participant, seat) => (
              <th
                key={participant.id}
                className={[
                  'rounded-t-[10px] px-2 py-[3px] align-bottom text-[.88rem] font-bold',
                  participant.id === currentPlayerId ? 'bg-primary-soft' : '',
                ].join(' ')}
              >
                {/* avatars only: names do not fit narrow columns; the players panel has them */}
                <span title={participant.name} className="flex justify-center">
                  <Avatar seed={participant.name} seat={seat} size={34} />
                  <span className="sr-only">{participant.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className={bodyCorners}>
          <SectionRow label="Upper section" span={count + 1} />
          {UPPER_ROWS.map(({ category, label, face }) => (
            <tr key={category} className={rowBase}>
              <td className={`${labelCell} bg-surface-solid`}>
                <span data-row-label className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Die value={face} mini />
                  {label}
                </span>
              </td>
              {cells(category, label)}
            </tr>
          ))}

          {/* bonus progress is public during play; only the total stays hidden */}
          <tr className={`${rowBase} font-extrabold`}>
            <td className={`${labelCell} bg-surface-sunken`}>
              <span data-row-label className="whitespace-nowrap">
                Bonus <span className="text-[.8rem] font-semibold text-ink-muted">({UPPER_BONUS_THRESHOLD}+)</span>
              </span>
            </td>
            {participants.map((participant) => {
              const sum = upperSectionSum(participant.scoreCard);
              return (
                <td
                  key={participant.id}
                  className={[
                    cellBase,
                    'text-center tabular-nums',
                    participant.id === currentPlayerId ? 'bg-primary-soft' : 'bg-surface-sunken',
                  ].join(' ')}
                >
                  {sum >= UPPER_BONUS_THRESHOLD ? (
                    <span className="text-good">+{UPPER_BONUS_VALUE}</span>
                  ) : (
                    <span className="text-[.8rem] font-semibold text-ink-muted">
                      {sum}/{UPPER_BONUS_THRESHOLD}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>

          <SectionRow label="Lower section" span={count + 1} />
          {LOWER_ROWS.map(({ category, label }) => lowerRow(category, label))}

          {/* Chance is never locked: set apart at the bottom by a small gap, no heading */}
          <tr aria-hidden="true">
            <td colSpan={count + 1} className="h-2 p-0" />
          </tr>
          {lowerRow(CHANCE_ROW.category, CHANCE_ROW.label)}
        </tbody>
      </table>
    </div>
  );
}
