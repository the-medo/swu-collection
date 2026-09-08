import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../../../../types/enums.ts';
import {
  getCardSearchShortcutSetCodes,
  isPremierOnlySetSelection,
  premierSetCodes,
  toggleFutureSetSelection,
  togglePremierOnlySetSelection,
} from './advancedSearchLib.ts';

describe('Premier-only card search shortcut', () => {
  test('replaces any other selection with the Premier-legal sets', () => {
    expect(togglePremierOnlySetSelection([SwuSet.TS26])).toEqual(premierSetCodes);
  });

  test('recognizes the Premier selection regardless of order and toggles it off', () => {
    const reversedPremierSets = [...premierSetCodes].reverse();

    expect(isPremierOnlySetSelection(reversedPremierSets)).toBe(true);
    expect(togglePremierOnlySetSelection(reversedPremierSets)).toEqual([]);
  });

  test('does not treat Premier plus an extra set as Premier-only', () => {
    const selection = [...premierSetCodes, SwuSet.TS26];

    expect(isPremierOnlySetSelection(selection)).toBe(false);
    expect(togglePremierOnlySetSelection(selection)).toEqual(premierSetCodes);
  });

  test('keeps future releases out of the Premier selection', () => {
    const shortcuts = getCardSearchShortcutSetCodes('2026-09-08');

    expect(shortcuts.premierSetCodes).not.toContain(SwuSet.HMW);
    expect(shortcuts.futureSetCodes).toContain(SwuSet.HMW);
  });

  test('adds and removes future releases without changing the other selected sets', () => {
    const { futureSetCodes } = getCardSearchShortcutSetCodes('2026-09-08');

    expect(toggleFutureSetSelection([SwuSet.LAW], futureSetCodes)).toEqual([
      SwuSet.LAW,
      ...futureSetCodes,
    ]);
    expect(toggleFutureSetSelection([SwuSet.LAW, ...futureSetCodes], futureSetCodes)).toEqual([
      SwuSet.LAW,
    ]);
  });
});
