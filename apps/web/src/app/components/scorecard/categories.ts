import type { Category, DieFace } from '@dice-app/contracts';

// Row order and English names from docs/DESIGN.md. Never "Yahtzee" (trademark).
export const UPPER_ROWS: { category: Category; label: string; face: DieFace }[] = [
  { category: 'one', label: 'Ones', face: 1 },
  { category: 'two', label: 'Twos', face: 2 },
  { category: 'three', label: 'Threes', face: 3 },
  { category: 'four', label: 'Fours', face: 4 },
  { category: 'five', label: 'Fives', face: 5 },
  { category: 'six', label: 'Sixes', face: 6 },
];

export const LOWER_ROWS: { category: Category; label: string }[] = [
  { category: 'pair', label: 'One Pair' },
  { category: 'twoPairs', label: 'Two Pairs' },
  { category: 'threeOfKind', label: 'Three of a Kind' },
  { category: 'fourOfKind', label: 'Four of a Kind' },
  { category: 'smallStraight', label: 'Small Straight' },
  { category: 'largeStraight', label: 'Large Straight' },
  { category: 'full', label: 'Full House' },
  { category: 'chance', label: 'Chance' },
  { category: 'general', label: 'General' },
];
