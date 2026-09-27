import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { ParticipantView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { ChevronLeftIcon } from '../ui/icons';
import { prefersReducedMotion } from '../ui/reducedMotion';
import Fireworks from './fireworks';
import FinalScoreboard, { SCOREBOARD_CORNERS, scoreboardWidth } from './finalScoreboard';
import PixelCover, { PIXEL_COVER_MS } from './pixelCover';
import ScoreReveal, { RESULTS_W } from './scoreReveal';

// The whole end-of-game timeline, from the last move:
// - the finished board stays in view for a moment, so the last score can be seen;
// - the pixel cover builds up (PIXEL_COVER_MS);
// - after a breath the score tiles start, each paced by ScoreReveal itself;
// - fireworks start with the winner's tile, the buttons come once it has counted.
const COVER_DELAY_MS = 1000;
const SCORES_AFTER_COVER_MS = 400;
// room between the results column and the scoreboard beside it
const SIDE_GAP = 40;
// cover padding on both sides (px-4)
const COVER_PAD = 32;
// every move on this screen: the scoreboard sliding in, the results making room, the arrow turning
const MOVE = 'duration-500 ease-settle motion-reduce:transition-none';

// revealed: the cover is up and the scores are counting; done: all counted, the buttons are shown
type Stage = 'waiting' | 'revealed' | 'done';

function subscribeToResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

// Opens from zero height (grid rows 0fr -> 1fr), so what is around it glides aside instead of
// jumping.
function Unfold({
  open,
  className = '',
  children,
  ...props
}: { open: boolean } & React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      {...props}
      className={[
        `grid transition-[grid-template-rows] ${MOVE}`,
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      ].join(' ')}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

type EndActionsProps = {
  shown: boolean;
  onLeave: () => void;
  leaveLabel: string;
  boardOpen: boolean;
  onToggleBoard: () => void;
  // which way the scoreboard comes from: beside the results or below them
  side: boolean;
};

// "Leave game" and the scoreboard toggle, unfolding under the scores once they are all counted.
function EndActions({ shown, onLeave, leaveLabel, boardOpen, onToggleBoard, side }: EndActionsProps) {
  // right / left beside the results, down / up under them
  const arrow = side ? (boardOpen ? '' : 'rotate-180') : boardOpen ? 'rotate-90' : '-rotate-90';

  return (
    // the scores are centred on the screen, so they glide up as this opens
    <Unfold open={shown} className="w-[min(320px,100%)]">
      {shown && (
        <div
          className="grid animate-pop-in justify-items-center gap-3 pt-2 motion-reduce:animate-none"
          style={{ animationDelay: '250ms' }}
        >
          <Button size="lg" onClick={onLeave}>
            {leaveLabel}
          </Button>
          <button
            type="button"
            aria-expanded={boardOpen}
            onClick={onToggleBoard}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 font-bold text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            {boardOpen ? 'Hide the scoreboard' : 'See the scoreboard'}
            <ChevronLeftIcon className={`transition-transform ${MOVE} ${arrow}`} />
          </button>
        </div>
      )}
    </Unfold>
  );
}

type BoardProps = {
  participants: ParticipantView[];
  open: boolean;
};

// Wide screens: the scoreboard's slot grows from nothing beside the results, so they glide left
// (staying centred in what is left) while the scoreboard slides in from the right.
function SideBoard({ participants, open, width }: BoardProps & { width: number }) {
  return (
    <div
      className={`shrink-0 overflow-hidden transition-[width] ${MOVE}`}
      style={{ width: open ? width + SIDE_GAP : 0 }}
    >
      <div
        className={`transition-[translate,opacity] ${MOVE}`}
        style={{ width, marginLeft: SIDE_GAP, translate: open ? '0' : '100%', opacity: open ? 1 : 0 }}
      >
        {/* taller than the screen: it scrolls inside, the results stay in view */}
        <div className={`scrollbar-soft max-h-[calc(100dvh-6rem)] overflow-y-auto ${SCOREBOARD_CORNERS}`}>
          <FinalScoreboard participants={participants} />
        </div>
      </div>
    </div>
  );
}

// Narrow screens: the scoreboard unfolds downwards from the buttons, then scrolls into view.
function BoardBelow({ participants, open }: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // the unfolded scoreboard may end below the screen: bring it into view
  function onUnfolded(event: React.TransitionEvent) {
    if (event.target !== event.currentTarget || !open) return;
    ref.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }

  return (
    <Unfold ref={ref} open={open} onTransitionEnd={onUnfolded} className="w-[min(720px,100%)]">
      <div
        className={`pt-4 transition-[translate,opacity] ${MOVE}`}
        style={{ translate: open ? '0' : '0 -1.5rem', opacity: open ? 1 : 0 }}
      >
        <FinalScoreboard participants={participants} />
      </div>
    </Unfold>
  );
}

type GameOverProps = {
  participants: ParticipantView[];
  onLeave: () => void;
  // "Leave spectating" for someone who only watched
  leaveLabel: string;
};

// Shown once the game is COMPLETED: after a moment a pixel cover hides the board and the final
// scores are revealed on it, then "Leave game" and the scoreboard toggle are offered. The
// scoreboard comes in beside the results where it fits, otherwise below them. Mounted only while
// finished, so the stage starts over. The delays are presentation only; nothing about the game
// depends on them.
export default function GameOver({ participants, onLeave, leaveLabel }: GameOverProps) {
  const [stage, setStage] = useState<Stage>('waiting');
  // they go up with the winner's count, not after it
  const [fireworks, setFireworks] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  const windowWidth = useSyncExternalStore(subscribeToResize, () => window.innerWidth, () => 0);
  const boardW = scoreboardWidth(participants.length);
  const side = windowWidth - COVER_PAD >= RESULTS_W + SIDE_GAP + boardW;

  useEffect(() => {
    const timer = setTimeout(() => setStage('revealed'), COVER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const results = (
    <div className="grid w-full justify-items-center gap-6">
      <ScoreReveal
        participants={participants}
        startDelayMs={PIXEL_COVER_MS + SCORES_AFTER_COVER_MS}
        onLastStart={() => setFireworks(true)}
        onDone={() => setStage('done')}
      />
      <EndActions
        shown={stage === 'done'}
        onLeave={onLeave}
        leaveLabel={leaveLabel}
        boardOpen={boardOpen}
        onToggleBoard={() => setBoardOpen((open) => !open)}
        side={side}
      />
    </div>
  );

  return (
    // a dialog for the focus trap: the board underneath stays out of reach. Esc and outside clicks
    // are ignored: "Leave game" is the way out
    <Dialog.Root open={stage !== 'waiting'} onOpenChange={() => {}} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Popup aria-label="Game finished" className="fixed inset-0 z-30">
          <PixelCover>
            {/* The same elements in both layouts, only their classes change: switching layouts
                (a phone turned sideways) must not remount the scores and restart the reveal */}
            <div className={side ? 'flex w-full items-center' : 'grid w-full justify-items-center'}>
              <div className="flex w-full min-w-0 flex-1 justify-center">{results}</div>
              {side ? (
                <SideBoard participants={participants} open={boardOpen} width={boardW} />
              ) : (
                <BoardBelow participants={participants} open={boardOpen} />
              )}
            </div>
          </PixelCover>

          {/* from the moment the winner starts counting: fireworks over everything */}
          {fireworks && <Fireworks />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
