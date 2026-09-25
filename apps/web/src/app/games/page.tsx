"use client";

import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ComingSoon } from "../components/ui/comingSoon";
import { IconButton } from "../components/ui/iconButton";
import { ChevronLeftIcon } from "../components/ui/icons";
import { GameModeSwitch } from "../components/gameCreate/gameModeSwitch";
import { OfflineGameForm } from "../components/gameCreate/offlineGameForm";
import { OnlineGameForm } from "../components/gameCreate/onlineGameForm";

type View = "start" | "create";
type GameMode = "offline" | "online";

export default function GamesPage() {
  const [view, setView] = useState<View>("start");
  const [mode, setMode] = useState<GameMode>("offline");

  // TODO: from useHostedGame(); while it loads or when the host already runs a game, creating
  // is disabled and <ActiveGameCard> goes under the form (DECYZJE.md §5)
  const creatingDisabled = false;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-[480px] gap-5">
        {/* keyed by view, so the swapped-in card plays the fade-in */}
        <Card key={view} className="grid gap-6 motion-safe:animate-rise">
          {view === "start" ? (
            <>
              <Button size="lg" onClick={() => setView("create")}>
                Create game
              </Button>
              {/* joining by code comes with stage 6 (QR and realtime) */}
              <ComingSoon>
                <Button size="lg" variant="ghost" disabled>
                  Join game
                </Button>
              </ComingSoon>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <IconButton aria-label="Back" onClick={() => setView("start")}>
                  <ChevronLeftIcon />
                </IconButton>
                <div className="flex-1">
                  <GameModeSwitch mode={mode} onChange={setMode} disabled={creatingDisabled} />
                </div>
              </div>

              {/* keyed by mode, so the swapped-in form plays the fade-in */}
              <div key={mode} className="motion-safe:animate-rise">
                {mode === "offline" ? (
                  <OfflineGameForm disabled={creatingDisabled} />
                ) : (
                  <OnlineGameForm disabled={creatingDisabled} />
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
