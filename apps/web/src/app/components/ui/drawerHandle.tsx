import { ChevronLeftIcon } from "./icons";

type DrawerHandleProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

// Quiet "Players ‹" opener for the side drawer: visible, but never competing with a main action.
export function DrawerHandle({ label, className = "", ...props }: DrawerHandleProps) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "group inline-flex cursor-pointer items-center gap-1.5 px-0.5 py-1",
        "text-[.95rem] font-bold text-ink-muted hover:text-primary",
        className,
      ].join(" ")}
    >
      {label}
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-ink"
      >
        <ChevronLeftIcon />
      </span>
    </button>
  );
}
