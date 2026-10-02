// A turn on virtual dice, as the screen of the player whose turn it is shapes it. The server still
// decides: it refuses a fourth roll or a roll out of turn whatever these say.

// Clicking a die holds it for the next roll; clicking it again releases it (docs/DECYZJE.md §4).
// `held` lists die positions 0–4. Returns a new array and leaves `held` as it was.
export function toggleHeld(held: number[], index: number): number[] {
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
  if(!rollNumber) return false
  if(pending) return false
  if(!myTurn) return false
  if(rollNumber < 3) {
    return true
  }
  return false;
}

// After a roll, the dice that were rolled come onto the table one after another from the left;
// the held ones stay where they are (docs/DESIGN.md). For each position 0–4: its place in that
// queue (0 for the first rolled die, 1 for the next…), or null for a die that was held.
// E.g. heldInLastRoll [1, 3] → [0, null, 1, null, 2]; nothing held → [0, 1, 2, 3, 4].
export function entranceOrder(heldInLastRoll: number[]): (number | null)[] {
  const order: (number | null)[] = [];
  let next = 0;
  for (let index = 0; index < 5; index++) {
    order.push(heldInLastRoll.includes(index) ? null : next++);
  }
  return order;
}
