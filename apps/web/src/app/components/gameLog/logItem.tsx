import { playerColor } from '../players/playerColors';

type LogItemProps = {
  // left out for entries that belong to no player (e.g. the game start): a neutral dot
  seat?: number;
  children: React.ReactNode;
  // already formatted, e.g. "20:14"
  time: string;
};

export default function LogItem({ seat, children, time }: LogItemProps) {
  return (
    <div className="grid grid-cols-[12px_1fr_auto] items-baseline gap-2.5 text-[.92rem]">
      <span
        className={['size-3 translate-y-px rounded-full', seat === undefined ? 'bg-ink-faint' : ''].join(' ')}
        style={seat === undefined ? undefined : { background: playerColor(seat) }}
      />
      <span>{children}</span>
      <time className="text-[.8rem] text-ink-muted">{time}</time>
    </div>
  );
}
