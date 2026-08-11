export default async function Home() {
  const res = await fetch('http://localhost:3001/health', { cache: 'no-store' });
  const healthStatus = await res.text();

  return <h1>{healthStatus}</h1>;
}

