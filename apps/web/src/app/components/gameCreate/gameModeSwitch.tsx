type GameMode = "offline" | "online";

type GameModeSwitchProps = {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
};

export function GameModeSwitch({
  mode,
  onChange,
}: GameModeSwitchProps) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-neutral-200 p-1">
      <button
        type="button"
        onClick={() => onChange("offline")}
        className={[
          "rounded-lg px-4 py-2.5 text-sm font-medium",
          "transition-all duration-200",
          mode === "offline"
            ? "bg-white text-neutral-950 shadow-sm"
            : "text-neutral-500 hover:text-neutral-700",
        ].join(" ")}
      >
        Offline
      </button>

      <button
        type="button"
        onClick={() => onChange("online")}
        className={[
          "rounded-lg px-4 py-2.5 text-sm font-medium",
          "transition-all duration-200",
          mode === "online"
            ? "bg-white text-neutral-950 shadow-sm"
            : "text-neutral-500 hover:text-neutral-700",
        ].join(" ")}
      >
        Online
      </button>
    </div>
  );
}