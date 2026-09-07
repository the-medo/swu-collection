import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../../../../types/enums.ts';
import {
  isPremierOnlySetSelection,
  premierSetCodes,
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
});
