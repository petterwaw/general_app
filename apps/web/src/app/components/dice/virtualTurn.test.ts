import { describe, expect, it } from 'vitest';
import { canReroll, entranceOrder, toggleHeld } from './virtualTurn';

// A turn on virtual dice from docs/DECYZJE.md §4 (holding, at most 3 rolls, only on your own turn)
// and the dice entrance from docs/DESIGN.md (rerolled dice come in one by one from the left).

describe('toggleHeld', () => {
  it('holds a die that was free', () => {
    expect(toggleHeld([], 2)).toEqual([2]);
  });

  it('keeps the dice held before when holding another one', () => {
    expect(toggleHeld([0, 4], 2)).toEqual(expect.arrayContaining([0, 2, 4]));
    expect(toggleHeld([0, 4], 2)).toHaveLength(3);
  });

  it('releases a die held before, so the choice can change before every roll', () => {
    expect(toggleHeld([1, 3], 1)).toEqual([3]);
  });

  it('leaves the held dice it was given unchanged', () => {
    const held = [1, 3];
    toggleHeld(held, 1);
    toggleHeld(held, 0);
    expect(held).toEqual([1, 3]);
  });
});

describe('canReroll', () => {
  it('allows the second and the third roll of my turn', () => {
    expect(canReroll(1, true, false)).toBe(true);
    expect(canReroll(2, true, false)).toBe(true);
  });

  it('refuses a fourth roll', () => {
    expect(canReroll(3, true, false)).toBe(false);
  });

  it("refuses a roll on another player's turn", () => {
    expect(canReroll(1, false, false)).toBe(false);
  });

  it('refuses a roll while the previous action is on its way', () => {
    expect(canReroll(1, true, true)).toBe(false);
  });

  it('refuses a roll when there are no dice on the table', () => {
    expect(canReroll(null, true, false)).toBe(false);
  });
});

describe('entranceOrder', () => {
  it('brings all five dice in from the left when nothing was held', () => {
    expect(entranceOrder([])).toEqual([0, 1, 2, 3, 4]);
  });

  it('leaves held dice in place and queues only the rerolled ones, left to right', () => {
    expect(entranceOrder([1, 3])).toEqual([0, null, 1, null, 2]);
  });

  it('does not depend on the order the held positions are listed in', () => {
    expect(entranceOrder([3, 1])).toEqual(entranceOrder([1, 3]));
  });

  it('brings in nothing when every die was held', () => {
    expect(entranceOrder([0, 1, 2, 3, 4])).toEqual([null, null, null, null, null]);
  });
});
