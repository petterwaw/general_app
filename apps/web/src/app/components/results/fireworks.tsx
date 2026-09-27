import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '../ui/reducedMotion';
import { makeRandom } from './seededRandom';

// Fireworks over the whole screen for a few seconds (after tsParticles' "fireworks2" preset, without
// the library and without sound): rockets with trails rise, burst high up into coloured sparks with
// trails, which fall and fade. Decorative only: pointer events pass through.
// new rockets keep launching this long; the last ones then burst and fade
const LAUNCH_FOR_MS = 5000;
// time between launches, jittered
const LAUNCH_EVERY_MS = 230;
const SPARKS = 70;
// per 60fps frame; the simulation is scaled by the real frame time
const GRAVITY = 0.07;
// rockets slow down harder than the sparks fall
const ROCKET_GRAVITY = 0.12;
const DRAG = 0.975;
const TRAIL = 8;

type Point = { x: number; y: number };
type Spark = Point & { vx: number; vy: number; life: number; maxLife: number; hue: number; trail: Point[] };
type Rocket = Point & { vx: number; vy: number; burstY: number; hue: number; trail: Point[] };

function drawTrail(context: CanvasRenderingContext2D, trail: Point[], color: string, width: number) {
  if (trail.length < 2) return;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(trail[0].x, trail[0].y);
  for (const point of trail) context.lineTo(point.x, point.y);
  context.stroke();
}

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    if (prefersReducedMotion()) return;

    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    context.lineCap = 'round';

    const random = makeRandom(Date.now());
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    let nextLaunch = 0;

    function launch() {
      const y = height;
      const x = width * (0.05 + random() * 0.9);
      // bursts in the top 12-40% of the screen
      const burstY = height * (0.12 + random() * 0.28);
      // leaning left or right, up to ~30 degrees off vertical, but bursting on screen
      const burstX = Math.min(width * 0.92, Math.max(width * 0.08, x + (random() - 0.5) * 1.15 * (y - burstY)));
      // just enough speed to reach burstY while slowing down on the way up
      const vy = -Math.sqrt(2 * ROCKET_GRAVITY * (y - burstY)) - 0.5;
      // frames to the top, spent drifting sideways to burstX
      const frames = -vy / ROCKET_GRAVITY;
      rockets.push({
        x,
        y,
        vx: (burstX - x) / frames,
        vy,
        burstY,
        hue: random() * 360,
        trail: [],
      });
    }

    function burst(rocket: Rocket) {
      for (let i = 0; i < SPARKS; i += 1) {
        const angle = random() * Math.PI * 2;
        const speed = 1.5 + random() * 4.5;
        const maxLife = 60 + random() * 60;
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          // each burst in its own colour, with a little spread like the preset's rainbow
          hue: rocket.hue + (random() - 0.5) * 50,
          trail: [],
        });
      }
    }

    let frame = 0;
    let start: number | null = null;
    let previous = 0;

    function tick(now: number) {
      if (!context) return;
      start ??= now;
      const elapsed = now - start;
      // frames of 60fps that passed, capped so a hidden tab does not teleport everything
      const step = previous ? Math.min((now - previous) / (1000 / 60), 3) : 1;
      previous = now;

      context.clearRect(0, 0, width, height);

      while (elapsed >= nextLaunch && nextLaunch < LAUNCH_FOR_MS) {
        launch();
        nextLaunch += LAUNCH_EVERY_MS * (0.5 + random());
      }

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const rocket = rockets[i];
        rocket.vy += ROCKET_GRAVITY * step;
        rocket.x += rocket.vx * step;
        rocket.y += rocket.vy * step;
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > TRAIL * 2) rocket.trail.shift();
        drawTrail(context, rocket.trail, 'rgb(240 240 240 / 0.9)', 2);

        if (rocket.y <= rocket.burstY || rocket.vy >= 0) {
          burst(rocket);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.vx *= Math.pow(DRAG, step);
        spark.vy = spark.vy * Math.pow(DRAG, step) + GRAVITY * step;
        spark.x += spark.vx * step;
        spark.y += spark.vy * step;
        spark.life -= step;
        spark.trail.push({ x: spark.x, y: spark.y });
        if (spark.trail.length > TRAIL) spark.trail.shift();

        const alpha = Math.max(0, spark.life / spark.maxLife);
        drawTrail(context, spark.trail, `hsl(${spark.hue} 100% 62% / ${alpha})`, 2.5);
        if (spark.life <= 0 || spark.y > height) sparks.splice(i, 1);
      }

      if (nextLaunch < LAUNCH_FOR_MS || rockets.length > 0 || sparks.length > 0) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 size-full motion-reduce:hidden"
    />
  );
}
