import Die from './die';
import type { LocalRoll } from '../../types/gameTypes';

type DiceSlotsProps = {
  dice: LocalRoll;
  // -1 = entry finished, no slot active
  activeIndex: number;
  onSlotClick: (index: number) => void;
};

// 100cqi minus tray padding (36), slot padding (16) and gaps (40); 6px spare for the active outline
const SLOT_SIZE = 'clamp(36px, calc((100cqi - 92px) / 5 - 6px), 72px)';

// Five slots on the felt, filled one after another like a one-time-code field.
export default function DiceSlots({ dice, activeIndex, onSlotClick }: DiceSlotsProps) {
  return (
    <div
      role="group"
      aria-label="Dice for this turn"
      className="flex items-center justify-center gap-2.5 px-2 pt-9 pb-14"
    >
      {dice.map((value, index) => (
        <button
          key={index}
          type="button"
          aria-pressed={index === activeIndex}
          aria-label={`Die ${index + 1}: ${value ?? 'empty'}`}
          onClick={() => onSlotClick(index)}
          className="cursor-pointer rounded-2xl"
        >
          <Die value={value} size={SLOT_SIZE} held={index === activeIndex} />
        </button>
      ))}
    </div>
  );
}
