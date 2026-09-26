import Avatar from './avatar';
import { Badge } from '../ui/badge';
import { CloseIcon } from '../ui/icons';

type PlayerRowProps = {
  name: string;
  seat: number;
  isGuest?: boolean;
  // null or left out = no total: in the lobby, and during play (totals appear when the game ends)
  total?: number | null;
  // shows an X instead of the total
  onRemove?: () => void;
};

export default function PlayerRow({
  name,
  seat,
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
      ) : total == null ? null : (
        <span className="text-[1.2rem] font-extrabold tabular-nums">{total}</span>
      )}
    </div>
  );
}
