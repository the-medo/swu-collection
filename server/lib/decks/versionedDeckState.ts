import { createHash } from 'node:crypto';

export type VersionedDeckCard = {
  cardId: string;
  board: 1 | 2;
  note: string;
  quantity: number;
};

export type VersionedDeckMetadata = {
  name: string;
  description: string;
  format: number;
  leaderCardId1: string | null;
  leaderCardId2: string | null;
  baseCardId: string | null;
};

export type PlayableDeckState = Pick<
  VersionedDeckMetadata,
  'format' | 'leaderCardId1' | 'leaderCardId2' | 'baseCardId'
> & {
  cards: Array<Pick<VersionedDeckCard, 'cardId' | 'board' | 'quantity'>>;
};

export type DeckVersionDiffSummary = {
  addedCards: number;
  removedCards: number;
  changedCards: number;
};

const cardKey = (card: Pick<VersionedDeckCard, 'cardId' | 'board'>) =>
  `${card.board}\u0000${card.cardId}`;

const compareCards = (
  a: Pick<VersionedDeckCard, 'cardId' | 'board'>,
  b: Pick<VersionedDeckCard, 'cardId' | 'board'>,
) => a.board - b.board || a.cardId.localeCompare(b.cardId);

export function normalizeVersionDecklist(
  cards: Array<{
    cardId: string;
    board: number;
    note?: string | null;
    quantity: number;
  }>,
): VersionedDeckCard[] {
  return cards
    .filter(
      (card): card is typeof card & { board: 1 | 2 } =>
        (card.board === 1 || card.board === 2) && card.quantity > 0,
    )
    .map(card => ({
      cardId: card.cardId,
      board: card.board,
      note: card.note ?? '',
      quantity: card.quantity,
    }))
    .sort(compareCards);
}

export function createDeckVersionDelta(
  previousCards: VersionedDeckCard[],
  currentCards: VersionedDeckCard[],
): VersionedDeckCard[] {
  const previous = new Map(previousCards.map(card => [cardKey(card), card]));
  const current = new Map(currentCards.map(card => [cardKey(card), card]));
  const keys = new Set([...previous.keys(), ...current.keys()]);
  const delta: VersionedDeckCard[] = [];

  for (const key of keys) {
    const before = previous.get(key);
    const after = current.get(key);
    if (!after && before) {
      delta.push({ ...before, note: '', quantity: 0 });
      continue;
    }
    if (after && (!before || before.quantity !== after.quantity || before.note !== after.note)) {
      delta.push({ ...after });
    }
  }

  return delta.sort(compareCards);
}

export function applyDeckVersionDelta(
  baseCards: VersionedDeckCard[],
  deltaCards: VersionedDeckCard[],
): VersionedDeckCard[] {
  const result = new Map(baseCards.map(card => [cardKey(card), { ...card }]));

  for (const delta of deltaCards) {
    if (delta.board !== 1 && delta.board !== 2) {
      throw new Error(`Deck version contains unsupported board ${delta.board}`);
    }
    const key = cardKey(delta);
    if (delta.quantity === 0) result.delete(key);
    else if (delta.quantity > 0) result.set(key, { ...delta });
    else throw new Error('Deck version quantities cannot be negative');
  }

  return [...result.values()].sort(compareCards);
}

export function normalizePlayableDeckState(
  metadata: VersionedDeckMetadata,
  cards: VersionedDeckCard[],
): PlayableDeckState {
  return {
    format: metadata.format,
    leaderCardId1: metadata.leaderCardId1,
    leaderCardId2: metadata.leaderCardId2,
    baseCardId: metadata.baseCardId,
    cards: cards.map(({ cardId, board, quantity }) => ({ cardId, board, quantity })),
  };
}

export function playableDeckStatesEqual(
  leftMetadata: VersionedDeckMetadata,
  leftCards: VersionedDeckCard[],
  rightMetadata: VersionedDeckMetadata,
  rightCards: VersionedDeckCard[],
): boolean {
  return (
    JSON.stringify(normalizePlayableDeckState(leftMetadata, leftCards)) ===
    JSON.stringify(normalizePlayableDeckState(rightMetadata, rightCards))
  );
}

export function versionedDeckStatesEqual(
  leftMetadata: VersionedDeckMetadata,
  leftCards: VersionedDeckCard[],
  rightMetadata: VersionedDeckMetadata,
  rightCards: VersionedDeckCard[],
): boolean {
  return (
    JSON.stringify({ ...leftMetadata, cards: leftCards }) ===
    JSON.stringify({ ...rightMetadata, cards: rightCards })
  );
}

export function hashVersionedDeckState(
  metadata: VersionedDeckMetadata,
  cards: VersionedDeckCard[],
): string {
  return createHash('sha256')
    .update(JSON.stringify({ ...metadata, cards: normalizeVersionDecklist(cards) }))
    .digest('hex');
}

export function summarizeDeckVersionDelta(
  deltaCards: VersionedDeckCard[],
  previousCards: VersionedDeckCard[],
): DeckVersionDiffSummary {
  const previousKeys = new Set(previousCards.map(cardKey));
  return deltaCards.reduce<DeckVersionDiffSummary>(
    (summary, card) => {
      const key = cardKey(card);
      if (card.quantity === 0) summary.removedCards += 1;
      else if (!previousKeys.has(key)) summary.addedCards += 1;
      else summary.changedCards += 1;
      return summary;
    },
    { addedCards: 0, removedCards: 0, changedCards: 0 },
  );
}

export function deckMetadataFromRow(row: {
  name: string | null;
  description: string | null;
  format: number | null;
  leaderCardId1: string | null;
  leaderCardId2: string | null;
  baseCardId: string | null;
}): VersionedDeckMetadata {
  if (row.format === null) throw new Error('Sealed deck version is missing its format');
  return {
    name: row.name ?? '',
    description: row.description ?? '',
    format: row.format,
    leaderCardId1: row.leaderCardId1,
    leaderCardId2: row.leaderCardId2,
    baseCardId: row.baseCardId,
  };
}
