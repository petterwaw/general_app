import Avatar from '../players/avatar';

type TurnPillProps = {
  name: string;
  seat: number;
  round: number;
  totalRounds: number;
};

// "Kuba's turn · round 7 of 15" on the tray's bottom edge. Slightly smaller on the narrowest
// phones (below 340px), where the full-size pill runs out of room.
export default function TurnPill({ name, seat, round, totalRounds }: TurnPillProps) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink max-[340px]:scale-90 py-2.5 pr-[22px] pl-3 font-bold whitespace-nowrap text-white">
      {/* the blobatar drawing has built-in padding, so the box is larger than it looks */}
      <Avatar seed={name} seat={seat} size={42} className="-my-2.5 -mr-0.75 -ml-1.25" />
      <span>{name}&apos;s turn</span>
      <span className="font-semibold text-[#cfc6ea]">
        · round {round} of {totalRounds}
      </span>
    </div>
  );
}
