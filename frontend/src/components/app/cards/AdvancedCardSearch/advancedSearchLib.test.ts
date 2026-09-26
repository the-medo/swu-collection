import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../../../../types/enums.ts';
import { premierSetMap } from '../../../../../../types/Format.ts';
import {
  areAllFutureSetsSelected,
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

  test('includes Homeworlds once configured for Premier, even before its release date', () => {
    const shortcuts = getCardSearchShortcutSetCodes('2026-09-26');

    expect(premierSetMap[SwuSet.HMW]).toBe(true);
    expect(shortcuts.premierSetCodes).toContain(SwuSet.HMW);
    expect(shortcuts.futureSetCodes).toEqual([]);
    expect(areAllFutureSetsSelected(shortcuts.premierSetCodes)).toBe(false);
    expect(toggleFutureSetSelection(shortcuts.premierSetCodes)).toEqual(shortcuts.premierSetCodes);
  });

  test('offers an unreleased set as a preview until it joins Premier', () => {
    const priorPremierSets = premierSetCodes.filter(set => set !== SwuSet.HMW);
    const { futureSetCodes } = getCardSearchShortcutSetCodes('2026-09-26', priorPremierSets);

    expect(futureSetCodes).toEqual([SwuSet.HMW]);
    expect(toggleFutureSetSelection([SwuSet.LAW], futureSetCodes)).toEqual([
      SwuSet.LAW,
      ...futureSetCodes,
    ]);
    expect(toggleFutureSetSelection([SwuSet.LAW, ...futureSetCodes], futureSetCodes)).toEqual([
      SwuSet.LAW,
    ]);
    expect(getCardSearchShortcutSetCodes('2026-10-02', priorPremierSets).futureSetCodes).toEqual(
      [],
    );
  });
});
