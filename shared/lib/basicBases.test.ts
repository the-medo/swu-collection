import { describe, expect, test } from 'bun:test';
import type { CardDataWithVariants, CardList } from '../../lib/swu-resources/types.ts';
import { SwuAspect, SwuSet } from '../../types/enums.ts';
import {
  baseSpecialNames,
  getBasicBaseIdsForSet,
  getHomeworldBasicBaseIdsForTrait,
  homeworldBaseTraits,
  homeworldBasicBaseIds,
  homeworldBasicBasesByTrait,
} from './basicBases.ts';

const baseCard = (cardId: string, aspect: SwuAspect, set: SwuSet) =>
  ({ cardId, aspects: [aspect], set }) as CardDataWithVariants;

const homeworldCardList = Object.entries(homeworldBasicBasesByTrait).reduce(
  (cards, [, basesByAspect]) => {
    Object.entries(basesByAspect).forEach(([aspect, cardId]) => {
      const isReprint = ['shield-generator-complex', 'theed-palace', 'mos-eisley'].includes(cardId);
      cards[cardId] = baseCard(cardId, aspect as SwuAspect, isReprint ? SwuSet.JTL : SwuSet.HMW);
    });
    return cards;
  },
  {} as CardList,
);

describe('Homeworlds basic bases', () => {
  test('defines four unique bases for every trait', () => {
    expect(homeworldBaseTraits).toEqual(['Tatooine', 'Naboo', 'Kashyyyk', 'Endor']);
    expect(homeworldBasicBaseIds).toHaveLength(16);
    expect(new Set(homeworldBasicBaseIds).size).toBe(16);

    homeworldBaseTraits.forEach(trait => {
      expect(getHomeworldBasicBaseIdsForTrait(trait)).toHaveLength(4);
    });
  });

  test('maps every Homeworlds base to its aspect special name', () => {
    homeworldBaseTraits.forEach(trait => {
      Object.entries(homeworldBasicBasesByTrait[trait]).forEach(([aspect, cardId]) => {
        expect(baseSpecialNames[cardId]).toBe(aspect);
      });
    });
  });

  test('keeps the three reprints in the complete Homeworlds set', () => {
    const baseIds = getBasicBaseIdsForSet(SwuSet.HMW, homeworldCardList, true);

    expect(baseIds).toHaveLength(16);
    expect(baseIds).toContain('shield-generator-complex');
    expect(baseIds).toContain('theed-palace');
    expect(baseIds).toContain('mos-eisley');
  });
});
