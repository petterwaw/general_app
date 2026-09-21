import RollOffline from './components/rollOffline'

export default async function Home() {
  const res = await fetch('http://localhost:3000/games', { cache: 'no-store' });
  const healthStatus = await res.text();

  return <>
    <RollOffline gameId={'cmu5ukx07000010ql3uw3fbf6'}/>
  </>;
}

