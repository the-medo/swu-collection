import { describe, expect, test } from 'bun:test';
import {
  buildMergedDeckSnapshot,
  diffDeckSnapshots,
  findDeckMergeConflicts,
} from './deckBranchDiff.ts';
import type { DeckSnapshot } from './deckBranchSnapshot.ts';

const snapshot = (overrides: Partial<DeckSnapshot> = {}): DeckSnapshot => ({
  deck: {
    name: 'Base deck',
    description: '',
    format: 1,
    public: 1,
    leaderCardId1: 'leader-a',
    leaderCardId2: null,
    baseCardId: 'base-a',
  },
  cards: [
    { cardId: 'unit-a', board: 1, quantity: 3, note: '' },
    { cardId: 'event-a', board: 2, quantity: 2, note: '' },
  ],
  ...overrides,
});

describe('deck branch diff', () => {
  test('summarizes added, removed, changed cards and deck fields', () => {
    const before = snapshot();
    const after = snapshot({
      deck: { ...before.deck, name: 'Branch deck' },
      cards: [
        { cardId: 'unit-a', board: 1, quantity: 2, note: '' },
        { cardId: 'upgrade-a', board: 1, quantity: 1, note: '' },
      ],
    });

    const diff = diffDeckSnapshots(before, after);

    expect(diff.summary).toEqual({
      fieldsChanged: 1,
      cardsAdded: 1,
      cardsRemoved: 1,
      cardsChanged: 1,
    });
    expect(diff.fields[0]).toMatchObject({ field: 'name', before: 'Base deck', after: 'Branch deck' });
  });

  test('ignores card note-only edits', () => {
    const before = snapshot({
      cards: [{ cardId: 'unit-a', board: 1, quantity: 3, note: 'Original note' }],
    });
    const after = snapshot({
      cards: [{ cardId: 'unit-a', board: 1, quantity: 3, note: 'Branch explanation' }],
    });

    const diff = diffDeckSnapshots(before, after);
    const conflicts = findDeckMergeConflicts(before, before, after);

    expect(diff.summary.cardsChanged).toBe(0);
    expect(diff.cards).toHaveLength(0);
    expect(conflicts).toHaveLength(0);
  });

  test('detects card conflicts when owner and branch change the same card differently', () => {
    const base = snapshot();
    const current = snapshot({
      cards: [
        { cardId: 'unit-a', board: 1, quantity: 1, note: '' },
        { cardId: 'event-a', board: 2, quantity: 2, note: '' },
      ],
    });
    const branch = snapshot({
      cards: [
        { cardId: 'unit-a', board: 1, quantity: 2, note: '' },
        { cardId: 'event-a', board: 2, quantity: 2, note: '' },
      ],
    });

    const conflicts = findDeckMergeConflicts(base, current, branch);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      type: 'card',
      key: 'unit-a::1',
      current: { quantity: 1 },
      proposed: { quantity: 2 },
    });
  });

  test('auto-merges untouched base changes with branch changes', () => {
    const base = snapshot();
    const current = snapshot({
      deck: { ...base.deck, description: 'Owner note' },
    });
    const branch = snapshot({
      deck: { ...base.deck, name: 'Branch name' },
      cards: [
        ...base.cards,
        { cardId: 'upgrade-a', board: 1, quantity: 1, note: '' },
      ],
    });

    const conflicts = findDeckMergeConflicts(base, current, branch);
    const merged = buildMergedDeckSnapshot(base, current, branch);

    expect(conflicts).toHaveLength(0);
    expect(merged.deck.description).toBe('Owner note');
    expect(merged.deck.name).toBe('Branch name');
    expect(merged.cards.some(card => card.cardId === 'upgrade-a')).toBe(true);
  });

  test('preserves current deck notes when merging quantity changes', () => {
    const base = snapshot({
      cards: [{ cardId: 'unit-a', board: 1, quantity: 3, note: 'Owner note' }],
    });
    const current = snapshot({
      cards: [{ cardId: 'unit-a', board: 1, quantity: 3, note: 'Updated owner note' }],
    });
    const branch = snapshot({
      cards: [{ cardId: 'unit-a', board: 1, quantity: 2, note: 'Branch note ignored' }],
    });

    const merged = buildMergedDeckSnapshot(base, current, branch);

    expect(merged.cards).toContainEqual({
      cardId: 'unit-a',
      board: 1,
      quantity: 2,
      note: 'Updated owner note',
    });
  });

  test('uses explicit conflict resolutions', () => {
    const base = snapshot();
    const current = snapshot({
      deck: { ...base.deck, baseCardId: 'base-owner' },
    });
    const branch = snapshot({
      deck: { ...base.deck, baseCardId: 'base-branch' },
    });

    const merged = buildMergedDeckSnapshot(base, current, branch, [
      { type: 'field', field: 'baseCardId', value: 'base-owner' },
    ]);

    expect(merged.deck.baseCardId).toBe('base-owner');
  });
});
