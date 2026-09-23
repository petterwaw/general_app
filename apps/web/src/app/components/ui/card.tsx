type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm",
        className,
      ].join(" ")}
    />
  );
}