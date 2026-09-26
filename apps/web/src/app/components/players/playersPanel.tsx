import { useLayoutEffect, useRef, useState } from 'react';
import type { ParticipantView } from '@dice-app/contracts';

import PlayerRow from './playerRow';
import GameLog from '../gameLog/gameLog';
import type { GameLogEntry } from '../../hooks/useGameLog';

type PlayersPanelProps = {
  participants: ParticipantView[];
  log: GameLogEntry[];
};

// While there are players out of view the list fades out at that edge (top, bottom or both). A
// mask, not an overlay, so it works on any background; the second layer keeps the scrollbar
// itself unfaded.
function fadeMask(above: boolean, below: boolean): React.CSSProperties | undefined {
  if (!above && !below) return undefined;
  const top = above ? 'transparent, #000 3rem' : '#000';
  const bottom = below ? '#000 calc(100% - 3rem), transparent' : '#000';
  return {
    maskImage: `linear-gradient(to bottom, ${top}, ${bottom}), linear-gradient(#000, #000)`,
    maskSize: '100% 100%, 8px 100%',
    maskPosition: '0 0, 100% 0',
    maskRepeat: 'no-repeat',
  };
}

// Players + Game log: the third column on wide screens, the side drawer otherwise.
// Fills the height it is given: the log keeps at least 30% of the screen, the players get the
// rest and scroll when they do not all fit.
export default function PlayersPanel({ participants, log }: PlayersPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ above: false, below: false });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function update() {
      if (!list) return;
      const above = list.scrollTop > 1;
      const below = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
      // same values keep the same object, so scrolling in the middle does not re-render
      setFade((current) => (current.above === above && current.below === below ? current : { above, below }));
    }

    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [participants.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {/* no headings: the players and the log speak for themselves */}
      <div
        ref={listRef}
        style={fadeMask(fade.above, fade.below)}
        className="scrollbar-soft grid min-h-0 gap-2 overflow-y-auto"
      >
        {participants.map((participant, seat) => (
          <PlayerRow
            key={participant.id}
            name={participant.name}
            seat={seat}
            total={participant.finalScore}
          />
        ))}
      </div>

      <GameLog entries={log} participants={participants} />
    </div>
  );
}
