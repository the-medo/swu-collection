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
    expect(shortcuts.futureSetCodes).toEqual([SwuSet.IC27]);
    expect(areAllFutureSetsSelected(shortcuts.premierSetCodes)).toBe(false);
    expect(toggleFutureSetSelection(shortcuts.premierSetCodes)).toEqual([
      ...shortcuts.premierSetCodes,
      SwuSet.IC27,
    ]);
  });

  test('offers an unreleased set as a preview until it joins Premier', () => {
    const priorPremierSets = [...premierSetCodes, SwuSet.IC27].filter(set => set !== SwuSet.HMW);
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

  test('offers IC27 through Preview while keeping it out of the Premier shortcut', () => {
    const shortcuts = getCardSearchShortcutSetCodes('2026-11-06');

    expect(shortcuts.premierSetCodes).not.toContain(SwuSet.IC27);
    expect(shortcuts.premierSetCodes).toContain(SwuSet.HMW);
    expect(shortcuts.futureSetCodes).toEqual([SwuSet.IC27]);
    expect(toggleFutureSetSelection([SwuSet.HMW], shortcuts.futureSetCodes)).toEqual([
      SwuSet.HMW,
      SwuSet.IC27,
    ]);
    expect(toggleFutureSetSelection([SwuSet.HMW, SwuSet.IC27], shortcuts.futureSetCodes)).toEqual([
      SwuSet.HMW,
    ]);
  });

  test('keeps the preview shortcut aligned with the configured format until promotion', () => {
    expect(getCardSearchShortcutSetCodes('2026-11-20').futureSetCodes).toEqual([SwuSet.IC27]);
    expect(
      getCardSearchShortcutSetCodes('2026-11-20', [...premierSetCodes, SwuSet.IC27]).futureSetCodes,
    ).toEqual([]);
  });
});
