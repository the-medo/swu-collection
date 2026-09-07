import { describe, expect, test } from 'bun:test';
import { CardLanguage } from './enums.ts';
import { zCollectionCardUpdateRequest } from './ZCollectionCard.ts';

const frenchCardId = {
  cardId: 'test-card',
  variantId: 'test-variant',
  foil: false,
  condition: 1,
  language: CardLanguage.FR,
};

describe('zCollectionCardUpdateRequest', () => {
  test('does not apply the English default when language is omitted from an update', () => {
    const result = zCollectionCardUpdateRequest.parse({
      id: frenchCardId,
      data: { amount: 2 },
    });

    expect(result.data).toEqual({ amount: 2 });
  });

  test('preserves an explicitly requested language update', () => {
    const result = zCollectionCardUpdateRequest.parse({
      id: frenchCardId,
      data: { language: CardLanguage.DE },
    });

    expect(result.data).toEqual({ language: CardLanguage.DE });
  });
});
