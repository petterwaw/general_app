import type { DiceRoll } from '@dice-app/contracts';

import DiceTray from './diceTray';
import Die from './die';
import { ROW, SLOT_SIZE } from './diceSlots';
import { Button } from '../ui/button';

const ROLLS_PER_TURN = 3;

type VirtualDiceProps = {
  // the dice on the table, as the server rolled them; null before the game has a turn
  dice: DiceRoll | null;
  // positions marked to stay for the next roll, on this device only
  held: number[];
  rollNumber: number | null;
  // it is this device's turn: dice can be held and rerolled
  playing: boolean;
  canReroll: boolean;
  pending: boolean;
  onToggle: (index: number) => void;
  onReroll: () => void;
  // sits on the tray's bottom edge, e.g. <TurnPill />
  trayFooter?: React.ReactNode;
};

// Virtual dice rolled by the server (docs/DESIGN.md): the player whose turn it is clicks dice to
// hold them and rerolls the rest; everyone else sees the same table.
// Must be rendered inside an @container: the dice are sized from the column width.
export default function VirtualDice({
  dice,
  held,
  rollNumber,
  playing,
  canReroll,
  pending,
  onToggle,
  onReroll,
  trayFooter,
}: VirtualDiceProps) {
  return (
    <>
      <DiceTray footer={trayFooter}>
        <div role="group" aria-label="Dice on the table" className={ROW}>
          {dice?.map((value, index) => {
            const isHeld = held.includes(index);
            return (
              <button
                key={index}
                type="button"
                aria-pressed={isHeld}
                aria-label={`Die ${index + 1}: ${value}${isHeld ? ', held' : ''}`}
                disabled={!playing || pending}
                onClick={() => onToggle(index)}
                className="cursor-pointer rounded-2xl disabled:cursor-default"
              >
                {/* a new value remounts the die, which replays its entrance */}
                <Die
                  key={value}
                  value={value}
                  size={SLOT_SIZE}
                  held={isHeld}
                  className="animate-bubble-in motion-reduce:animate-none"
                />
              </button>
            );
          })}
        </div>
      </DiceTray>

      {playing && (
        <div className="grid pt-4">
          <Button size="lg" disabled={!canReroll} loading={pending} onClick={onReroll}>
            Reroll
            <span className="font-semibold tabular-nums opacity-70">
              {rollNumber ?? 0}/{ROLLS_PER_TURN}
            </span>
          </Button>
        </div>
      )}
    </>
  );
}
