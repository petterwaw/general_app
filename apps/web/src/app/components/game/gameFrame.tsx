// Page frame of /games/[id]: full window width, at least the window height. The game screen picks
// its column layout from that width and, in the column layouts, fills the height (flex-1).
// Kept out of app/games/[gameId]/: the dev server does not rebuild Tailwind CSS for edits under
// bracketed route folders, so classes written there only show up after a restart.
export default function GameFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col gap-5 p-4">{children}</div>;
}
