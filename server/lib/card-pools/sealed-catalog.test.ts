import { describe, expect, spyOn, test } from 'bun:test';
import { cardPoolInfo, cardPoolSets } from '../../../lib/swu-resources/card-pool-info.ts';
import { getBasicBaseIdsForSet } from '../../../shared/lib/basicBases.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
import { SwuSet } from '../../../types/enums.ts';
import { cardList } from '../../db/lists.ts';
import { getCardPoolMap } from './card-pool-map-by-set.ts';
import { generateBoosterPack, generateCardPool } from './generate-card-pool.ts';

describe('sealed catalog eligibility', () => {
  test.each([
    [SwuSet.LOF, 'pounce'],
    [SwuSet.SEC, 'grassroots-resistance'],
    [SwuSet.LAW, 'inspired-recruit'],
    [SwuSet.HMW, 'devotion'],
    [SwuSet.HMW, 'pounce'],
  ] as const)('%s packs can actually draw the reprint %s', (set, cardId) => {
    const poolMap = getCardPoolMap(set);
    const index = poolMap.cards.Common.indexOf(cardId);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(poolMap.cards.Common.filter(id => id === cardId)).toHaveLength(1);

    // Put the random draw inside this reprint's common slot, without a flaky
    // statistical assertion or depending on the card's top-level set.
    const random = spyOn(Math, 'random').mockReturnValue(
      (index + 0.5) / poolMap.cards.Common.length,
    );
    try {
      expect(generateBoosterPack(poolMap)).toContain(cardId);
    } finally {
      random.mockRestore();
    }
  });

  test('every supported set has populated booster slots and excludes tokens and basic bases', () => {
    for (const set of Object.keys(cardPoolInfo) as SwuSet[]) {
      const poolMap = getCardPoolMap(set);
      for (const cards of [
        poolMap.leaders.Common,
        poolMap.leaders.Rare,
        ...Object.values(poolMap.cards),
      ]) {
        expect(cards.length).toBeGreaterThan(0);
        expect(new Set(cards).size).toBe(cards.length);
        for (const cardId of cards) {
          const card = cardList[cardId]!;
          expect(card.type).not.toContain('Token');
          expect(card.type === 'Base' && card.rarity === 'Common').toBe(false);
        }
      }
    }
  });
});

describe('Homeworlds sealed', () => {
  test('offers Homeworlds and generates six or eight complete packs', () => {
    expect(cardPoolSets).toContainEqual(expect.objectContaining({ code: SwuSet.HMW }));
    for (const packs of [6, 8] as const) {
      const pool = generateCardPool(SwuSet.HMW, CardPoolType.Sealed, packs);
      expect(pool).toHaveLength(packs * 15);
      expect(pool.every(cardId => !!cardList[cardId])).toBe(true);
      expect(pool.filter(cardId => cardList[cardId]?.type === 'Leader')).toHaveLength(packs);
    }
  });

  test('adds the two requested prerelease leaders', () => {
    const pool = generateCardPool(SwuSet.HMW, CardPoolType.Prerelease);
    expect(pool).toHaveLength(92);
    expect(pool.slice(0, 2)).toEqual([
      'grand-moff-tarkin--tyrant-of-the-outer-rim',
      'chewbacca--relentless-rebel',
    ]);
    expect(pool.every(cardId => !!cardList[cardId])).toBe(true);
    const leaders = getCardPoolMap(SwuSet.HMW).leaders;
    for (const cardId of pool.slice(0, 2)) {
      const card = cardList[cardId]!;
      expect(card.type).toBe('Leader');
      expect(Object.values(card.variants).some(v => v?.set === SwuSet.HMW)).toBe(true);
      expect(leaders.Common).not.toContain(cardId);
      expect(leaders.Rare).not.toContain(cardId);
    }
  });

  test('offers all sixteen basic bases, including reprinted bases', () => {
    const baseIds = getBasicBaseIdsForSet(SwuSet.HMW, cardList, true);
    expect(new Set(baseIds).size).toBe(16);
    for (const cardId of baseIds) {
      const card = cardList[cardId]!;
      expect(card.type).toBe('Base');
      expect(card.rarity).toBe('Common');
      expect(Object.values(card.variants).some(v => v?.set === SwuSet.HMW)).toBe(true);
    }
  });
});
