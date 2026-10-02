import Avatar from './avatar';
import { Badge } from '../ui/badge';
import { CloseIcon } from '../ui/icons';
import { DIMMED } from '../scorecard/scoreCell';

type PlayerRowProps = {
  name: string;
  seat: number;
  isGuest?: boolean;
  // left the game in progress: faded, with a tag, while the others play on
  left?: boolean;
  // shows an X on the right (lobby)
  onRemove?: () => void;
};

export default function PlayerRow({
  name,
  seat,
  isGuest = false,
  left = false,
  onRemove,
}: PlayerRowProps) {
  return (
    // no highlight for the current player: the scorecard column and the turn pill already show it
    <div className="flex items-center gap-3 rounded-panel bg-white/60 py-2.5 pr-3.5 pl-2.5">
      <Avatar seed={name} seat={seat} size={48} className={left ? DIMMED : ''} />

      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-bold">
        <span className={left ? DIMMED : ''}>{name}</span>
        {isGuest && <Badge tone="muted">Guest</Badge>}
        {left && <Badge tone="muted">Left</Badge>}
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
      ) : null}
    </div>
  );
}
