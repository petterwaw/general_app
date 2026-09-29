import { useEffect, useEffectEvent, useState } from 'react';
import type { ParticipantView } from '@dice-app/contracts';

import Avatar from '../players/avatar';
import CountUp from './countUp';
import Medal from './medal';

// the results column: the score tiles and the buttons under them
export const RESULTS_W = 420;
// Tile geometry: every tile is laid out absolutely, so moving down is a transition, not a jump.
const TILE_H = 76;
const GAP = 12;
// the tile being counted is this much bigger, grown from its top edge
const CURRENT_SCALE = 1.2;
// the finished count stays in the spotlight this long before the next tile bangs in
const PAUSE_MS = 700;

type ScoreRevealProps = {
  participants: ParticipantView[];
  // the first tile waits this long (the screen behind it has to be ready first)
  startDelayMs: number;
  // the last tile (the winner) starts counting
  onLastStart?: () => void;
  // the last score has finished counting
  onDone?: () => void;
};

// a medal for the podium, a plain #4, #5... for the rest; the same width either way
function Place({ place }: { place: number }) {
  return (
    <span className="grid w-8 shrink-0 place-items-center font-extrabold text-ink-muted tabular-nums">
      {place === 1 || place === 2 || place === 3 ? <Medal place={place} /> : `#${place}`}
    </span>
  );
}

// Final scores revealed one player at a time, lowest first: each new tile bangs in at the top,
// bigger, and counts its score up; then it shrinks and slides down under the next one. The winner
// ends on top. The scores are the server's (finalScore), never computed here.
export default function ScoreReveal({ participants, startDelayMs, onLastStart, onDone }: ScoreRevealProps) {
  // seat = position in the turn order: the avatar colour matches the rest of the game
  const order = participants
    .map((participant, seat) => ({ participant, seat, score: participant.finalScore ?? 0 }))
    .sort((a, b) => a.score - b.score);
  // place: 1 + how many scored more, so a tie shares the place (two #1s both win)
  const placeOf = (score: number) => 1 + order.filter((other) => other.score > score).length;

  // index in `order` of the tile being counted; -1 before the first one
  const [step, setStep] = useState(-1);
  const [counted, setCounted] = useState(false);

  const last = step === order.length - 1;

  // The next tile bangs in; the parent hears about the winner's tile right here. An effect event:
  // called from the timers below, it sees the latest callbacks without restarting them.
  const showTile = useEffectEvent((next: number) => {
    setCounted(false);
    setStep(next);
    if (next === order.length - 1) onLastStart?.();
  });

  function onCounted() {
    setCounted(true);
    if (last) onDone?.();
  }

  useEffect(() => {
    const timer = setTimeout(() => showTile(0), startDelayMs);
    return () => clearTimeout(timer);
  }, [startDelayMs]);

  useEffect(() => {
    if (!counted || last) return;
    const timer = setTimeout(() => showTile(step + 1), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [counted, last, step]);

  const bigH = TILE_H * CURRENT_SCALE;
  const height = order.length > 0 ? bigH + (order.length - 1) * (TILE_H + GAP) + GAP : 0;

  return (
    // narrower than the column by the spotlight scale, so the bigger tile still fits a phone
    <ol
      aria-label="Final scores"
      className="relative"
      style={{ height, width: `min(${RESULTS_W}px, calc(100% / ${CURRENT_SCALE}))` }}
    >
      {order.slice(0, step + 1).map(({ participant, seat, score }, index) => {
        // 0 = the tile being counted, at the top; older tiles sit below it
        const depth = step - index;
        const current = depth === 0;
        const y = current ? 0 : bigH + GAP + (depth - 1) * (TILE_H + GAP);

        return (
          <li
            key={participant.id}
            className={[
              'absolute inset-x-0 top-0 origin-top',
              'transition-[translate,scale] duration-500 ease-settle motion-reduce:transition-none',
            ].join(' ')}
            style={{ height: TILE_H, translate: `0 ${y}px`, scale: current ? CURRENT_SCALE : 1 }}
          >
            <div
              className={[
                'flex h-full items-center gap-2.5 rounded-panel bg-white py-2.5 pr-4 pl-3',
                current ? 'animate-bang motion-reduce:animate-none' : '',
              ].join(' ')}
            >
              <Place place={placeOf(score)} />
              <Avatar seed={participant.name} seat={seat} size={44} />
              <span className="min-w-0 flex-1 truncate text-lg font-bold">{participant.name}</span>
              <span className="shrink-0 text-3xl font-extrabold text-primary">
                {current && !counted ? (
                  <CountUp to={score} onEnd={onCounted} />
                ) : (
                  <span className="tabular-nums">{score}</span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
