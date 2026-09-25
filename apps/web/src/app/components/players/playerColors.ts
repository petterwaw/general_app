// A player keeps their seat colour everywhere: scorecard, avatar, turn pill, game log.
// Seats follow turnOrder (0-based), up to MAX_PLAYERS = 8.

// oklch hue of each seat colour, used to tint that player's blobatar
const PLAYER_HUES = [280, 345, 295, 80, 170, 245, 35, 315];

export function playerColor(seat: number) {
  return `var(--color-player-${(seat % PLAYER_HUES.length) + 1})`;
}

export function playerHue(seat: number) {
  return PLAYER_HUES[seat % PLAYER_HUES.length];
}
