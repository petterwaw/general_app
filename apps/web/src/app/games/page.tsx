"use client";

import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ComingSoon } from "../components/ui/comingSoon";
import { IconButton } from "../components/ui/iconButton";
import { ChevronLeftIcon } from "../components/ui/icons";
import { ActiveGameCard } from "../components/gameCreate/activeGameCard";
import { ErrorScreen } from "../components/errors/errorScreen";
import { useErrorToast } from "../components/ui/toast";
import { CreateGameForm } from "../components/gameCreate/createGameForm";
import useActiveGame from '../hooks/useActiveGame'
import { leaveGame } from '../api/games'

type View = "start" | "create";

export default function GamesPage() {
  const [view, setView] = useState<View>("start");

  const [pending, setPending] = useState(false);
  const showError = useErrorToast();

  const { game: activeGame, loading, error, setGame, retry } = useActiveGame();

  async function leaveActiveGame() {
    // checked before try, so an early return does not reach finally and unlock the button
    if (pending || !activeGame) return;
    setPending(true);
    try {
      await leaveGame(activeGame.id);
      setGame(null);
    } catch (err) {
      showError(err);
    } finally {
      setPending(false);
    }
  }

  // without the answer the page cannot tell whether to offer "Create game" or the game going on
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col">
        <ErrorScreen title="Something went wrong. The table isn't answering">
          <Button onClick={retry}>Try again</Button>
        </ErrorScreen>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-[480px] gap-5">
        {/* a device is in one game at a time (DECYZJE.md §5): with a game going, the only choices
            are going back to it or leaving it; until the check is back nothing is shown */}
        {loading ? null : activeGame ? (
          <div className="motion-safe:animate-rise">
            <ActiveGameCard game={activeGame} onLeave={leaveActiveGame} pending={pending}/>
          </div>
        ) : (
          // keyed by view, so the swapped-in card plays the fade-in
          <Card key={view} className="grid gap-6 motion-safe:animate-rise">
            {view === "start" ? (
              <>
                <Button size="lg" onClick={() => setView("create")}>
                  Create game
                </Button>
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
                  <h2 className="text-xl font-bold">New game</h2>
                </div>

                <CreateGameForm onActiveGame={setGame} />
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
