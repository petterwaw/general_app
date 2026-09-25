import GameFrame from '../../components/game/gameFrame';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GameFrame>{children}</GameFrame>;
}
