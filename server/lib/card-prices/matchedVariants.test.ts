import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../types/enums.ts';
import { filterMatchedCardPriceVariantsBySet } from './matchedVariants.ts';

const cardList = {
  card: {
    variants: {
      sor: { set: SwuSet.SOR },
      shd: { set: SwuSet.SHD },
    },
  },
} as unknown as CardList;

describe('filterMatchedCardPriceVariantsBySet', () => {
  test('keeps only identifiers belonging to the requested set', () => {
    expect(
      filterMatchedCardPriceVariantsBySet(
        [
          { cardId: 'card', variantId: 'sor' },
          { cardId: 'card', variantId: 'shd' },
          { cardId: 'missing', variantId: 'missing' },
        ],
        cardList,
        SwuSet.SOR,
      ),
    ).toEqual([{ cardId: 'card', variantId: 'sor' }]);
  });
});
