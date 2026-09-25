import Die from './die';
import type { DieFace } from '@dice-app/contracts';

type DicePickerProps = {
  disabled: boolean;
  onPick: (value: DieFace) => void;
};

const FACES: DieFace[] = [1, 2, 3, 4, 5, 6];
const PICKER_SIZE = 'clamp(36px, calc((100cqi - 40px) / 6), 64px)';

// Six bare dice under the tray, no button chrome: a tap writes that value into the active slot.
export default function DicePicker({ disabled, onPick }: DicePickerProps) {
  return (
    <div role="group" aria-label="Choose die value" className="flex justify-between gap-2">
      {FACES.map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          aria-label={`Set ${value}`}
          onClick={() => onPick(value)}
          className="group grid cursor-pointer place-items-center rounded-[18px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Die
            value={value}
            size={PICKER_SIZE}
            className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-enabled:group-hover:-translate-y-1 motion-safe:group-enabled:group-hover:-rotate-6 motion-safe:group-enabled:group-active:translate-y-0.5"
          />
        </button>
      ))}
    </div>
  );
}
