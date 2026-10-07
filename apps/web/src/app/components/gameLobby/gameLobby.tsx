import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_ONLINE_PLAYERS, MAX_PLAYERS, type GameView } from '@dice-app/contracts';

import { Button } from '../ui/button';
import { ConfirmLeave } from '../ui/confirmLeave';
import { Card } from '../ui/card';
import PlayerRow from '../players/playerRow';
import PlayerNameRow from '../players/playerNameRow';
import LogItem from '../gameLog/logItem';
import { joinGame, leaveGame, removeParticipant, startGame } from '../../api/games';
import { randomId } from '../../api/randomId';
import { useErrorToast } from '../ui/toast';
import { InviteCodeButton } from './inviteCodeButton';
import { JoinGameForm } from './joinGameForm';

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
type ClosingAction = 'start' | 'leave';

type JoiningPlayer = {
  id: string;
  name: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// TODO: the log is local — GET /games/:id/events does not expose joins and removals (DECYZJE.md §13)
export default function GameLobby({ game, onGameChange }: GameLobbyProps) {
  const { participants, isHost, myParticipantId } = game;
  // online, everyone joins from their own device; locally, the host adds the players by name
  const online = game.diceSource === 'VIRTUAL';
  const maxPlayers = online ? MAX_ONLINE_PLAYERS : MAX_PLAYERS;
  // this device does not play in the game: the list is only watched
  const watching = myParticipantId === null;
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
  // which of the two was clicked: that one spins, the other is only blocked
  const [closingAction, setClosingAction] = useState<ClosingAction | null>(null);
  const closing = closingAction !== null;
  const showError = useErrorToast();
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
        showError(err);
        return false;
      }
    });
    return queueRef.current;
  }

  function addLogEntry(seat: number, text: string) {
    setLog((current) => [
      ...current,
      { id: randomId(), seat, text, time: formatTime(new Date()) },
    ]);
  }

  function addPlayer() {
    const name = newName.trim();
    setNewName('');
    setAdding(false);
    if (!name || playerCount >= maxPlayers) return;

    const pendingPlayer = { id: randomId(), name };
    setJoining((current) => [...current, pendingPlayer]);
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
  async function close(kind: ClosingAction, action: () => Promise<void>) {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosingAction(kind);
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
      setClosingAction(null);
    }
  }

  function start() {
    close('start', async () => onGameChange(await startGame(game.id)));
  }

  function leave() {
    // a watcher is not in the game: leaving is just going back
    if (watching) {
      router.push('/games');
      return;
    }
    close('leave', async () => {
      await leaveGame(game.id);
      router.push('/games');
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <Card className="grid w-full max-w-[480px] gap-6 motion-safe:animate-rise">
        <div className="flex items-center justify-between gap-3">
          {/* pl-2 lines the heading up with the Add player text (its own px-2), away from the corner */}
          <h2 className="pl-2 text-xl font-bold">
            Players{' '}
            <span className="text-sm font-semibold text-ink-muted tabular-nums">
              {playerCount}/{maxPlayers}
            </span>
          </h2>

          {online && !watching && game.inviteCode && <InviteCodeButton code={game.inviteCode} />}
          {!online && isHost && (
            <button
              type="button"
              onClick={startAdding}
              disabled={adding || closing || playerCount >= maxPlayers}
              className={[
                'cursor-pointer rounded-full px-2 py-1 font-bold text-primary transition-colors duration-150',
                'hover:text-primary-hover disabled:cursor-not-allowed disabled:text-ink-faint',
              ].join(' ')}
            >
              + Add player
            </button>
          )}
        </div>

        <div className="grid gap-2">
          {participants.map((participant, seat) => {
            const isRemoving = removing.includes(participant.id);
            // the host always stays in their own game (the server refuses it too)
            const removable = isHost && participant.role !== 'HOST' && !isRemoving && !closing;
            return (
              <div
                key={participant.id}
                className={['motion-safe:animate-rise', isRemoving ? 'opacity-60' : ''].join(' ')}
              >
                <PlayerRow
                  name={participant.name}
                  seat={seat}
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

        {/* locally the host typed every name in themselves, so a log of it tells them nothing */}
        {online && (
          <div className="grid gap-2" aria-label="Game log">
            {log.map((entry) => (
              <LogItem key={entry.id} seat={entry.seat} time={entry.time}>
                {entry.text}
              </LogItem>
            ))}
          </div>
        )}

        {/* a watcher has nothing to start: leaving is their only button, so it looks like one */}
        {watching ? (
          <div className="grid gap-3">
            {/* an online lobby takes anyone with the link, until it is full */}
            {online && participants.length < MAX_ONLINE_PLAYERS && (
              <JoinGameForm gameId={game.id} seat={participants.length} onJoined={onGameChange} />
            )}
            {online && participants.length >= MAX_ONLINE_PLAYERS && (
              <p className="text-center text-sm font-semibold text-ink-muted">This game is full</p>
            )}
            <Button size="lg" variant="secondary" onClick={leave}>
              Leave spectating
            </Button>
          </div>
        ) : !isHost ? (
          // only the host starts the game; a player leaving goes alone, so nothing to ask first
          <div className="grid gap-3">
            <p className="text-center text-sm font-semibold text-ink-muted">
              Waiting for the host to start the game
            </p>
            <Button size="lg" variant="secondary" onClick={leave} loading={closingAction === 'leave'}>
              Leave game
            </Button>
          </div>
        ) : (
          // two equal columns, whatever the labels: the "Leave?" question then fits on its half
          <div className="grid grid-cols-2 items-center gap-3">
            {/* inert, not disabled, while leaving: blocked, but not greyed out next to the spinner */}
            <Button
              size="lg"
              onClick={start}
              loading={closingAction === 'start'}
              inert={closingAction === 'leave'}
            >
              Start game
            </Button>
            {/* a quiet text action, so leaving does not compete with starting; it asks first,
                since the host leaving abandons the game */}
            <div className="grid" inert={closingAction === 'start'}>
              <ConfirmLeave
                onConfirm={leave}
                loading={closingAction === 'leave'}
                trigger={(ask) => (
                  <button
                    type="button"
                    onClick={ask}
                    className={[
                      'grid cursor-pointer place-items-center rounded-full px-2 py-3 font-bold text-ink-muted',
                      'transition-colors duration-150 hover:text-danger',
                    ].join(' ')}
                  >
                    Leave game
                  </button>
                )}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
