import { describe, expect, test } from 'bun:test';
import { MAX_BULK_DECK_DELETE_COUNT, zDeckBulkDeleteRequest } from './ZDeck.ts';

const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;

describe('bulk deck deletion contract', () => {
  test('accepts distinct deck IDs up to the bulk limit', () => {
    const deckIds = Array.from({ length: MAX_BULK_DECK_DELETE_COUNT }, (_, index) => uuid(index));

    expect(zDeckBulkDeleteRequest.parse({ deckIds })).toEqual({ deckIds });
  });

  test('rejects empty, duplicate, invalid, and oversized requests', () => {
    expect(zDeckBulkDeleteRequest.safeParse({ deckIds: [] }).success).toBe(false);
    expect(zDeckBulkDeleteRequest.safeParse({ deckIds: [uuid(1), uuid(1)] }).success).toBe(false);
    expect(zDeckBulkDeleteRequest.safeParse({ deckIds: ['not-a-uuid'] }).success).toBe(false);
    expect(
      zDeckBulkDeleteRequest.safeParse({
        deckIds: Array.from({ length: MAX_BULK_DECK_DELETE_COUNT + 1 }, (_, index) => uuid(index)),
      }).success,
    ).toBe(false);
  });
});
