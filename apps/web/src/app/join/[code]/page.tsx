import { JoinByCode } from '../../components/gameJoin/joinByCode';

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex min-h-dvh flex-col">
      <JoinByCode code={code} />
    </main>
  );
}
