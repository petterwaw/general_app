import { useState } from 'react';

import { makeRandom } from './seededRandom';

// Full-screen cover built from square "pixels" that pop in one by one in a scattered order
// (after React Bits' Pixel Swap). Once every pixel is in, a solid layer with `children` takes over;
// it scrolls when the children are taller than the screen (safe centring keeps their top in reach).
const PIXEL_SIZE = 64;
// big screens get bigger pixels instead of more of them
const MAX_PIXELS = 220;
// the whole cover (the content may start its own entrance once it is complete), and one pixel's pop
export const PIXEL_COVER_MS = 1400;
const PIXEL_MS = 450;

type Pixel = { left: number; top: number; delay: number };

function buildGrid(width: number, height: number) {
  let size = PIXEL_SIZE;
  let columns = Math.ceil(width / size);
  let rows = Math.ceil(height / size);
  if (columns * rows > MAX_PIXELS) {
    size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS));
    columns = Math.ceil(width / size);
    rows = Math.ceil(height / size);
  }

  // the grid overhangs the screen evenly on both sides, so edge pixels stay square
  const originX = (width - columns * size) / 2;
  const originY = (height - rows * size) / 2;
  const pixels: Pixel[] = [];
  // a fixed seed: the same scattered order every time
  const random = makeRandom(1);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      pixels.push({
        left: originX + column * size,
        top: originY + row * size,
        delay: random() * (PIXEL_COVER_MS - PIXEL_MS),
      });
    }
  }
  return { size, pixels };
}

export default function PixelCover({ children }: { children: React.ReactNode }) {
  // measured once: after the cover the solid layer fills any window size
  const [grid] = useState(() => buildGrid(window.innerWidth, window.innerHeight));

  return (
    <div className="fixed inset-0 overflow-hidden">
      {grid.pixels.map((pixel, index) => (
        <div
          key={index}
          className="absolute animate-pixel-in bg-felt motion-reduce:animate-none"
          style={{
            left: pixel.left,
            top: pixel.top,
            // 1px overlap hides hairline seams between neighbours
            width: grid.size + 1,
            height: grid.size + 1,
            animationDelay: `${pixel.delay}ms`,
          }}
        />
      ))}

      <div
        className="absolute inset-0 grid animate-fade-in items-center-safe justify-items-center overflow-y-auto bg-felt px-4 py-12 motion-reduce:animate-none"
        style={{ animationDelay: `${PIXEL_COVER_MS}ms` }}
      >
        {children}
      </div>
    </div>
  );
}
