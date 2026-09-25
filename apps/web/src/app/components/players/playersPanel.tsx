import type { ParticipantView } from '@dice-app/contracts';

import PlayerRow from './playerRow';

type PlayersPanelProps = {
  participants: ParticipantView[];
  currentPlayerId: string | null;
};

// Players + Game log: the third column on wide screens, the side drawer otherwise.
export default function PlayersPanel({ participants, currentPlayerId }: PlayersPanelProps) {
  return (
    <>
      <h3 className="text-xl font-bold">Players</h3>
      <div className="mt-3 grid gap-2">
        {participants.map((participant, seat) => (
          <PlayerRow
            key={participant.id}
            participantId={participant.id}
            name={participant.name}
            seat={seat}
            isActive={participant.id === currentPlayerId}
            isHost={participant.role === 'HOST'}
            total={participant.finalScore}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-hairline pt-[18px]">
        <h3 className="text-xl font-bold">Game log</h3>
        {/* TODO: entries from GET /games/:id/events (LogItem) */}
      </div>
    </>
  );
}
