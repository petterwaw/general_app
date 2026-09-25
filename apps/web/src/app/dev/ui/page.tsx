'use client';

// Temporary showcase of the UI building blocks on sample data, no API calls.
// Remove once the real game screen is assembled from these components.

import { useState } from 'react';
import type { DieFace } from '@dice-app/contracts';

import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/iconButton';
import { DrawerHandle } from '../../components/ui/drawerHandle';
import { Drawer } from '../../components/ui/drawer';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { CopyIcon } from '../../components/ui/icons';
import Die from '../../components/dice/die';
import DiceTray from '../../components/dice/diceTray';
import DiceSlots from '../../components/dice/diceSlots';
import DicePicker from '../../components/dice/dicePicker';
import TurnPill from '../../components/dice/turnPill';
import PlayerRow from '../../components/players/playerRow';
import LogItem from '../../components/gameLog/logItem';
import ScoreCell from '../../components/scorecard/scoreCell';
import TopBar from '../../components/topBar/topBar';
import type { LocalRoll } from '../../types/gameTypes';

const PLAYERS = [
  { id: 'sample-piotr', name: 'Piotr', host: true },
  { id: 'sample-ala', name: 'Ala' },
  { id: 'sample-kuba', name: 'Kuba', guest: true },
  { id: 'sample-ola', name: 'Ola' },
];

export default function UiPreviewPage() {
  const [dice, setDice] = useState<LocalRoll>([null, null, null, null, null]);
  const [active, setActive] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  function pick(value: DieFace) {
    if (active === -1) return;
    setDice((current) => current.map((v, i) => (i === active ? value : v)) as LocalRoll);
    setActive((current) => (current < 4 ? current + 1 : -1));
  }

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-4 pb-16 md:px-7">
      <TopBar gameCode="Y7K3" onCopyCode={() => {}} onLeave={() => {}} />

      <Card className="grid gap-4">
        <h3 className="text-xl font-bold">Buttons</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button>Start game</Button>
          <Button variant="secondary">Leave game</Button>
          <Button variant="ghost">Add player</Button>
          <Button variant="danger">Remove from game</Button>
          <Button disabled>Save score</Button>
          <IconButton aria-label="Copy">
            <CopyIcon />
          </IconButton>
          <DrawerHandle label="Players" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} />
        </div>
        <Input placeholder="Player 1" className="max-w-sm" />
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid gap-5 @container">
          <DiceTray
            footer={<TurnPill participantId="sample-kuba" name="Kuba" seat={2} round={7} totalRounds={15} />}
          >
            <DiceSlots dice={dice} activeIndex={active} onSlotClick={setActive} />
          </DiceTray>
          <div className="grid gap-4 pt-[34px]">
            <DicePicker disabled={active === -1} onPick={pick} />
            <Button size="lg" disabled={dice.includes(null)}>
              Confirm
            </Button>
          </div>
        </div>

        <Card className="grid content-start gap-4">
          <h3 className="text-xl font-bold">Dice</h3>
          <div className="flex flex-wrap gap-[18px]">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <Die key={v} value={v} />
            ))}
            <Die value={6} held />
          </div>
          <div className="flex items-center gap-2">
            <Die value={3} mini /> Threes
          </div>
        </Card>
      </div>

      <Card padding="compact">
        <table className="w-full border-separate border-spacing-y-0.5 text-[.92rem]">
          <tbody>
            <tr>
              <td className="px-2 font-semibold">States</td>
              <ScoreCell categoryLabel="Fours" isActive={false} state={{ kind: 'scored', value: 18 }} />
              <ScoreCell categoryLabel="Fours" isActive={false} state={{ kind: 'open' }} />
              <ScoreCell categoryLabel="Fours" isActive={false} state={{ kind: 'zero' }} />
              <ScoreCell categoryLabel="Fours" isActive={false} state={{ kind: 'locked' }} />
              <ScoreCell categoryLabel="Fours" isActive state={{ kind: 'scored', value: 24 }} />
              {selected ? (
                <ScoreCell
                  categoryLabel="Fours"
                  isActive
                  state={{ kind: 'selected', points: 15, onSave: () => setSelected(false) }}
                />
              ) : (
                <ScoreCell
                  categoryLabel="Fours"
                  isActive
                  state={{ kind: 'hint', points: 15, onSelect: () => setSelected(true) }}
                />
              )}
            </tr>
          </tbody>
        </table>
      </Card>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        label="Players and game log"
        closeLabel="Close players and game log"
      >
        <h3 className="text-xl font-bold">Players</h3>
        <div className="mt-3 grid gap-2">
          {PLAYERS.map((p, seat) => (
            <PlayerRow
              key={p.id}
              participantId={p.id}
              name={p.name}
              seat={seat}
              isActive={seat === 2}
              isHost={p.host}
              isGuest={p.guest}
              total={null}
            />
          ))}
        </div>
        <div className="mt-6 border-t border-hairline pt-[18px]">
          <h3 className="text-xl font-bold">Game log</h3>
          <div className="mt-3 grid gap-3">
            <LogItem seat={1} time="20:14">Ala scored General, 50 pts</LogItem>
            <LogItem seat={0} time="20:12">Piotr scored Full House, 25 pts</LogItem>
            <LogItem seat={3} time="20:10">Ola scratched Ones for 0</LogItem>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
