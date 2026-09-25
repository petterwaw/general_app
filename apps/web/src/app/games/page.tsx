"use client";

import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ComingSoon } from "../components/ui/comingSoon";
import { IconButton } from "../components/ui/iconButton";
import { ChevronLeftIcon } from "../components/ui/icons";
import { ActiveGameCard } from "../components/gameCreate/activeGameCard";
import { GameModeSwitch } from "../components/gameCreate/gameModeSwitch";
import { OfflineGameForm } from "../components/gameCreate/offlineGameForm";
import { OnlineGameForm } from "../components/gameCreate/onlineGameForm";
import useHostedGame from '../hooks/useHostedGame'
import { leaveGame } from '../api/games'

type View = "start" | "create";
type GameMode = "offline" | "online";

export default function GamesPage() {
  const [view, setView] = useState<View>("start");
  const [mode, setMode] = useState<GameMode>("offline");

  const [pending, setPending] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const { game: hostedGame, loading, error, setGame } = useHostedGame();

  async function leaveHostedGame() {
    // checked before try, so an early return does not reach finally and unlock the button
    if (pending || !hostedGame) return;
    setPending(true);
    setLeaveError(null);
    try {
      await leaveGame(hostedGame.id);
      setGame(null);
    } catch (err) {
      // TODO: show it once there is a shared error message component
      setLeaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-[480px] gap-5">
        {/* a host runs one game at a time (DECYZJE.md §5): with a game going, the only choices
            are going back to it or leaving it; until the check is back nothing is shown */}
        {loading ? null : hostedGame ? (
          <div className="motion-safe:animate-rise">
            <ActiveGameCard game={hostedGame} onLeave={leaveHostedGame} pending={pending}/>
          </div>
        ) : (
          // keyed by view, so the swapped-in card plays the fade-in
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
                    <GameModeSwitch mode={mode} onChange={setMode} />
                  </div>
                </div>

                {/* keyed by mode, so the swapped-in form plays the fade-in */}
                <div key={mode} className="motion-safe:animate-rise">
                  {mode === "offline" ? (
                    <OfflineGameForm />
                  ) : (
                    <OnlineGameForm />
                  )}
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
