export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        {children}
      </div>
    </main>
  );
}