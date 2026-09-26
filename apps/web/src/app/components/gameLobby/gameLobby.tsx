'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_PLAYERS, type GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import PlayerRow from '../players/playerRow';
import PlayerNameRow from '../players/playerNameRow';
import LogItem from '../gameLog/logItem';
import { joinGame, leaveGame, removeParticipant, startGame } from '../../api/games';

type GameLobbyProps = {
  game: GameView;
  onGameChange: (game: GameView) => void;
};

type LobbyLogEntry = {
  id: string;
  seat: number;
  text: string;
  time: string;
};

// a name sent to the server whose join has not come back yet
type JoiningPlayer = {
  id: string;
  name: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong';
}

// TODO: the log is local — GET /games/:id/events does not expose joins and removals (DECYZJE.md §13)
export default function GameLobby({ game, onGameChange }: GameLobbyProps) {
  const { participants } = game;
  const [log, setLog] = useState<LobbyLogEntry[]>([]);
  const [joining, setJoining] = useState<JoiningPlayer[]>([]);
  // removals sent and not back yet: their X is hidden, so a double click sends one DELETE
  const [removing, setRemoving] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  // set on Esc: the row unmounts and a late blur must not add the name that was just dropped
  const cancelledRef = useRef(false);
  // Lobby requests run one after another, in the order they were made. Clicking Start with a
  // name still typed blurs the field first, so the join is queued before the start and the
  // start waits for it. Resolves to whether the last request went through.
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  // Start or Leave was clicked: the lobby is on its way out, so neither can be queued twice
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const playerCount = participants.length + joining.length;

  function enqueue(action: () => Promise<void>, { afterSuccessOnly = false } = {}) {
    queueRef.current = queueRef.current.then(async (previousOk) => {
      // skipped, not failed: the next click should get its chance
      if (afterSuccessOnly && !previousOk) return true;
      try {
        await action();
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      }
    });
    return queueRef.current;
  }

  function addLogEntry(seat: number, text: string) {
    setLog((current) => [
      ...current,
      { id: crypto.randomUUID(), seat, text, time: formatTime(new Date()) },
    ]);
  }

  function addPlayer() {
    const name = newName.trim();
    setNewName('');
    setAdding(false);
    if (!name || playerCount >= MAX_PLAYERS) return;

    const pendingPlayer = { id: crypto.randomUUID(), name };
    setJoining((current) => [...current, pendingPlayer]);
    setError(null);
    enqueue(async () => {
      try {
        const updated = await joinGame(game.id, name);
        onGameChange(updated);
        addLogEntry(updated.participants.length - 1, `${name} joined`);
      } finally {
        setJoining((current) => current.filter((player) => player.id !== pendingPlayer.id));
      }
    });
  }

  function startAdding() {
    cancelledRef.current = false;
    setAdding(true);
  }

  function cancelAdding() {
    setNewName('');
    setAdding(false);
  }

  function removePlayer(participantId: string) {
    setRemoving((current) => [...current, participantId]);
    setError(null);
    enqueue(async () => {
      try {
        const updated = await removeParticipant(game.id, participantId);
        // seat and name from before the removal, as the log shows them
        const seat = participants.findIndex((participant) => participant.id === participantId);
        onGameChange(updated);
        if (seat !== -1) addLogEntry(seat, `${participants[seat].name} was removed`);
      } finally {
        setRemoving((current) => current.filter((id) => id !== participantId));
      }
    });
  }

  // Start and Leave: queued behind the joins and removals, and let through once only
  async function close(action: () => Promise<void>) {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setError(null);
    // a failed join or removal stops the start, so the game never starts without a player the
    // host saw on the list
    let done = false;
    await enqueue(
      async () => {
        await action();
        done = true;
      },
      { afterSuccessOnly: true },
    );
    // on success the lobby goes away (the game starts or the page changes), so it stays locked
    if (!done) {
      closingRef.current = false;
      setClosing(false);
    }
  }

  function start() {
    close(async () => onGameChange(await startGame(game.id)));
  }

  function leave() {
    close(async () => {
      await leaveGame(game.id);
      router.push('/games');
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <Card className="grid w-full max-w-[480px] gap-6 motion-safe:animate-rise">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            Players{' '}
            <span className="text-sm font-semibold text-ink-muted tabular-nums">
              {playerCount}/{MAX_PLAYERS}
            </span>
          </h2>

          {/* plain text action, same as on the create form */}
          <button
            type="button"
            onClick={startAdding}
            disabled={adding || closing || playerCount >= MAX_PLAYERS}
            className={[
              'cursor-pointer rounded-full px-2 py-1 font-bold text-primary transition-colors duration-150',
              'hover:text-primary-hover disabled:cursor-not-allowed disabled:text-ink-faint',
            ].join(' ')}
          >
            + Add player
          </button>
        </div>

        <div className="grid gap-2">
          {participants.map((participant, seat) => {
            const isRemoving = removing.includes(participant.id);
            // the host always stays in their own game (the server refuses it too)
            const removable = participant.role !== 'HOST' && !isRemoving && !closing;
            return (
              // faded while its removal is on the way
              <div
                key={participant.id}
                className={['motion-safe:animate-rise', isRemoving ? 'opacity-60' : ''].join(' ')}
              >
                <PlayerRow
                  name={participant.name}
                  seat={seat}
                  isHost={participant.role === 'HOST'}
                  onRemove={removable ? () => removePlayer(participant.id) : undefined}
                />
              </div>
            );
          })}

          {/* shown right away, faded until the server has added them */}
          {joining.map((player, index) => (
            <div key={player.id} className="opacity-60">
              <PlayerRow name={player.name} seat={participants.length + index} />
            </div>
          ))}

          {adding && (
            // typed in place: Enter or clicking away adds the player, Esc or X drops the row,
            // and so does clicking away while it is empty
            <div className="motion-safe:animate-rise">
              <PlayerNameRow
                autoFocus
                value={newName}
                onChange={setNewName}
                seat={playerCount}
                placeholder={`Player ${playerCount + 1}`}
                onKeyDown={(event) => {
                  // blur is the one place that adds, so Enter cannot add the player twice
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') {
                    cancelledRef.current = true;
                    cancelAdding();
                  }
                }}
                onBlur={() => {
                  if (cancelledRef.current) cancelledRef.current = false;
                  else if (newName.trim()) addPlayer();
                  else cancelAdding();
                }}
                onRemove={cancelAdding}
                removeLabel="Cancel adding player"
              />
            </div>
          )}
        </div>

        <div className="grid gap-2" aria-label="Game log">
          {log.map((entry) => (
            <LogItem key={entry.id} seat={entry.seat} time={entry.time}>
              {entry.text}
            </LogItem>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-center font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button size="lg" onClick={start} disabled={closing} className="flex-1">
            Start game
          </Button>
          {/* a quiet text action, so leaving does not compete with starting */}
          <button
            type="button"
            onClick={leave}
            disabled={closing}
            className={[
              'flex-1 cursor-pointer rounded-full px-2 py-3 font-bold text-ink-muted transition-colors duration-150',
              'hover:text-danger disabled:cursor-not-allowed disabled:text-ink-faint',
            ].join(' ')}
          >
            Leave game
          </button>
        </div>
      </Card>
    </div>
  );
}
