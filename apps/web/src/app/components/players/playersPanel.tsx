import { useRef } from 'react';
import type { ParticipantView } from '@dice-app/contracts';

import PlayerRow from './playerRow';
import GameLog from '../gameLog/gameLog';
import { useScrollFade } from '../ui/scrollFade';
import type { GameLogEntry } from '../../hooks/useGameSocket';

type PlayersPanelProps = {
  participants: ParticipantView[];
  log: GameLogEntry[];
  // in its own column the log reads like a chat, newest at the bottom; in the drawer, newest on top
  newestAtBottom: boolean;
};

// Players + Game log: the third column on wide screens, the side drawer otherwise.
// Fills the height it is given: the log keeps 30-50% of the screen, the players get the
// rest and scroll when they do not all fit.
export default function PlayersPanel({ participants, log, newestAtBottom }: PlayersPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(listRef, [participants.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div
        ref={listRef}
        style={fade}
        className="scrollbar-hidden grid min-h-0 gap-2 overflow-y-auto"
      >
        {participants.map((participant, seat) => (
          <PlayerRow
            key={participant.id}
            name={participant.name}
            seat={seat}
            left={participant.left}
          />
        ))}
      </div>

      <GameLog entries={log} participants={participants} newestAtBottom={newestAtBottom} />
    </div>
  );
}
