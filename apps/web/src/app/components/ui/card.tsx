type CardPadding = "default" | "compact" | "none";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
};

const paddingClasses: Record<CardPadding, string> = {
  default: "p-[22px]",
  // the scorecard needs the room for its columns
  compact: "p-3",
  none: "",
};

export function Card({ padding = "default", className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-card border border-surface-line bg-surface backdrop-blur-[18px] backdrop-saturate-[1.2]",
        paddingClasses[padding],
        className,
      ].join(" ")}
    />
  );
}
