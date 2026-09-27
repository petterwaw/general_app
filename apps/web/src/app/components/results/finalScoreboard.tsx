import type { ParticipantView } from '@dice-app/contracts';

import ScoreCard from '../scorecard/scoreCard';

// width the scoreboard asks for beside the results: the category names (~160) and a comfortable
// column per player, within reason; past that the player columns scroll sideways as in the game
export function scoreboardWidth(players: number) {
  return Math.min(700, Math.max(420, 160 + players * 72 + 24));
}

// Superellipse corners like the menu cards where the browser can draw them (Chrome); a squircle
// needs ~1.5x the radius to look as round as an arc, so 28 -> 42 there. Elsewhere the plain 28.
// Exported for the scroller that clips it beside the results.
export const SCOREBOARD_CORNERS =
  'rounded-board [corner-shape:squircle] supports-[corner-shape:squircle]:rounded-[42px]';

const noop = () => {};

// The finished game's scorecard on the results screen: read only (no player's turn, no dice, so no
// suggestions or ticks). Flat, in the colour the scorecard's sticky cells are drawn to blend into.
export default function FinalScoreboard({ participants }: { participants: ParticipantView[] }) {
  return (
    <div className={`${SCOREBOARD_CORNERS} bg-surface-flat p-3`}>
      <ScoreCard
        participants={participants}
        currentPlayerId={null}
        turnDice={null}
        selected={null}
        onSelect={noop}
        onSave={noop}
      />
    </div>
  );
}
