import { useState } from 'react';
import type { DiceRoll, DieFace } from '@dice-app/contracts';

import DiceTray from './diceTray';
import DiceSlots from './diceSlots';
import DicePicker from './dicePicker';
import { Button } from '../ui/button';
import type { LocalRoll } from '../../types/gameTypes';

type DiceEntryProps = {
  // dice the server already holds for this turn; entry is closed once they are set
  confirmedDice: DiceRoll | null;
  pending: boolean;
  // the game is over: the tray stays on screen, but nothing can be entered
  disabled?: boolean;
  // someone who only watches: the tray shows the confirmed dice, with no picker or Confirm at all
  readOnly?: boolean;
  onConfirm: (dice: DiceRoll) => void;
  // sits on the tray's bottom edge, e.g. <TurnPill />
  trayFooter?: React.ReactNode;
};

const EMPTY: LocalRoll = [null, null, null, null, null];

function isComplete(roll: LocalRoll): roll is DiceRoll {
  return !roll.includes(null);
}

// Physical dice typed in by the host, like a one-time-code field (docs/DESIGN.md).
// Must be rendered inside an @container: the dice are sized from the column width.
export default function DiceEntry({
  confirmedDice,
  pending,
  disabled = false,
  readOnly = false,
  onConfirm,
  trayFooter,
}: DiceEntryProps) {
  const [roll, setRoll] = useState<LocalRoll>(EMPTY);
  // -1 = all five entered, no slot active
  const [active, setActive] = useState(0);
  // dice of the turn that just ended, popping off the felt
  const [leaving, setLeaving] = useState<DiceRoll | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState(confirmedDice);

  // Confirmed dice gone = the turn is over (category saved, or the game ended): a fresh draft for
  // the next turn, while the old dice leave. Kept mounted across turns so they have something to
  // leave from.
  if (confirmedDice !== lastConfirmed) {
    setLastConfirmed(confirmedDice);
    if (confirmedDice === null && lastConfirmed !== null) {
      setLeaving(lastConfirmed);
      setRoll(EMPTY);
      setActive(0);
    }
  }

  function pick(value: DieFace) {
    if (active === -1) return;
    setRoll((current) => current.map((die, index) => (index === active ? value : die)) as LocalRoll);
    setActive((current) => (current < 4 ? current + 1 : -1));
  }

  const confirmed = confirmedDice !== null;
  const closed = confirmed || disabled || readOnly;

  return (
    <>
      <DiceTray footer={trayFooter}>
        <DiceSlots
          dice={confirmedDice ?? roll}
          activeIndex={closed ? -1 : active}
          onSlotClick={(index) => {
            if (!closed) setActive(index);
          }}
          leaving={leaving}
          onLeft={() => setLeaving(null)}
        />
      </DiceTray>

      {!readOnly && (
        <div className="grid gap-4 pt-4">
          <DicePicker disabled={closed || active === -1} onPick={pick} />
          <Button
            size="lg"
            disabled={closed || pending || !isComplete(roll)}
            onClick={() => {
              if (isComplete(roll)) onConfirm(roll);
            }}
          >
            Confirm
          </Button>
        </div>
      )}
    </>
  );
}
