import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INVITE_CODE_LENGTH, inviteCodeSchema } from '@dice-app/contracts';

import { Button } from '../ui/button';

export function JoinCodeForm() {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const parsed = inviteCodeSchema.safeParse(code);
  const canJoin = parsed.success && !pending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canJoin) return;
    setPending(true);
    router.push(`/join/${parsed.data}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="rounded-panel bg-white/60 px-3.5 py-2.5 transition-colors duration-150 focus-within:bg-white">
        <input
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC234"
          aria-label="Invite code"
          maxLength={INVITE_CODE_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-9 w-full bg-transparent text-center text-xl font-extrabold tracking-[0.3em] text-ink caret-primary placeholder:font-semibold placeholder:text-ink-faint focus-visible:outline-none!"
        />
      </div>
      <Button type="submit" size="lg" disabled={!canJoin} loading={pending}>
        Join game
      </Button>
    </form>
  );
}
