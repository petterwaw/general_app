import type { ParticipantView } from '@dice-app/contracts';

import PlayerRow from './playerRow';

type PlayersPanelProps = {
  participants: ParticipantView[];
};

// Players + Game log: the third column on wide screens, the side drawer otherwise.
export default function PlayersPanel({ participants }: PlayersPanelProps) {
  return (
    <>
      {/* no headings: the players and the log speak for themselves */}
      <div className="grid gap-2">
        {participants.map((participant, seat) => (
          <PlayerRow
            key={participant.id}
            name={participant.name}
            seat={seat}
            isHost={participant.role === 'HOST'}
            total={participant.finalScore}
          />
        ))}
      </div>

      <div className="mt-6">
        {/* TODO: entries from GET /games/:id/events (LogItem) */}
      </div>
    </>
  );
}
