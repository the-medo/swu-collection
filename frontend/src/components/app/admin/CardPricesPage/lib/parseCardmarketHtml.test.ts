import { describe, expect, test } from 'bun:test';
import { DOMParser } from 'linkedom';
import type { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import { parseCardmarketHtml } from './parseCardmarketHtml.ts';

(globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser = DOMParser;

const cardList = {
  'test-card': {
    name: 'Test Card',
    variants: {
      standard: {
        variantId: 'standard',
        set: SwuSet.SOR,
        cardNo: 79,
        variantName: 'Standard',
      },
    },
  },
} as unknown as CardList;

describe('parseCardmarketHtml', () => {
  test('matches a variant using Cardmarket collector-number markup', () => {
    const html = `
      <div id="productRow123">
        <a href="/en/StarWarsUnlimited/Products/Test/Test-Card">Test Card</a>
        <div data-testid="collector_number">
          <span class="d-md-none">#</span><span>079</span>
        </div>
      </div>
    `;

    expect(parseCardmarketHtml(html, SwuSet.SOR, cardList)).toEqual([
      {
        productId: '123',
        link: 'https://www.cardmarket.com/en/StarWarsUnlimited/Products/Test/Test-Card',
        nameDirty: 'Test Card',
        name: 'Test Card',
        cardNumber: '079',
        cardId: 'test-card',
        variantId: 'standard',
      },
    ]);
  });
});
