type CardPadding = "default" | "compact" | "none";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
  // the thin light outline; flat cards leave it out
  outlined?: boolean;
};

const paddingClasses: Record<CardPadding, string> = {
  default: "p-[22px]",
  // the scorecard needs the room for its columns
  compact: "p-3",
  none: "",
};

// the radius follows the padding: menu cards stay concentric with the lg pill button inside them
const radiusClasses: Record<CardPadding, string> = {
  default: "rounded-card [corner-shape:squircle]",
  compact: "rounded-board",
  none: "rounded-board",
};

export function Card({ padding = "default", outlined = true, className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        "bg-surface backdrop-blur-[18px] backdrop-saturate-[1.2]",
        outlined ? "border border-surface-line" : "",
        radiusClasses[padding],
        paddingClasses[padding],
        className,
      ].join(" ")}
    />
  );
}
