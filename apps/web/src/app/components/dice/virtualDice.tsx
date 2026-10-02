import { useState } from 'react';
import type { DiceRoll } from '@dice-app/contracts';

import DiceTray from './diceTray';
import Die from './die';
import { ROW, SLOT_SIZE } from './diceSlots';
import { entranceOrder } from './virtualTurn';
import { Button } from '../ui/button';

const ROLLS_PER_TURN = 3;
// rolled dice land one after another, left to right
const ENTRANCE_STAGGER_MS = 180;
// The held frame keeps the same gap all round the die, its 6px edge below included (--shadow-die),
// and rounds its corners with the die's (Die: radius 24% of the size).
const FRAME_GAP = 4;
const DIE_EDGE = 6;
const frameStyle: React.CSSProperties = {
  inset: `-${FRAME_GAP}px -${FRAME_GAP}px -${FRAME_GAP + DIE_EDGE}px`,
  borderRadius: `calc(${SLOT_SIZE} * .24 + ${FRAME_GAP}px)`,
};

type VirtualDiceProps = {
  // the dice on the table, as the server rolled them; null before the game has a turn
  dice: DiceRoll | null;
  // positions marked to stay for the next roll, on this device only
  held: number[];
  // positions the last roll kept, as the server tells everyone: those dice do not move
  heldInLastRoll: number[];
  // changes with every roll (the turn and its roll number), so each roll plays its entrance once
  rollKey: string;
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
  heldInLastRoll,
  rollKey,
  rollNumber,
  playing,
  canReroll,
  pending,
  onToggle,
  onReroll,
  trayFooter,
}: VirtualDiceProps) {
  // the roll already on the table when the screen opened (page load) stays still
  const [firstRollKey] = useState(rollKey);
  const order = entranceOrder(heldInLastRoll);

  return (
    <>
      <DiceTray footer={trayFooter}>
        <div role="group" aria-label="Dice on the table" className={ROW}>
          {dice?.map((value, index) => {
            const isHeld = held.includes(index);
            const place = order[index];
            const enters = place !== null && rollKey !== firstRollKey;
            return (
              <button
                key={index}
                type="button"
                aria-pressed={isHeld}
                aria-label={`Die ${index + 1}: ${value}${isHeld ? ', held' : ''}`}
                disabled={!playing || pending}
                onClick={() => onToggle(index)}
                className="relative cursor-pointer rounded-2xl disabled:cursor-default"
              >
                {isHeld && (
                  <span
                    aria-hidden="true"
                    style={frameStyle}
                    className="pointer-events-none absolute outline-3 outline-secondary"
                  />
                )}
                {/* a rolled die is remounted by each roll, which replays its entrance even when it
                    shows the same value; a held one keeps its key and stays still. Filled backwards,
                    so a die waiting for its turn in the queue is not seen before it lands */}
                <Die
                  key={place === null ? 'held' : rollKey}
                  value={value}
                  size={SLOT_SIZE}
                  className={enters ? 'animate-bubble-in motion-reduce:animate-none' : ''}
                  style={
                    enters
                      ? { animationDelay: `${place * ENTRANCE_STAGGER_MS}ms`, animationFillMode: 'backwards' }
                      : undefined
                  }
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
