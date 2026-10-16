import { describe, expect, test } from 'bun:test';
import { cardPoolInfo } from '../../../lib/swu-resources/card-pool-info.ts';
import { SwuSet } from '../../../types/enums.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
import { cardList } from '../../db/lists.ts';
import { getCardPoolMap } from './card-pool-map-by-set.ts';
import { generateBoosterPack, generateCardPool } from './generate-card-pool.ts';

// Supply the five slot rolls (leader, rare, foil, HS common, bonus), then pick
// the first eligible card. No global Math.random mocking or statistical tests.
const slotRolls = (rolls: number[]) => {
  let index = 0;
  return () => rolls[index++] ?? 0;
};

describe('booster collation', () => {
  test('does not repeat regular commons, even when the random source repeats', () => {
    const pack = generateBoosterPack(getCardPoolMap(SwuSet.HMW), () => 0.5);
    expect(new Set(pack.slice(1, 9)).size).toBe(8);
  });

  test('does not repeat any regular uncommon when there is no bonus upgrade', () => {
    const pack = generateBoosterPack(getCardPoolMap(SwuSet.HMW), () => 0.5);
    expect(new Set(pack.slice(10, 13)).size).toBe(3);
  });

  test('allows a common in regular, Hyperspace and Hyperspace Foil slots', () => {
    const map = getCardPoolMap(SwuSet.HMW);
    const pack = generateBoosterPack(map, () => 0.5);
    expect(pack[9]).toBe(pack[1]);
    expect(pack[14]).toBe(pack[1]);
  });

  test('allows a foil uncommon to repeat a regular uncommon', () => {
    const pack = generateBoosterPack(getCardPoolMap(SwuSet.HMW), () => 0.2);
    expect(pack[14]).toBe(pack[10]);
  });

  test('allows a Hyperspace rare to repeat the regular rare', () => {
    const map = getCardPoolMap(SwuSet.HMW);
    const pack = generateBoosterPack(map, slotRolls([0.5, 0.5, 0.5, 0.5, 0.1]));
    expect(pack[12]).toBe(map.cards.Rare[0]);
    expect(pack[13]).toBe(pack[12]);
  });

  test('allows the same legendary in the rare and foil slots', () => {
    const map = getCardPoolMap(SwuSet.HMW);
    const pack = generateBoosterPack(map, () => 0);
    expect(pack[13]).toBe(map.cards.Legendary[0]);
    expect(pack[14]).toBe(pack[13]);
  });

  test('draws nine distinct regular commons when a legacy pack has no Hyperspace common', () => {
    const pack = generateBoosterPack(getCardPoolMap(SwuSet.LOF), () => 0.5);
    expect(new Set(pack.slice(1, 10)).size).toBe(9);
  });

  test('legacy Hyperspace commons can still repeat a regular common', () => {
    const pack = generateBoosterPack(getCardPoolMap(SwuSet.LOF), () => 0);
    expect(new Set(pack.slice(1, 9)).size).toBe(8);
    expect(pack[9]).toBe(pack[1]);
  });

  test('keeps repeated cards between packs and leaves cached card lists intact', () => {
    const map = getCardPoolMap(SwuSet.HMW);
    const before = structuredClone(map);
    const pool = generateCardPool(SwuSet.HMW, CardPoolType.Sealed, 8, () => 0.5);
    expect(pool).toHaveLength(120);
    for (let pack = 1; pack < 8; pack++) {
      expect(pool.slice(pack * 15, (pack + 1) * 15)).toEqual(pool.slice(0, 15));
    }
    expect(map).toEqual(before);
  });

  test('rejects missing slot cards instead of emitting undefined or retrying forever', () => {
    const map = structuredClone(getCardPoolMap(SwuSet.HMW));
    map.cards.Common = map.cards.Common.slice(0, 7);
    expect(() => generateBoosterPack(map, () => 0.5)).toThrow('8 distinct cards');
    const missingFoil = structuredClone(getCardPoolMap(SwuSet.HMW));
    missingFoil.foil.Legendary = [];
    expect(() => generateBoosterPack(missingFoil, () => 0)).toThrow('empty booster slot');
  });
});

describe('variant slot probabilities', () => {
  test.each([SwuSet.LOF, SwuSet.SEC, SwuSet.LAW, SwuSet.ASH, SwuSet.HMW])(
    '%s uses the published post-JTL legendary rate for the regular rare slot',
    set => {
      const map = getCardPoolMap(set);
      const belowBoundary = generateBoosterPack(
        map,
        slotRolls([0.5, 1 / 5 - 1e-8, 0.5, 0.5, 0.5]),
      );
      const atBoundary = generateBoosterPack(map, slotRolls([0.5, 1 / 5, 0.5, 0.5, 0.5]));
      expect(belowBoundary[13]).toBe(map.cards.Legendary[0]);
      expect(atBoundary[13]).toBe(map.cards.Rare[0]);
    },
  );

  test.each([SwuSet.LAW, SwuSet.ASH, SwuSet.HMW])(
    '%s uses the modern bonus slot boundaries',
    set => {
      const map = getCardPoolMap(set);
      for (const [roll, expectedCard] of [
        [0, map.prestige[0]],
        [1 / 18 - 1e-8, map.prestige[0]],
        [1 / 18, map.hyperspace.Rare[0]],
        [1 / 18 + 1 / 12, map.hyperspace.Legendary[0]],
        [1 / 18 + 1 / 12 + 1 / 48, map.cards.Uncommon[2]],
      ] as const) {
        const pack = generateBoosterPack(map, slotRolls([0.5, 0.5, 0.5, 0.5, roll]));
        expect(pack).toHaveLength(15);
        expect(pack[12]).toBe(expectedCard);
      }
    },
  );

  test.each([SwuSet.LOF, SwuSet.SEC])('%s has Hyperspace upgrades but no Prestige', set => {
    const map = getCardPoolMap(set);
    for (const [roll, expectedCard] of [
      [0, map.hyperspace.Rare[0]],
      [1 / 21, map.hyperspace.Legendary[0]],
      [1 / 21 + 1 / 53, map.cards.Uncommon[2]],
    ] as const) {
      const pack = generateBoosterPack(map, slotRolls([0.5, 0.5, 0.5, 0.5, roll]));
      expect(pack[12]).toBe(expectedCard);
    }
  });

  test.each([SwuSet.LOF, SwuSet.SEC, SwuSet.LAW, SwuSet.ASH, SwuSet.HMW])(
    '%s treats foil probabilities as individual weights',
    set => {
      const map = getCardPoolMap(set);
      const legacy = [SwuSet.LOF, SwuSet.SEC].includes(set);
      const legendary = legacy ? 0.02 : 1 / 96;
      const rare = legacy ? 0.06 : 1 / 24;
      for (const [roll, rarity] of [
        [0, 'Legendary'],
        [legendary - 1e-8, 'Legendary'],
        [legendary, 'Special'],
        [legendary + 0.04, 'Rare'],
        [legendary + 0.04 + rare, 'Uncommon'],
        [legendary + 0.04 + rare + 0.23, 'Common'],
      ] as const) {
        const pack = generateBoosterPack(map, slotRolls([0.5, 0.5, roll, 0.5, 0.5]));
        expect(cardList[pack[14]]?.rarity).toBe(rarity);
      }
    },
  );
});

describe('variant catalog eligibility', () => {
  test('recognizes HMW foil flags and older explicit names with missing finish flags', () => {
    for (const set of [SwuSet.LOF, SwuSet.HMW]) {
      const map = getCardPoolMap(set);
      expect(map.hyperspace.Common).toContain('pounce');
      expect(map.foil.Common).toContain('pounce');
      expect(map.foil.Common.filter(id => id === 'pounce')).toHaveLength(1);
    }
  });

  test("Prestige draws only use the selected set's non-foil Prestige printings", () => {
    for (const set of Object.keys(cardPoolInfo) as SwuSet[]) {
      const map = getCardPoolMap(set);
      expect(map.prestige.length).toBeGreaterThan(0);
      expect(new Set(map.prestige).size).toBe(map.prestige.length);
      for (const id of map.prestige) {
        expect(
          Object.values(cardList[id]!.variants).some(
            v => v?.set === set && v.variantName === 'Standard Prestige',
          ),
        ).toBe(true);
      }
    }
  });

  test('all supported sets produce valid pools at every rarity boundary', () => {
    for (const set of Object.keys(cardPoolInfo) as SwuSet[]) {
      const map = getCardPoolMap(set);
      for (const slot of [...Object.values(map.hyperspace), ...Object.values(map.foil)]) {
        expect(slot.length).toBeGreaterThan(0);
        expect(new Set(slot).size).toBe(slot.length);
      }
      for (const roll of [0, 0.03, 0.07, 0.15, 0.5, 0.999999]) {
        const pool = generateCardPool(set, CardPoolType.Sealed, 8, () => roll);
        expect(pool).toHaveLength(120);
        expect(pool.every(id => !!cardList[id])).toBe(true);
        expect(pool.filter(id => cardList[id]?.type === 'Leader')).toHaveLength(8);
      }
    }
  });
});
