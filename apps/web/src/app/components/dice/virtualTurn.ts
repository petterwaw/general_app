// A turn on virtual dice, as the screen of the player whose turn it is shapes it. The server still
// decides: it refuses a fourth roll or a roll out of turn whatever these say.

// Clicking a die holds it for the next roll; clicking it again releases it (docs/DECYZJE.md §4).
// `held` lists die positions 0–4. Returns a new array and leaves `held` as it was.
export function toggleHeld(held: number[], index: number): number[] {
  // TODO(Piotr): index already in held → without it; otherwise → held plus index
  if (held.includes(index)) {
    held = held.filter( item => item !== index)
  }
  else {
    held = [...held, index]
  }
  return held;
}

// Whether the Reroll button takes a click: it is this device's turn, no request is on its way,
// and the turn has a roll left (at most 3 a turn; the first one the server makes by itself).
export function canReroll(rollNumber: number | null, myTurn: boolean, pending: boolean): boolean {
  // TODO(Piotr)
  if(!rollNumber) return false
  if(pending) return false
  if(!myTurn) return false
  if(rollNumber < 3) {
    return true
  }
  return false;
}
