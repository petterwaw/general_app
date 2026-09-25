import Avatar from './avatar';
import { Badge } from '../ui/badge';
import { CloseIcon, LockIcon } from '../ui/icons';

type PlayerRowProps = {
  name: string;
  seat: number;
  isHost?: boolean;
  isGuest?: boolean;
  // null = total still sealed (hidden until the game ends); left out = no total (lobby)
  total?: number | null;
  // shows an X instead of the total
  onRemove?: () => void;
};

export default function PlayerRow({
  name,
  seat,
  isHost = false,
  isGuest = false,
  total,
  onRemove,
}: PlayerRowProps) {
  return (
    // no highlight for the current player: the scorecard column and the turn pill already show it
    <div className="flex items-center gap-3 rounded-panel bg-white/60 py-2.5 pr-3.5 pl-2.5">
      <Avatar seed={name} seat={seat} size={48} />

      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-bold">
        {name}
        {isHost && <Badge>Host</Badge>}
        {isGuest && <Badge tone="muted">Guest</Badge>}
      </span>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className={[
            'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted',
            'transition-colors duration-150 hover:text-danger',
          ].join(' ')}
        >
          <CloseIcon size={20} />
        </button>
      ) : total === undefined ? null : total === null ? (
        <span
          title="Totals are revealed when the game ends"
          className="inline-flex items-center gap-1.25 rounded-full bg-surface-sunken py-1 pr-2.5 pl-2.25 text-[.95rem] font-extrabold tracking-[.12em] text-ink-faint"
        >
          <LockIcon />
          <span aria-hidden="true">???</span>
          <span className="sr-only">Score hidden until the game ends</span>
        </span>
      ) : (
        <span className="text-[1.2rem] font-extrabold tabular-nums">{total}</span>
      )}
    </div>
  );
}
