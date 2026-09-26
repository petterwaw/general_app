// No height here: min-h-screen (100vh) is taller than a phone's visible window while its address
// bar shows, so the page scrolled. The pages below set their own min-h-dvh.
export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main>{children}</main>;
}
