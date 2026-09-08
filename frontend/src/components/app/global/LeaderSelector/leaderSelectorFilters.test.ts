import { describe, expect, test } from 'bun:test';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import {
  isLeaderSetAvailableForFormat,
  matchesLeaderCostFilter,
  matchesLeaderSearch,
  matchesLeaderSetFilter,
} from './leaderSelectorFilters.ts';

const leader = (
  set: SwuSet,
  cost: number | null,
  name = 'Luke Skywalker - Faithful Friend',
  traits = ['Force', 'Rebel'],
) => ({ set, cost, name, traits }) as CardDataWithVariants<CardListVariants>;

describe('leader selector filters', () => {
  test('matches one set and clears back to all sets', () => {
    const hmwLeader = leader(SwuSet.HMW, 6);

    expect(matchesLeaderSetFilter(hmwLeader, SwuSet.HMW)).toBe(true);
    expect(matchesLeaderSetFilter(hmwLeader, SwuSet.ASH)).toBe(false);
    expect(matchesLeaderSetFilter(hmwLeader, undefined)).toBe(true);
  });

  test('matches exact costs from 4 through 6', () => {
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 4), '4')).toBe(true);
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 5), '4')).toBe(false);
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 6), '6')).toBe(true);
  });

  test('matches every cost at or above 7 in the 7+ bucket', () => {
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 6), '7+')).toBe(false);
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 7), '7+')).toBe(true);
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, 9), '7+')).toBe(true);
  });

  test('does not match a missing cost while a cost filter is active', () => {
    expect(matchesLeaderCostFilter(leader(SwuSet.HMW, null), '4')).toBe(false);
    expect(matchesLeaderCostFilter(undefined, '7+')).toBe(false);
    expect(matchesLeaderCostFilter(undefined, undefined)).toBe(true);
  });

  test('searches leader names and traits case-insensitively', () => {
    const luke = leader(SwuSet.SOR, 6);

    expect(matchesLeaderSearch(luke, 'skywalker')).toBe(true);
    expect(matchesLeaderSearch(luke, 'force')).toBe(true);
    expect(matchesLeaderSearch(luke, 'imperial')).toBe(false);
    expect(matchesLeaderSearch(luke, '   ')).toBe(true);
  });

  test('limits set choices when a format supplies a set map', () => {
    const premierSets = { [SwuSet.JTL]: true, [SwuSet.HMW]: true } as const;

    expect(isLeaderSetAvailableForFormat(SwuSet.HMW, premierSets)).toBe(true);
    expect(isLeaderSetAvailableForFormat(SwuSet.SOR, premierSets)).toBe(false);
    expect(isLeaderSetAvailableForFormat(SwuSet.SOR, undefined)).toBe(true);
  });
});
