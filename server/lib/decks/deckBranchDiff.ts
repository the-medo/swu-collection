import {
  deckSnapshotCardKey,
  deckSnapshotFields,
  normalizeDeckSnapshot,
  type DeckSnapshot,
  type DeckSnapshotCard,
  type DeckSnapshotField,
} from './deckBranchSnapshot.ts';
import type { ZDeckChangeRequestMergeRequest } from '../../../types/ZDeckBranch.ts';

export type DeckFieldChange = {
  type: 'field';
  field: DeckSnapshotField;
  before: unknown;
  after: unknown;
};

export type DeckCardChange = {
  type: 'card';
  key: string;
  cardId: string;
  board: number;
  before: DeckSnapshotCard | null;
  after: DeckSnapshotCard | null;
  changeType: 'added' | 'removed' | 'changed';
};

export type DeckDiff = {
  fields: DeckFieldChange[];
  cards: DeckCardChange[];
  summary: {
    fieldsChanged: number;
    cardsAdded: number;
    cardsRemoved: number;
    cardsChanged: number;
  };
};

export type DeckMergeConflict =
  | {
      type: 'field';
      field: DeckSnapshotField;
      base: unknown;
      current: unknown;
      proposed: unknown;
    }
  | {
      type: 'card';
      key: string;
      cardId: string;
      board: number;
      base: DeckSnapshotCard | null;
      current: DeckSnapshotCard | null;
      proposed: DeckSnapshotCard | null;
    };

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sameCard = (a: DeckSnapshotCard | null, b: DeckSnapshotCard | null) =>
  a?.cardId === b?.cardId && a?.board === b?.board && a?.quantity === b?.quantity;
const mergeCardWithoutBranchNote = (
  key: string,
  card: DeckSnapshotCard,
  currentCards: Map<string, DeckSnapshotCard>,
  baseCards: Map<string, DeckSnapshotCard>,
): DeckSnapshotCard => ({
  ...card,
  note: currentCards.get(key)?.note ?? baseCards.get(key)?.note ?? '',
});

const cardMap = (snapshot: DeckSnapshot) => {
  const map = new Map<string, DeckSnapshotCard>();
  snapshot.cards.forEach(card => map.set(deckSnapshotCardKey(card), card));
  return map;
};

export function diffDeckSnapshots(beforeSnapshot: DeckSnapshot, afterSnapshot: DeckSnapshot): DeckDiff {
  const before = normalizeDeckSnapshot(beforeSnapshot);
  const after = normalizeDeckSnapshot(afterSnapshot);

  const fields: DeckFieldChange[] = [];
  deckSnapshotFields.forEach(field => {
    if (!sameValue(before.deck[field], after.deck[field])) {
      fields.push({
        type: 'field',
        field,
        before: before.deck[field],
        after: after.deck[field],
      });
    }
  });

  const beforeCards = cardMap(before);
  const afterCards = cardMap(after);
  const cardKeys = new Set([...beforeCards.keys(), ...afterCards.keys()]);
  const cards: DeckCardChange[] = [];

  cardKeys.forEach(key => {
    const beforeCard = beforeCards.get(key) ?? null;
    const afterCard = afterCards.get(key) ?? null;
    if (sameCard(beforeCard, afterCard)) return;

    cards.push({
      type: 'card',
      key,
      cardId: afterCard?.cardId ?? beforeCard!.cardId,
      board: afterCard?.board ?? beforeCard!.board,
      before: beforeCard,
      after: afterCard,
      changeType: beforeCard ? (afterCard ? 'changed' : 'removed') : 'added',
    });
  });

  cards.sort((a, b) => a.key.localeCompare(b.key));

  return {
    fields,
    cards,
    summary: {
      fieldsChanged: fields.length,
      cardsAdded: cards.filter(card => card.changeType === 'added').length,
      cardsRemoved: cards.filter(card => card.changeType === 'removed').length,
      cardsChanged: cards.filter(card => card.changeType === 'changed').length,
    },
  };
}

export function findDeckMergeConflicts(
  baseSnapshot: DeckSnapshot,
  currentBaseSnapshot: DeckSnapshot,
  branchSnapshot: DeckSnapshot,
): DeckMergeConflict[] {
  const base = normalizeDeckSnapshot(baseSnapshot);
  const current = normalizeDeckSnapshot(currentBaseSnapshot);
  const branch = normalizeDeckSnapshot(branchSnapshot);

  const conflicts: DeckMergeConflict[] = [];

  deckSnapshotFields.forEach(field => {
    const baseValue = base.deck[field];
    const currentValue = current.deck[field];
    const proposedValue = branch.deck[field];
    const ownerChanged = !sameValue(baseValue, currentValue);
    const branchChanged = !sameValue(baseValue, proposedValue);

    if (ownerChanged && branchChanged && !sameValue(currentValue, proposedValue)) {
      conflicts.push({
        type: 'field',
        field,
        base: baseValue,
        current: currentValue,
        proposed: proposedValue,
      });
    }
  });

  const baseCards = cardMap(base);
  const currentCards = cardMap(current);
  const branchCards = cardMap(branch);
  const cardKeys = new Set([...baseCards.keys(), ...currentCards.keys(), ...branchCards.keys()]);

  cardKeys.forEach(key => {
    const baseCard = baseCards.get(key) ?? null;
    const currentCard = currentCards.get(key) ?? null;
    const proposedCard = branchCards.get(key) ?? null;
    const ownerChanged = !sameCard(baseCard, currentCard);
    const branchChanged = !sameCard(baseCard, proposedCard);

    if (ownerChanged && branchChanged && !sameCard(currentCard, proposedCard)) {
      conflicts.push({
        type: 'card',
        key,
        cardId: proposedCard?.cardId ?? currentCard?.cardId ?? baseCard!.cardId,
        board: proposedCard?.board ?? currentCard?.board ?? baseCard!.board,
        base: baseCard,
        current: currentCard,
        proposed: proposedCard,
      });
    }
  });

  return conflicts;
}

export function buildMergedDeckSnapshot(
  baseSnapshot: DeckSnapshot,
  currentBaseSnapshot: DeckSnapshot,
  branchSnapshot: DeckSnapshot,
  resolutions: ZDeckChangeRequestMergeRequest['resolutions'] = [],
): DeckSnapshot {
  const base = normalizeDeckSnapshot(baseSnapshot);
  const current = normalizeDeckSnapshot(currentBaseSnapshot);
  const branch = normalizeDeckSnapshot(branchSnapshot);
  const merged = normalizeDeckSnapshot(current);

  const resolutionMap = new Map<string, unknown>();
  resolutions.forEach(resolution => {
    resolutionMap.set(
      resolution.type === 'field' ? `field:${resolution.field}` : `card:${resolution.key}`,
      resolution.value,
    );
  });

  deckSnapshotFields.forEach(field => {
    const resolutionKey = `field:${field}`;
    if (resolutionMap.has(resolutionKey)) {
      merged.deck[field] = resolutionMap.get(resolutionKey) as never;
      return;
    }

    if (!sameValue(base.deck[field], branch.deck[field])) {
      merged.deck[field] = branch.deck[field] as never;
    }
  });

  const baseCards = cardMap(base);
  const branchCards = cardMap(branch);
  const mergedCards = cardMap(merged);
  const cardKeys = new Set([...baseCards.keys(), ...branchCards.keys(), ...mergedCards.keys()]);

  cardKeys.forEach(key => {
    const resolutionKey = `card:${key}`;
    if (resolutionMap.has(resolutionKey)) {
      const value = resolutionMap.get(resolutionKey) as DeckSnapshotCard | null;
      if (value && value.quantity > 0) {
        mergedCards.set(key, mergeCardWithoutBranchNote(key, value, mergedCards, baseCards));
      } else mergedCards.delete(key);
      return;
    }

    const baseCard = baseCards.get(key) ?? null;
    const branchCard = branchCards.get(key) ?? null;
    if (!sameCard(baseCard, branchCard)) {
      if (branchCard && branchCard.quantity > 0) {
        mergedCards.set(key, mergeCardWithoutBranchNote(key, branchCard, mergedCards, baseCards));
      } else mergedCards.delete(key);
    }
  });

  merged.cards = [...mergedCards.values()];
  return normalizeDeckSnapshot(merged);
}
