'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Category, type DiceRoll, type GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { LeaveIcon } from '../ui/icons';
import { Drawer } from '../ui/drawer';
import { DrawerHandle } from '../ui/drawerHandle';
import DiceEntry from '../dice/diceEntry';
import TurnPill from '../dice/turnPill';
import PlayersPanel from '../players/playersPanel';
import ScoreCard, { MIN_PLAYER_COL } from '../scorecard/scoreCard';
import { scoreCategory, submitRoll, leaveGame } from '../../api/games';

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
// player column width the scorecard settles at when there is room: with few players the card
// hugs the table and sits left instead of stretching across the screen
const COMFY_PLAYER_COL = 88;
// with only a few players the hugging card still keeps this width, so it does not look cramped
const MIN_SCORECARD_W = 600;

function pickLayout(width: number, labelWidth: number, players: number) {
  const tray = Math.min(width, Math.max(MIN_TRAY, Math.min(MAX_TRAY, width * TRAY_SHARE)));
  // the scorecard fits beside the tray when every player column gets its minimum
  const need = labelWidth + players * MIN_PLAYER_COL + CARD_PAD;
  const layout: Layout =
    width - tray - SIDE_W - 2 * GAP >= need ? 'three' : width - tray - GAP >= need ? 'two' : 'stack';

  // natural card width, but never so wide that the tray loses its column
  const natural = Math.max(MIN_SCORECARD_W, labelWidth + players * COMFY_PLAYER_COL + CARD_PAD);
  const room = width - tray - GAP - (layout === 'three' ? SIDE_W + GAP : 0);
  const scorecard = Math.min(natural, layout === 'stack' ? width : room);

  return { tray, layout, scorecard };
}

// scorecard left, dice in the middle of what is left, players right
const gridByLayout: Record<Layout, string> = {
  three: 'grid-cols-[var(--scorecard-w)_minmax(0,1fr)_340px]',
  two: 'grid-cols-[var(--scorecard-w)_minmax(0,1fr)]',
  stack: 'grid-cols-[minmax(0,1fr)]',
};

export default function GameScreen({ game, onGameChange }: GameScreenProps) {
  const gridRef = useRef<HTMLElement>(null);
  const pendingRef = useRef(false)
  const [gridWidth, setGridWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter()

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(() => setGridWidth(grid.clientWidth));
    observer.observe(grid);
    setGridWidth(grid.clientWidth);
    return () => observer.disconnect();
  }, []);

  const { participants, currentPlayerId } = game;
  // the screen stays as it was after the last category; only entering dice is closed
  const finished = game.status === 'COMPLETED';
  const { tray, layout, scorecard } = pickLayout(gridWidth, labelWidth, participants.length);
  const columns = layout !== 'stack';
  // the panel has its own column now; the drawer must not pop back open when the window narrows
  if (layout === 'three' && drawerOpen) setDrawerOpen(false);

  const seat = participants.findIndex((participant) => participant.id === currentPlayerId);
  const current = seat === -1 ? null : participants[seat];
  const round = current
    ? Object.values(current.scoreCard).filter((value) => value !== null).length + 1
    : 0;

  async function run(action: () => Promise<GameView>) {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true);
    setError(null);
    try {
      onGameChange(await action());
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
      pendingRef.current = false
    }
  }

  function confirmDice(dice: DiceRoll) {
    if (!currentPlayerId) return;
    run(() => submitRoll(game.id, currentPlayerId, dice));
  }

  function saveCategory(category: Category) {
    if (!currentPlayerId) return;
    run(() => scoreCategory(game.id, currentPlayerId, category));
  }

  function leaveGameSubmit() {
    // a finished game has nothing to abandon (the server refuses it), so just go back
    if (finished) {
      router.push('/games');
      return;
    }
    run(async (): Promise<GameView> => {
      const updatedGame = await leaveGame(game.id)
      router.push('/games')
      return updatedGame
    })
  }

  const leaveButton = (
    <Button
      variant="secondary"
      size="top"
      onClick={leaveGameSubmit}
      disabled={pending}
      aria-label="Leave game"
    >
      <LeaveIcon />
      <span className="max-[560px]:hidden">Leave game</span>
    </Button>
  );

  return (
    <>
      <section
        ref={gridRef}
        aria-label="Game"
        style={{ '--tray-w': `${tray}px`, '--scorecard-w': `${scorecard}px` } as React.CSSProperties}
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
              : 'order-1 w-full max-w-[min(720px,var(--scorecard-w))] justify-self-center',
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
            '@container grid w-full max-w-(--tray-w) min-w-0 gap-5 justify-self-center',
            columns ? 'self-center' : '',
          ].join(' ')}
        >
          {layout !== 'three' && (
            <div className="flex items-center justify-between gap-3">
              {leaveButton}
              <DrawerHandle
                label="Players"
                aria-label="Show players and game log"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          )}

          {/* a new revision means a new draft: confirmed dice or the next player's turn */}
          <DiceEntry
            key={game.revision}
            confirmedDice={game.currentDice}
            pending={pending}
            disabled={finished}
            onConfirm={confirmDice}
            trayFooter={
              current && (
                <TurnPill
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
          <div className="flex min-h-0 flex-col gap-4" aria-label="Players and game log">
            <div className="flex justify-end">{leaveButton}</div>
            <div className="min-h-0 overflow-auto">
              <PlayersPanel participants={participants} />
            </div>
          </div>
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
          {/* room for the close button, which used to sit beside the heading */}
          <div className="pt-12">
            <PlayersPanel participants={participants} />
          </div>
        </Drawer>
      )}
    </>
  );
}
