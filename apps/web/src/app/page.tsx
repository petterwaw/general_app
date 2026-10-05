import { redirect } from 'next/navigation';

// No landing page yet; a temporary redirect keeps / free for one later.
export default function Home() {
  redirect('/games');
}
