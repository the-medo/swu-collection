import { describe, expect, test } from 'bun:test';
import { getWinrateColorClass } from './getWinrateColorClass.ts';

describe('getWinrateColorClass', () => {
  test('increases heatmap intensity as results move away from 50% in both themes', () => {
    const cases: [winrate: number, expectedClass: string][] = [
      [58, 'bg-green-300 dark:bg-green-700'],
      [54, 'bg-green-200 dark:bg-green-800'],
      [52, 'bg-green-100 dark:bg-green-900'],
      [50, 'bg-green-50 dark:bg-green-950/30'],
      [48, 'bg-red-50 dark:bg-red-950/30'],
      [46, 'bg-red-100 dark:bg-red-900'],
      [42, 'bg-red-200 dark:bg-red-800'],
      [41, 'bg-red-300 dark:bg-red-700'],
    ];

    for (const [winrate, expectedClass] of cases) {
      expect(getWinrateColorClass(winrate)).toBe(expectedClass);
    }
  });
});
