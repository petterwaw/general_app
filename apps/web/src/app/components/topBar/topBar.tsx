import Die from '../dice/die';
import { Button } from '../ui/button';
import { IconButton } from '../ui/iconButton';
import { CopyIcon, LeaveIcon } from '../ui/icons';

type TopBarProps = {
  // short join code comes with stage 6; until then the field is hidden
  gameCode?: string;
  onCopyCode?: () => void;
  onLeave: () => void;
};

// Never wraps. Below 560px the app name and the "Leave game" label drop out, leaving logo and door icon.
export default function TopBar({ gameCode, onCopyCode, onLeave }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-[1.35rem] font-extrabold [--brand-die:34px] min-[561px]:[--brand-die:40px]">
        <Die value={5} size="var(--brand-die)" className="rotate-[-10deg]" />
        <span className="max-[560px]:hidden">dice-app</span>
      </div>

      <div className="flex items-stretch gap-2 min-[561px]:gap-2.5">
        {gameCode && (
          <div className="flex items-center gap-2 rounded-full [--icon-btn-size:30px] min-[561px]:[--icon-btn-size:36px] border border-surface-line bg-surface py-1 pr-1.25 pl-3 min-[561px]:gap-2.5 min-[561px]:py-1.5 min-[561px]:pr-2 min-[561px]:pl-[18px]">
            <div>
              <small className="block text-[.66rem] leading-[1.1] text-ink-muted min-[561px]:text-[.72rem]">
                Game code
              </small>
              <strong className="text-base tracking-[.08em] min-[561px]:text-[1.15rem]">{gameCode}</strong>
            </div>
            <IconButton aria-label="Copy game code" onClick={onCopyCode}>
              <CopyIcon />
            </IconButton>
          </div>
        )}

        <Button
          variant="secondary"
          size="top"
          onClick={onLeave}
          aria-label="Leave game"
        >
          <LeaveIcon />
          <span className="max-[560px]:hidden">Leave game</span>
        </Button>
      </div>
    </header>
  );
}
