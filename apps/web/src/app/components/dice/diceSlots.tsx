import { useState } from 'react';
import type { DiceRoll } from '@dice-app/contracts';

import Die from './die';
import type { LocalRoll } from '../../types/gameTypes';

type DiceSlotsProps = {
  dice: LocalRoll;
  // -1 = entry finished, no slot active
  activeIndex: number;
  onSlotClick: (index: number) => void;
  // dice of the turn that just ended: they pop off the felt over the new empty slots
  leaving?: DiceRoll | null;
  onLeft?: () => void;
};

// 100cqi minus tray padding (36), slot padding (16) and gaps (40); 6px spare for the active outline
export const SLOT_SIZE = 'clamp(36px, calc((100cqi - 92px) / 5 - 6px), 72px)';
// leaving dice pop one after another, left to right
const LEAVE_STAGGER_MS = 70;

export const ROW = 'flex items-center justify-center gap-2.5 px-2 pt-9 pb-14';

// Five slots on the felt, filled one after another like a one-time-code field.
export default function DiceSlots({ dice, activeIndex, onSlotClick, leaving, onLeft }: DiceSlotsProps) {
  // dice already on the felt when the tray appeared (page load) stay still; only values entered
  // or changed afterwards blow in. Forgotten once the felt is empty (next turn)
  const [initial, setInitial] = useState<LocalRoll | null>(dice);
  if (initial !== null && dice.every((value) => value === null)) setInitial(null);

  return (
    // grid: the row stretches over the whole felt, so the dice sit in its middle
    <div className="relative grid">
      <div role="group" aria-label="Dice for this turn" className={ROW}>
        {dice.map((value, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={index === activeIndex}
            aria-label={`Die ${index + 1}: ${value ?? 'empty'}`}
            onClick={() => onSlotClick(index)}
            className="cursor-pointer rounded-2xl"
          >
            {/* a new value remounts the die, which replays its entrance */}
            <Die
              key={value ?? 'empty'}
              value={value}
              size={SLOT_SIZE}
              held={index === activeIndex}
              className={
                value !== null && (initial === null || value !== initial[index])
                  ? 'animate-bubble-in motion-reduce:animate-none'
                  : ''
              }
            />
          </button>
        ))}
      </div>

      {/* same row, laid over the slots; with reduced motion it is simply not shown */}
      {leaving && (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 motion-reduce:hidden ${ROW}`}>
          {leaving.map((value, index) => (
            <span
              key={index}
              className="grid animate-bubble-out"
              style={{ animationDelay: `${index * LEAVE_STAGGER_MS}ms` }}
              // the last die to pop ends the whole exit
              onAnimationEnd={index === leaving.length - 1 ? onLeft : undefined}
            >
              <Die value={value} size={SLOT_SIZE} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
