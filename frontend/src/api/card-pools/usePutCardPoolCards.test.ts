import { describe, expect, test } from 'bun:test';
import { mapCardIdsToPoolCards } from './usePutCardPoolCards.ts';

describe('card pool cards cache mapping', () => {
  test('preserves duplicate physical cards with sequential pool numbers', () => {
    expect(mapCardIdsToPoolCards(['first', 'first', 'second'])).toEqual({
      1: 'first',
      2: 'first',
      3: 'second',
    });
  });

  test('represents a cleared pool as an empty mapping', () => {
    expect(mapCardIdsToPoolCards([])).toEqual({});
  });
});
