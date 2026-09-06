import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import { findUnmatchedCardPriceVariants } from './findUnmatchedCardPriceVariants.ts';

const cardList = {
  card: {
    name: 'Test Card',
    variants: {
      sor: { variantId: 'sor', set: SwuSet.SOR, cardNo: 2, variantName: 'Standard' },
      shd: { variantId: 'shd', set: SwuSet.SHD, cardNo: 1, variantName: 'Hyperspace' },
    },
  },
} as unknown as CardList;

describe('findUnmatchedCardPriceVariants', () => {
  test('subtracts matched identifiers and applies the selected set', () => {
    const result = findUnmatchedCardPriceVariants(
      cardList,
      [{ cardId: 'card', variantId: 'sor' }],
      SwuSet.SHD,
    );

    expect(result.map(row => [row.cardId, row.variant.variantId])).toEqual([['card', 'shd']]);
  });

  test('searches every set when none is selected', () => {
    const result = findUnmatchedCardPriceVariants(cardList, [], null);

    expect(result.map(row => row.variant.variantId)).toEqual(['shd', 'sor']);
  });
});
