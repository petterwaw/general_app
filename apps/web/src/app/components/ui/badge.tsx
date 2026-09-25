type BadgeTone = "primary" | "muted";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary",
  muted: "bg-surface-sunken text-ink-muted",
};

export function Badge({ tone = "primary", className = "", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        "rounded-full px-2.5 py-0.5 text-xs font-bold",
        toneClasses[tone],
        className,
      ].join(" ")}
    />
  );
}
