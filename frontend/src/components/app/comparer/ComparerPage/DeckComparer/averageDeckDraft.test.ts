import { describe, expect, test } from 'bun:test';
import {
  averageDeckPayload,
  averageDeckRowKey,
  defaultAverageDeckEntries,
} from './averageDeckDraft.ts';
import type { CardComparisonData } from '../types.ts';

const card = (id: string, board: number, main: number, other: number): CardComparisonData => ({
  cardId: id,
  board,
  mainDeckQuantity: main,
  otherDecksQuantities: { other },
  cardType: 'Event',
});

describe('average deck draft', () => {
  test('rounds exact averages, including 0.5, and preserves source boards', () => {
    const cards = [card('a', 1, 3, 2), card('b', 2, 1, 0), card('c', 1, 2, 0)];
    expect(defaultAverageDeckEntries(cards, ['other'])).toEqual({
      'a-1': { quantity: '3', board: 1 },
      'b-2': { quantity: '1', board: 2 },
      'c-1': { quantity: '1', board: 1 },
    });
  });

  test('counts missing decks as zero and sends sub-0.5 averages to maybeboard', () => {
    expect(
      defaultAverageDeckEntries([card('a', 1, 1, 0), card('b', 2, 0, 1)], ['other', 'third']),
    ).toEqual({
      'a-1': { quantity: '1', board: 3 },
      'b-2': { quantity: '1', board: 3 },
    });
    // Use the unrounded average: 0.49 is still a maybeboard card.
    expect(
      defaultAverageDeckEntries(
        [card('a', 1, 49, 0)],
        Array.from({ length: 99 }, (_, i) => String(i)),
      )['a-1'].board,
    ).toBe(3);
  });

  test('merges cards assigned to the same board without duplicating overlapping groups', () => {
    const cards = [card('a', 1, 3, 2), card('a', 2, 1, 1), card('b', 1, 1, 1)];
    const entries = defaultAverageDeckEntries(cards, ['other']);
    entries['a-1'] = { quantity: '2', board: 3 };
    entries['a-2'] = { quantity: '1', board: 3 };
    entries['b-1'].quantity = '0';
    expect(averageDeckPayload([...cards, cards[0]!], entries)).toEqual({
      cards: { a: { 3: 3 } },
      valid: true,
    });
    entries['a-2'].board = 2;
    expect(averageDeckPayload(cards, entries).cards).toEqual({ a: { 2: 1, 3: 2 } });
  });

  test.each(['', '-1', '1.5', 'NaN', '2147483648'])('rejects invalid count %s', quantity => {
    const c = card('a', 1, 1, 1);
    expect(averageDeckPayload([c], { [averageDeckRowKey(c)]: { quantity, board: 1 } }).valid).toBe(
      false,
    );
  });

  test('ignores source maybeboard rows that are not shown in the comparison', () => {
    const cards = [card('a', 3, 3, 3)];
    expect(defaultAverageDeckEntries(cards, ['other'])).toEqual({});
    expect(averageDeckPayload(cards, {})).toEqual({ cards: {}, valid: true });
  });
});
