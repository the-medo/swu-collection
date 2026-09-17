import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { parseSwudbDeck } from './deckLib.ts';

const cardList = {
  'maz-kanata--eclectic-pirate-queen': {
    cardId: 'maz-kanata--eclectic-pirate-queen',
    type: 'Leader',
    variants: {
      'maz-kanata--eclectic-pirate-queen-2-homeworlds': {
        variantId: 'maz-kanata--eclectic-pirate-queen-2-homeworlds',
        set: 'hmw',
        cardNo: 2,
        baseSet: true,
        variantName: 'Standard',
      },
    },
  },
  weakness: {
    cardId: 'weakness',
    type: 'Token Upgrade',
    variants: {
      'weakness-2-homeworlds': {
        variantId: 'weakness-2-homeworlds',
        set: 'hmw',
        cardNo: 2,
        baseSet: true,
        variantName: 'Standard',
      },
    },
  },
} as unknown as CardList;

describe('SWUDB deck parsing', () => {
  test('ignores token variants that reuse a numbered card slot', () => {
    const parsed = parseSwudbDeck(
      {
        leader: {
          cardName: 'Maz Kanata, Eclectic Pirate Queen',
          defaultExpansionAbbreviation: 'HMW',
          defaultCardNumber: 2,
        },
        base: {
          cardName: 'Maz Kanata, Eclectic Pirate Queen',
          defaultExpansionAbbreviation: 'HMW',
          defaultCardNumber: 2,
        },
        shuffledDeck: [],
      },
      'deck-id',
      cardList,
    );

    expect(parsed.leader1).toBe('maz-kanata--eclectic-pirate-queen');
    expect(parsed.base).toBe('maz-kanata--eclectic-pirate-queen');
    expect(parsed.errors).toEqual([]);
  });
});
