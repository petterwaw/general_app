import { useState } from "react";

import Die from "../dice/die";
import { ComingSoon } from "../ui/comingSoon";

type GameMode = "offline" | "online";

type GameModeSwitchProps = {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
  disabled?: boolean;
};

const DIE_SIZE = 44;

// a tile die is smaller than a tray die, so its bottom edge is thinner (6px would swamp it)
const TILE_DIE_EDGE = "shadow-[0_4px_0_var(--color-die-shade)]!";

// Offline: a plain die — real dice at one table.
function OfflineArt({ hop }: { hop: string }) {
  return <Die value={4} size={`${DIE_SIZE}px`} className={["-rotate-8", TILE_DIE_EDGE, hop].join(" ")} />;
}

// Online: the same die with a Wi-Fi sign in place of pips — dice rolled over the network.
// Built like Die (face, edge, pip colour) rather than added to it: Die only draws real faces.
function OnlineArt({ hop }: { hop: string }) {
  return (
    <span
      style={{ "--s": `${DIE_SIZE}px` } as React.CSSProperties}
      className={[
        "grid size-(--s) rotate-6 place-items-center rounded-[calc(var(--s)*.24)] bg-die-face text-pip",
        TILE_DIE_EDGE,
        hop,
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" className="size-[64%]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <path d="M3 9.5a13 13 0 0 1 18 0" />
        <path d="M6.5 13a8 8 0 0 1 11 0" />
        <path d="M10 16.5a3 3 0 0 1 4 0" />
        <circle cx="12" cy="19.6" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

// `soon`: shown but not selectable yet (online play is outside the MVP)
const MODES: { value: GameMode; label: string; Art: typeof OfflineArt; soon?: boolean }[] = [
  { value: "offline", label: "Offline", Art: OfflineArt },
  { value: "online", label: "Online", Art: OnlineArt, soon: true },
];

// Two tiles in the player rows' shape and white. The picked one gets the violet ring (primary
// marks a selection) and its dice hop.
export function GameModeSwitch({ mode, onChange, disabled = false }: GameModeSwitchProps) {
  // no hop for the mode that is picked when the form opens, only for a pick
  const [picked, setPicked] = useState(false);

  return (
    <div role="group" aria-label="Game mode" className="grid grid-cols-2 gap-3">
      {MODES.map(({ value, label, Art, soon }) => {
        const selected = mode === value;
        const option = (
          <button
            key={value}
            type="button"
            onClick={() => {
              if (selected) return;
              setPicked(true);
              onChange(value);
            }}
            disabled={disabled || soon}
            aria-pressed={selected}
            className={[
              "grid w-full cursor-pointer place-items-center gap-3 rounded-panel px-3 pt-5 pb-3.5",
              "font-bold transition-[background-color,color,box-shadow] duration-200",
              "disabled:cursor-not-allowed disabled:text-ink-faint",
              selected
                ? "bg-white text-primary inset-ring-2 inset-ring-primary"
                : "bg-white/60 text-ink-muted hover:bg-white hover:text-ink",
            ].join(" ")}
          >
            {/* keyed by selection, so the hop replays on each pick; the art is decoration */}
            <span
              key={String(selected)}
              aria-hidden="true"
              className={["grid h-[52px] place-items-center", soon ? "opacity-50" : ""].join(" ")}
            >
              <Art hop={selected && picked ? "motion-safe:animate-hop" : ""} />
            </span>
            {label}
          </button>
        );

        return soon ? (
          <ComingSoon key={value} className="grid">
            {option}
          </ComingSoon>
        ) : (
          option
        );
      })}
    </div>
  );
}
