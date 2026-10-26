import { expect, test } from 'bun:test';
import { combinePreviewCardIds } from './combinePreviewCards.ts';
import type { CardComparisonData } from '../types.ts';

const card = (
  cardId: string,
  mainDeckQuantity: number,
  otherDecksQuantities: Record<string, number> = {},
  board = 1,
): CardComparisonData => ({ cardId, board, mainDeckQuantity, otherDecksQuantities });

test('prefers two shared cards even when played on different boards', () => {
  expect(
    combinePreviewCardIds(
      [
        card('main-only', 3),
        card('shared-a', 2, { second: 1 }),
        card('shared-b', 1, { second: 2, third: 3 }),
        card('shared-a', 0, { third: 1 }, 2),
      ],
      ['second', 'third'],
    ),
  ).toEqual(['shared-a', 'shared-b']);
});

test('uses the first two distinct played cards when none are shared', () => {
  expect(
    combinePreviewCardIds(
      [
        card('maybe', 3, { second: 3 }, 3),
        card('zero', 0, { second: 0 }),
        card('main-only', 3),
        card('main-only', 1, {}, 2),
        card('other-only', 0, { second: 2 }),
        card('later', 1),
      ],
      ['second'],
    ),
  ).toEqual(['main-only', 'other-only']);
});

test('fills a single shared card with the first other played card', () => {
  expect(
    combinePreviewCardIds(
      [card('first', 3), card('shared', 2, { second: 2 }), card('last', 1)],
      ['second'],
    ),
  ).toEqual(['shared', 'first']);
});

test('handles empty decks and fewer than two distinct cards', () => {
  expect(combinePreviewCardIds([], ['second'])).toEqual([]);
  expect(combinePreviewCardIds([card('only', 1)], ['empty'])).toEqual(['only']);
  expect(combinePreviewCardIds([card('one', 1), card('two', 1)], [])).toEqual(['one', 'two']);
});
