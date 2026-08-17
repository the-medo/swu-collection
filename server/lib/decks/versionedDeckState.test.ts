import { describe, expect, test } from 'bun:test';
import {
  applyDeckVersionDelta,
  createDeckVersionDelta,
  normalizeVersionDecklist,
  playableDeckStatesEqual,
} from './versionedDeckState.ts';

const metadata = {
  name: 'Deck',
  description: '',
  format: 1,
  leaderCardId1: 'leader',
  leaderCardId2: null,
  baseCardId: 'base',
};

describe('versioned deck state', () => {
  test('normalization always removes maybeboard cards', () => {
    expect(
      normalizeVersionDecklist([
        { cardId: 'main', board: 1, quantity: 3 },
        { cardId: 'side', board: 2, quantity: 1 },
        { cardId: 'maybe', board: 3, quantity: 2 },
      ]).map(card => card.cardId),
    ).toEqual(['main', 'side']);
  });

  test('absolute deltas reconstruct adds, removals, changes, and board moves', () => {
    const before = normalizeVersionDecklist([
      { cardId: 'removed', board: 1, quantity: 2 },
      { cardId: 'changed', board: 1, quantity: 1 },
      { cardId: 'moved', board: 1, quantity: 2 },
    ]);
    const after = normalizeVersionDecklist([
      { cardId: 'changed', board: 1, quantity: 3 },
      { cardId: 'moved', board: 2, quantity: 2 },
      { cardId: 'added', board: 1, quantity: 1 },
    ]);
    const delta = createDeckVersionDelta(before, after);

    expect(delta).toContainEqual({ cardId: 'removed', board: 1, note: '', quantity: 0 });
    expect(delta).toContainEqual({ cardId: 'moved', board: 1, note: '', quantity: 0 });
    expect(applyDeckVersionDelta(before, delta)).toEqual(after);
  });

  test('playable comparison ignores notes and maybeboard', () => {
    const left = normalizeVersionDecklist([
      { cardId: 'a', board: 1, note: 'left', quantity: 2 },
      { cardId: 'maybe-a', board: 3, quantity: 1 },
    ]);
    const right = normalizeVersionDecklist([
      { cardId: 'a', board: 1, note: 'right', quantity: 2 },
      { cardId: 'maybe-b', board: 3, quantity: 1 },
    ]);

    expect(playableDeckStatesEqual(metadata, left, metadata, right)).toBe(true);
  });
});
