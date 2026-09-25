'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { CATEGORIES, type Category, type DiceRoll, type GameView } from '@dice-app/contracts';

import TopBar from '../topBar/topBar';
import { Card } from '../ui/card';
import { Drawer } from '../ui/drawer';
import { DrawerHandle } from '../ui/drawerHandle';
import DiceEntry from '../dice/diceEntry';
import TurnPill from '../dice/turnPill';
import PlayersPanel from '../players/playersPanel';
import ScoreCard, { MIN_PLAYER_COL } from '../scorecard/scoreCard';
import { scoreCategory, submitRoll } from '../../api/games';

type GameScreenProps = {
  game: GameView;
  onGameChange: (game: GameView) => void;
};

type Layout = 'three' | 'two' | 'stack';

// Tray: 42% of the game width, kept between 440 and 600px, never wider than the screen.
// The tray width depends on the window only; the player count decides where the scorecard goes.
const MIN_TRAY = 440;
const MAX_TRAY = 600;
const TRAY_SHARE = 0.42;
const SIDE_W = 340;
const GAP = 20;
// scorecard card padding + border
const CARD_PAD = 26;

function pickLayout(width: number, labelWidth: number, players: number) {
  const tray = Math.min(width, Math.max(MIN_TRAY, Math.min(MAX_TRAY, width * TRAY_SHARE)));
  // the scorecard fits beside the tray when every player column gets its minimum
  const need = labelWidth + players * MIN_PLAYER_COL + CARD_PAD;
  const layout: Layout =
    width - tray - SIDE_W - 2 * GAP >= need ? 'three' : width - tray - GAP >= need ? 'two' : 'stack';
  return { tray, layout };
}

const gridByLayout: Record<Layout, string> = {
  three: 'grid-cols-[minmax(0,1fr)_var(--tray-w)_340px]',
  two: 'grid-cols-[minmax(0,1fr)_var(--tray-w)]',
  stack: 'grid-cols-[minmax(0,1fr)]',
};

export default function GameScreen({ game, onGameChange }: GameScreenProps) {
  const gridRef = useRef<HTMLElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(() => setGridWidth(grid.clientWidth));
    observer.observe(grid);
    setGridWidth(grid.clientWidth);
    return () => observer.disconnect();
  }, []);

  const { participants, currentPlayerId } = game;
  const { tray, layout } = pickLayout(gridWidth, labelWidth, participants.length);
  const columns = layout !== 'stack';
  // the panel has its own column now; the drawer must not pop back open when the window narrows
  if (layout === 'three' && drawerOpen) setDrawerOpen(false);

  const seat = participants.findIndex((participant) => participant.id === currentPlayerId);
  const current = seat === -1 ? null : participants[seat];
  const round = current
    ? Object.values(current.scoreCard).filter((value) => value !== null).length + 1
    : 0;

  async function run(action: () => Promise<GameView>) {
    setPending(true);
    setError(null);
    try {
      onGameChange(await action());
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  function confirmDice(dice: DiceRoll) {
    if (!currentPlayerId) return;
    run(() => submitRoll(game.id, currentPlayerId, dice));
  }

  function saveCategory(category: Category) {
    if (!currentPlayerId || pending) return;
    run(() => scoreCategory(game.id, currentPlayerId, category));
  }

  return (
    <>
      {/* TODO: leave the game (DELETE endpoint from PR #6) */}
      <TopBar onLeave={() => {}} />

      <section
        ref={gridRef}
        aria-label="Game"
        style={{ '--tray-w': `${tray}px` } as React.CSSProperties}
        className={[
          'grid gap-5',
          gridByLayout[layout],
          // column layouts fill what is left of the window under the top bar, so the page never
          // scrolls up and down; the scorecard and the players panel scroll inside their cards
          columns ? 'min-h-[520px] flex-1 basis-0 grid-rows-[minmax(0,1fr)] items-stretch' : 'items-start',
        ].join(' ')}
      >
        <Card
          padding="compact"
          className={[
            columns
              ? 'flex min-h-0 flex-col [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-auto'
              : 'order-1 w-full max-w-[720px] justify-self-center',
          ].join(' ')}
        >
          <ScoreCard
            participants={participants}
            currentPlayerId={currentPlayerId}
            turnDice={game.currentDice}
            selected={selected}
            onSelect={setSelected}
            onSave={saveCategory}
            onLabelWidth={setLabelWidth}
          />
        </Card>

        {/* dice are sized from this column's width (cqi), not the window's */}
        <div
          className={[
            '@container grid min-w-0 gap-5',
            columns ? 'self-center' : 'w-full max-w-(--tray-w) justify-self-center',
          ].join(' ')}
        >
          {layout !== 'three' && (
            <DrawerHandle
              label="Players"
              aria-label="Show players and game log"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="justify-self-end"
            />
          )}

          {/* a new revision means a new draft: confirmed dice or the next player's turn */}
          <DiceEntry
            key={game.revision}
            confirmedDice={game.currentDice}
            pending={pending}
            onConfirm={confirmDice}
            trayFooter={
              current && (
                <TurnPill
                  participantId={current.id}
                  name={current.name}
                  seat={seat}
                  round={round}
                  totalRounds={CATEGORIES.length}
                />
              )
            }
          />

          {error && (
            <p role="alert" className="text-center font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        {layout === 'three' && (
          <Card className="min-h-0 overflow-auto" aria-label="Players and game log">
            <PlayersPanel participants={participants} currentPlayerId={currentPlayerId} />
          </Card>
        )}
      </section>

      {/* unmounted in the three-column layout, so switching modes never plays the slide animation */}
      {layout !== 'three' && (
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          label="Players and game log"
          closeLabel="Close players and game log"
        >
          <PlayersPanel participants={participants} currentPlayerId={currentPlayerId} />
        </Drawer>
      )}
    </>
  );
}
