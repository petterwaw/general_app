'use client';

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
export default function DiceEntry({ confirmedDice, pending, onConfirm, trayFooter }: DiceEntryProps) {
  const [roll, setRoll] = useState<LocalRoll>(EMPTY);
  // -1 = all five entered, no slot active
  const [active, setActive] = useState(0);

  function pick(value: DieFace) {
    if (active === -1) return;
    setRoll((current) => current.map((die, index) => (index === active ? value : die)) as LocalRoll);
    // always jump to the next slot; past the last one entry is done
    setActive((current) => (current < 4 ? current + 1 : -1));
  }

  const confirmed = confirmedDice !== null;

  return (
    <>
      <DiceTray footer={trayFooter}>
        <DiceSlots
          dice={confirmedDice ?? roll}
          activeIndex={confirmed ? -1 : active}
          onSlotClick={(index) => {
            if (!confirmed) setActive(index);
          }}
        />
      </DiceTray>

      <div className="grid gap-4 pt-[34px]">
        <DicePicker disabled={confirmed || active === -1} onPick={pick} />
        <Button
          size="lg"
          disabled={confirmed || pending || !isComplete(roll)}
          onClick={() => {
            if (isComplete(roll)) onConfirm(roll);
          }}
        >
          Confirm
        </Button>
      </div>
    </>
  );
}
