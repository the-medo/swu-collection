import { describe, expect, test } from 'bun:test';
import {
  addCustomPoolDraftEntry,
  groupCustomPoolDraftEntries,
  parseCollectorNumber,
  removeAllCustomPoolDraftEntries,
  removeOneCustomPoolDraftEntry,
  resolveCustomPoolDraftEntries,
} from './customPoolDraft.ts';

describe('custom pool collector number parsing', () => {
  test('normalizes whitespace and leading zeroes', () => {
    expect(parseCollectorNumber(' 0042 ')).toBe(42);
  });

  test('rejects empty, non-numeric, decimal, zero, and negative values', () => {
    expect(parseCollectorNumber('')).toBeUndefined();
    expect(parseCollectorNumber('card 42')).toBeUndefined();
    expect(parseCollectorNumber('4.2')).toBeUndefined();
    expect(parseCollectorNumber('0')).toBeUndefined();
    expect(parseCollectorNumber('-1')).toBeUndefined();
  });
});

describe('existing custom pool draft resolution', () => {
  test('preserves physical copies and resolves a stable collector number', () => {
    expect(
      resolveCustomPoolDraftEntries(['first', 'first', 'second'], {
        201: { cardId: 'first' },
        1: { cardId: 'first' },
        2: { cardId: 'second' },
      }),
    ).toEqual({
      entries: [
        { cardId: 'first', cardNo: 1 },
        { cardId: 'first', cardNo: 1 },
        { cardId: 'second', cardNo: 2 },
      ],
      unresolvedCardIds: [],
    });
  });

  test('reports cards that are missing from the selected set lookup', () => {
    expect(
      resolveCustomPoolDraftEntries(['known', 'missing', 'missing'], {
        1: { cardId: 'known' },
      }),
    ).toEqual({
      entries: [{ cardId: 'known', cardNo: 1 }],
      unresolvedCardIds: ['missing'],
    });
  });
});

describe('custom pool draft operations', () => {
  const firstCard = { cardId: 'first', cardNo: 1 };
  const alternatePrinting = { cardId: 'first', cardNo: 201 };

  test('keeps every physical copy while grouping matching entries', () => {
    const entries = addCustomPoolDraftEntry(
      addCustomPoolDraftEntry([firstCard], firstCard),
      alternatePrinting,
    );

    expect(entries).toHaveLength(3);
    expect(groupCustomPoolDraftEntries(entries)).toEqual([
      { ...firstCard, key: 'first:1', quantity: 2 },
      { ...alternatePrinting, key: 'first:201', quantity: 1 },
    ]);
  });

  test('removes one matching copy or the complete matching group', () => {
    const entries = [firstCard, alternatePrinting, firstCard];

    expect(removeOneCustomPoolDraftEntry(entries, firstCard)).toEqual([
      firstCard,
      alternatePrinting,
    ]);
    expect(removeAllCustomPoolDraftEntries(entries, firstCard)).toEqual([alternatePrinting]);
  });
});
