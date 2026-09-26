// A player keeps their seat colour everywhere: scorecard, avatar, turn pill, game log.
// Seats follow turnOrder (0-based), up to MAX_PLAYERS = 8.
// The one source of player colours, in oklch: the avatar takes the hue alone (blobatar tints
// with it), everything else paints the full colour.
const PLAYER_COLORS = [
  { l: 0.52, c: 0.232, h: 281 }, // violet
  { l: 0.719, c: 0.183, h: 343 }, // pink
  { l: 0.704, c: 0.148, h: 296 }, // lavender
  { l: 0.825, c: 0.149, h: 85 }, // yellow
  { l: 0.726, c: 0.123, h: 171 }, // teal
  { l: 0.705, c: 0.133, h: 243 }, // blue
  { l: 0.756, c: 0.148, h: 34 }, // coral
  { l: 0.557, c: 0.168, h: 317 }, // plum
];

function seatColor(seat: number) {
  return PLAYER_COLORS[seat % PLAYER_COLORS.length];
}

export function playerColor(seat: number) {
  const { l, c, h } = seatColor(seat);
  return `oklch(${l} ${c} ${h})`;
}

export function playerHue(seat: number) {
  return seatColor(seat).h;
}
