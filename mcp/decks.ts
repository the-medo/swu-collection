import { z } from 'zod';
import { and, asc, count, desc, eq, gt, ilike, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { deck } from '../server/db/schema/deck.ts';
import { deckReadAccess } from '../server/lib/decks/deckFolderAccess.ts';
import { deckCard } from '../server/db/schema/deck_card.ts';
import { cardPoolDeckCards } from '../server/db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../server/db/schema/card_pool.ts';
import { transformCardPoolDeckCardsToDeckCards } from '../server/lib/decks/transformCardPoolDeckCards.ts';
import { formatDataById } from '../types/Format.ts';
import { getOfficialCard } from './cards.ts';

export const deckListInput = z.strictObject({
  query: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .describe('Literal, case-insensitive deck-name search.'),
  leaderCardId: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .optional()
    .describe('Exact logical card ID of either leader.'),
  baseCardId: z.string().trim().min(1).max(256).optional(),
  formatId: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('SWUBASE format ID, for example 1=Premier, 6=Eternal, 2=Twin Suns.'),
  limit: z.number().int().min(1).max(25).default(10),
  offset: z.number().int().min(0).max(10_000).default(0),
});
export const deckGetInput = z.strictObject({
  deckId: z.guid().describe('Deck UUID from list_my_decks or a SWUBASE /decks/ URL.'),
});
const deckColumns = {
  id: deck.id,
  userId: deck.userId,
  name: deck.name,
  description: deck.description,
  format: deck.format,
  public: deck.public,
  leaderCardId1: deck.leaderCardId1,
  leaderCardId2: deck.leaderCardId2,
  baseCardId: deck.baseCardId,
  cardPoolId: deck.cardPoolId,
  createdAt: deck.createdAt,
  updatedAt: deck.updatedAt,
};
type DeckRow = Pick<typeof deck.$inferSelect, keyof typeof deckColumns>;

export function createDeckRepository(database: PostgresJsDatabase) {
  return {
    async listDecks(userId: string, input: z.infer<typeof deckListInput>) {
      const filters = [eq(deck.userId, userId)];
      if (input.query)
        filters.push(ilike(deck.name, '%' + input.query.replace(/[\\%_]/g, '\\$&') + '%'));
      if (input.leaderCardId)
        filters.push(
          or(
            eq(deck.leaderCardId1, input.leaderCardId),
            eq(deck.leaderCardId2, input.leaderCardId),
          )!,
        );
      if (input.baseCardId) filters.push(eq(deck.baseCardId, input.baseCardId));
      if (input.formatId) filters.push(eq(deck.format, input.formatId));
      return database.transaction(
        async tx => {
          const [total] = await tx
            .select({ count: count() })
            .from(deck)
            .where(and(...filters));
          const decks = await tx
            .select(deckColumns)
            .from(deck)
            .where(and(...filters))
            .orderBy(desc(deck.updatedAt), asc(deck.id))
            .limit(input.limit)
            .offset(input.offset);
          return { total: total!.count, decks };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async getDeck(userId: string, deckId: string) {
      return database.transaction(
        async tx => {
          const [row] = await tx
            .select(deckColumns)
            .from(deck)
            .where(and(eq(deck.id, deckId), deckReadAccess(userId)))
            .limit(1);
          if (!row) return null;
          if (!row.cardPoolId) {
            const contents = await tx
              .select({
                cardId: deckCard.cardId,
                board: deckCard.board,
                quantity: deckCard.quantity,
              })
              .from(deckCard)
              .where(and(eq(deckCard.deckId, row.id), gt(deckCard.quantity, 0)))
              .orderBy(asc(deckCard.board), asc(deckCard.cardId))
              .limit(501);
            if (contents.length > 500) return { tooLarge: true as const };
            return { deck: row, contents };
          }
          const pool = await tx
            .select({
              cardId: cardPoolCards.cardId,
              location: cardPoolDeckCards.location,
            })
            .from(cardPoolDeckCards)
            .innerJoin(
              cardPoolCards,
              and(
                eq(cardPoolCards.cardPoolId, row.cardPoolId),
                eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
              ),
            )
            .where(eq(cardPoolDeckCards.deckId, row.id))
            .orderBy(asc(cardPoolDeckCards.cardPoolNumber))
            .limit(1001);
          if (pool.length > 1000) return { tooLarge: true as const };
          const cards = Object.fromEntries(
            pool.map(card => [card.cardId, getOfficialCard(card.cardId)]),
          );
          const contents = transformCardPoolDeckCardsToDeckCards(
            pool.filter(
              card => ![row.leaderCardId1, row.leaderCardId2, row.baseCardId].includes(card.cardId),
            ),
            row.id,
            cards,
          ).sort((a, b) => a.board - b.board || a.cardId.localeCompare(b.cardId));
          return { deck: row, contents };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  };
}
export type DeckRepository = ReturnType<typeof createDeckRepository>;

function cardSummary(cardId: string | null) {
  if (!cardId) return null;
  const card = getOfficialCard(cardId);
  return {
    cardId,
    name: card?.name ?? null,
    aspects: card?.aspects ?? null,
    type: card?.type ?? null,
    cost: card?.cost ?? null,
    catalogAvailable: Boolean(card),
  };
}

export function deckSummary(row: DeckRow, websiteOrigin: string) {
  return {
    deckId: row.id,
    name: row.name.slice(0, 255),
    format: { id: row.format, name: formatDataById[row.format]?.name ?? null },
    visibility: row.public === 0 ? 'private' : row.public === 1 ? 'public' : 'unlisted',
    kind: row.cardPoolId ? 'card_pool' : 'constructed',
    leaders: [row.leaderCardId1, row.leaderCardId2]
      .filter((id): id is string => Boolean(id))
      .map(cardSummary),
    base: cardSummary(row.baseCardId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    url: websiteOrigin + '/decks/' + row.id,
  };
}

export function deckDetails(
  result: { deck: DeckRow; contents: { cardId: string; board: number; quantity: number }[] },
  websiteOrigin: string,
) {
  const entry = (card: (typeof result.contents)[number]) => ({
    ...cardSummary(card.cardId),
    quantity: card.quantity,
  });
  return {
    ...deckSummary(result.deck, websiteOrigin),
    description: result.deck.description.slice(0, 4000),
    descriptionTruncated: result.deck.description.length > 4000,
    catalog: 'official' as const,
    boards: {
      main: result.contents.filter(card => card.board === 1).map(entry),
      sideboard: result.contents.filter(card => card.board === 2).map(entry),
      maybeboard: result.contents.filter(card => card.board === 3).map(entry),
    },
    missingCardIds: [
      ...new Set(
        [
          result.deck.leaderCardId1,
          result.deck.leaderCardId2,
          result.deck.baseCardId,
          ...result.contents.map(card => card.cardId),
        ].filter((id): id is string => Boolean(id) && !getOfficialCard(id!)),
      ),
    ],
    boardMapping: result.deck.cardPoolId
      ? 'Card-pool deck location maps to main; pool and trash map to sideboard. Official leaders/bases and selected leader/base IDs are omitted; other unknown IDs are retained with unverified type.'
      : 'Main, sideboard and maybeboard retain their saved board numbers.',
  };
}
