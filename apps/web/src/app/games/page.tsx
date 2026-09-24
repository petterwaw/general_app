"use client";

import { useState } from "react";

import { GameModeSwitch } from "../components/gameCreate/gameModeSwitch";
import { OfflineGameForm } from "../components/gameCreate/offlineGameForm";
import { OnlineGameForm } from "../components/gameCreate/onlineGameForm";

type GameMode = "offline" | "online";

export default function GamesPage() {
  const [mode, setMode] = useState<GameMode>("offline");

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12 text-neutral-950">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Create game
          </h1>
        </div>

        <GameModeSwitch
          mode={mode}
          onChange={setMode}
        />

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {mode === "offline" ? (
            <OfflineGameForm />
          ) : (
            <OnlineGameForm />
          )}
        </section>
      </div>
    </main>
  );
}