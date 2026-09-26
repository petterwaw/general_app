import { ComingSoon } from "../ui/comingSoon";

type GameMode = "offline" | "online";

type GameModeSwitchProps = {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
  disabled?: boolean;
};

// `soon`: shown but not selectable yet (online play is outside the MVP)
const MODES: { value: GameMode; label: string; soon?: boolean }[] = [
  { value: "offline", label: "Offline" },
  { value: "online", label: "Online", soon: true },
];

export function GameModeSwitch({ mode, onChange, disabled = false }: GameModeSwitchProps) {
  return (
    <div role="group" aria-label="Game mode" className="relative grid grid-cols-2 rounded-full bg-surface-sunken p-1">
      {/* one white pill that slides under the active option */}
      <span
        aria-hidden="true"
        className={[
          "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          mode === "online" ? "translate-x-full" : "translate-x-0",
        ].join(" ")}
      />
      {MODES.map(({ value, label, soon }) => {
        const option = (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            disabled={disabled || soon}
            aria-pressed={mode === value}
            className={[
              "relative w-full cursor-pointer rounded-full px-4 py-2.5 text-[0.95rem] font-bold transition-colors duration-300",
              "disabled:cursor-not-allowed",
              mode === value ? "text-ink" : "text-ink-muted hover:text-ink disabled:text-ink-faint",
            ].join(" ")}
          >
            {label}
          </button>
        );

        return soon ? (
          <ComingSoon key={value} className="relative">
            {option}
          </ComingSoon>
        ) : (
          option
        );
      })}
    </div>
  );
}
