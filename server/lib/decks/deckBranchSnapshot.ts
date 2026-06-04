import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../db/schema/deck_card.ts';

export const deckSnapshotFields = [
  'name',
  'description',
  'format',
  'public',
  'leaderCardId1',
  'leaderCardId2',
  'baseCardId',
] as const;

export type DeckSnapshotField = (typeof deckSnapshotFields)[number];

export type DeckSnapshotCard = {
  cardId: string;
  board: number;
  quantity: number;
  note: string;
};

export type DeckSnapshot = {
  deck: Pick<Deck, DeckSnapshotField>;
  cards: DeckSnapshotCard[];
};

export const deckSnapshotCardKey = (card: Pick<DeckSnapshotCard, 'cardId' | 'board'>) =>
  `${card.cardId}::${card.board}`;

const normalizeCard = (card: DeckSnapshotCard): DeckSnapshotCard => ({
  cardId: card.cardId,
  board: card.board,
  quantity: card.quantity,
  note: card.note ?? '',
});

export const normalizeDeckSnapshot = (snapshot: DeckSnapshot): DeckSnapshot => ({
  deck: {
    name: snapshot.deck.name,
    description: snapshot.deck.description ?? '',
    format: snapshot.deck.format,
    public: snapshot.deck.public,
    leaderCardId1: snapshot.deck.leaderCardId1 ?? null,
    leaderCardId2: snapshot.deck.leaderCardId2 ?? null,
    baseCardId: snapshot.deck.baseCardId ?? null,
  },
  cards: snapshot.cards
    .map(normalizeCard)
    .filter(card => card.quantity > 0)
    .sort((a, b) => deckSnapshotCardKey(a).localeCompare(deckSnapshotCardKey(b))),
});

export async function getDeckSnapshot(deckId: string, database: any = db) {
  const [deck] = await database.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1);
  if (!deck) return null;

  const cards = await database
    .select({
      cardId: deckCardTable.cardId,
      board: deckCardTable.board,
      quantity: deckCardTable.quantity,
      note: deckCardTable.note,
    })
    .from(deckCardTable)
    .where(eq(deckCardTable.deckId, deckId));

  return normalizeDeckSnapshot({
    deck: {
      name: deck.name,
      description: deck.description,
      format: deck.format,
      public: deck.public,
      leaderCardId1: deck.leaderCardId1,
      leaderCardId2: deck.leaderCardId2,
      baseCardId: deck.baseCardId,
    },
    cards,
  });
}

export async function applyDeckSnapshot(deckId: string, snapshot: DeckSnapshot, database: any = db) {
  const normalized = normalizeDeckSnapshot(snapshot);

  await database
    .update(deckTable)
    .set({
      ...normalized.deck,
      updatedAt: new Date(),
    })
    .where(eq(deckTable.id, deckId));

  await database.delete(deckCardTable).where(eq(deckCardTable.deckId, deckId));

  if (normalized.cards.length > 0) {
    await database.insert(deckCardTable).values(
      normalized.cards.map(card => ({
        deckId,
        cardId: card.cardId,
        board: card.board,
        quantity: card.quantity,
        note: card.note,
      })),
    );
  }
}

export async function copyDeckCards(
  sourceDeckId: string,
  targetDeckId: string,
  database: any = db,
) {
  const cards = await database
    .select()
    .from(deckCardTable)
    .where(eq(deckCardTable.deckId, sourceDeckId));

  if (cards.length === 0) return;

  await database.insert(deckCardTable).values(
    cards.map((card: DeckSnapshotCard) => ({
      deckId: targetDeckId,
      cardId: card.cardId,
      board: card.board,
      quantity: card.quantity,
      note: card.note,
    })),
  );
}

export async function replaceDeckCards(
  deckId: string,
  cards: DeckSnapshotCard[],
  database: any = db,
) {
  await database.delete(deckCardTable).where(eq(deckCardTable.deckId, deckId));
  const normalizedCards = cards.map(normalizeCard).filter(card => card.quantity > 0);

  if (normalizedCards.length > 0) {
    await database.insert(deckCardTable).values(
      normalizedCards.map(card => ({
        deckId,
        cardId: card.cardId,
        board: card.board,
        quantity: card.quantity,
        note: card.note,
      })),
    );
  }
}

export async function upsertDeckSnapshotCard(
  deckId: string,
  card: DeckSnapshotCard | null,
  fallbackKey: string,
  database: any = db,
) {
  const [cardId, boardValue] = fallbackKey.split('::');
  const board = Number(boardValue);

  await database
    .delete(deckCardTable)
    .where(and(eq(deckCardTable.deckId, deckId), eq(deckCardTable.cardId, cardId), eq(deckCardTable.board, board)));

  if (!card || card.quantity <= 0) return;

  await database.insert(deckCardTable).values({
    deckId,
    cardId: card.cardId,
    board: card.board,
    quantity: card.quantity,
    note: card.note ?? '',
  });
}
