import { expect, test } from 'bun:test';
import { buildCardDeckCounts, getCardDeckCount } from './cardDeckCounts.ts';

test('known deck totals normalize equivalent bases and exclude unidentified decks', () => {
  const counts = buildCardDeckCounts([
    { leaderCardId: 'leader-a', baseCardId: 'echo-base' },
    { leaderCardId: 'leader-a', baseCardId: 'command-center' },
    { leaderCardId: 'leader-a', baseCardId: 'energy-conversion-lab' },
    { leaderCardId: 'leader-b', baseCardId: 'echo-base' },
    { leaderCardId: null, baseCardId: 'echo-base' },
    { leaderCardId: 'leader-a', baseCardId: '' },
  ]);
  expect(counts.totalDeckCount).toBe(4);
  expect(getCardDeckCount(counts, 'leader-a')).toBe(3);
  expect(getCardDeckCount(counts, 'leader-a', 'Command')).toBe(2);
  expect(getCardDeckCount(counts, 'leader-a', 'echo-base')).toBe(2);
  expect(getCardDeckCount(counts, 'leader-a', 'energy-conversion-lab')).toBe(1);
  expect(getCardDeckCount(counts, 'unknown')).toBe(0);
});

test('SQL grouped counts and loaded deck entries produce the same denominators', () => {
  const entries = [
    ...Array.from({ length: 100 }, () => ({ leaderCardId: 'a', baseCardId: 'echo-base' })),
    ...Array.from({ length: 200 }, () => ({ leaderCardId: 'a', baseCardId: 'command-center' })),
  ];
  const grouped = buildCardDeckCounts([
    { leaderCardId: 'a', baseCardId: 'echo-base', count: 100 },
    { leaderCardId: 'a', baseCardId: 'command-center', count: 200 },
  ]);
  expect(grouped).toEqual(buildCardDeckCounts(entries));
  expect(grouped.totalDeckCount).toBe(300);
});

test('missing counts remain unknown, while an empty scope has a known zero total', () => {
  expect(getCardDeckCount(undefined)).toBeUndefined();
  expect(getCardDeckCount(buildCardDeckCounts([]))).toBe(0);
  expect(getCardDeckCount(buildCardDeckCounts([]), undefined, 'Command')).toBeUndefined();
});
