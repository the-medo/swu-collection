import { z } from 'zod';
import { and, asc, count, countDistinct, eq, gt, ilike, inArray, sql } from 'drizzle-orm';
import type { Database } from '../server/lib/creators/types.ts';
import { collection } from '../server/db/schema/collection.ts';
import { collectionCard } from '../server/db/schema/collection_card.ts';
import { createDeckRepository } from './decks.ts';
import { getOfficialCard } from './cards.ts';
import { ToolFailure } from './tools/results.ts';

const page = {
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(10000).default(0),
};
const selection = {
  collectionIds: z.array(z.uuid()).min(1).max(50).optional(),
  forDecksOnly: z.boolean().default(true),
};
export const collectionListInput = z.object({
  type: z.enum(['collection', 'wantlist', 'card-list', 'all']).default('collection'),
  query: z.string().trim().min(1).max(120).optional(),
  ...page,
});
export const ownershipInput = z.object({
  ...selection,
  cardIds: z.array(z.string().min(1).max(256)).min(1).max(100).optional(),
  ...page,
});
export const missingCardsInput = z.object({
  ...selection,
  deckId: z.uuid(),
  boards: z
    .array(z.enum(['main', 'sideboard', 'maybeboard']))
    .min(1)
    .max(3)
    .default(['main', 'sideboard']),
  includeLeadersAndBase: z.boolean().default(true),
});
type Selection = z.infer<typeof ownershipInput>;
const typeNames = { 1: 'collection', 2: 'wantlist', 3: 'card-list' } as const;
const columns = {
  id: collection.id,
  title: collection.title,
  collectionType: collection.collectionType,
  forDecks: collection.forDecks,
  forSale: collection.forSale,
  public: collection.public,
  updatedAt: collection.updatedAt,
};
const cardIdentity = (cardId: string) => ({
  cardId,
  name: getOfficialCard(cardId)?.name ?? null,
  catalogAvailable: Boolean(getOfficialCard(cardId)),
});

export function createCollectionRepository(database: Database) {
  async function selected(
    db: Database,
    userId: string,
    input: Pick<Selection, 'collectionIds' | 'forDecksOnly'>,
  ) {
    // Explicit selections must be owned collections, even if a foreign one is public.
    if (input.collectionIds) {
      const ids = [...new Set(input.collectionIds)];
      const found = await db
        .select({ id: collection.id })
        .from(collection)
        .where(
          and(
            eq(collection.userId, userId),
            eq(collection.collectionType, 1),
            inArray(collection.id, ids),
          ),
        );
      if (found.length !== ids.length)
        throw new ToolFailure(
          'Collection not found or unavailable to your account. Select normal collections only.',
          404,
        );
    }
    return and(
      eq(collection.userId, userId),
      eq(collection.collectionType, 1),
      input.forDecksOnly ? eq(collection.forDecks, true) : undefined,
      input.collectionIds ? inArray(collection.id, input.collectionIds) : undefined,
    )!;
  }
  return {
    async list(userId: string, input: z.infer<typeof collectionListInput>) {
      const type =
        input.type === 'collection'
          ? 1
          : input.type === 'wantlist'
            ? 2
            : input.type === 'card-list'
              ? 3
              : undefined;
      const filter = and(
        eq(collection.userId, userId),
        type ? eq(collection.collectionType, type) : undefined,
        input.query
          ? ilike(collection.title, '%' + input.query.replace(/[\\%_]/g, '\\$&') + '%')
          : undefined,
      );
      return database.transaction(
        async tx => {
          const [total] = await tx.select({ count: count() }).from(collection).where(filter);
          const rows = await tx
            .select(columns)
            .from(collection)
            .where(filter)
            .orderBy(asc(collection.title), asc(collection.id))
            .limit(input.limit)
            .offset(input.offset);
          return {
            total: total!.count,
            limit: input.limit,
            offset: input.offset,
            collections: rows.map(row => ({
              ...row,
              type: typeNames[row.collectionType as keyof typeof typeNames] ?? 'unknown',
            })),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async ownership(userId: string, input: Selection) {
      return database.transaction(
        async tx => {
          const filter = and(
            await selected(tx, userId, input),
            gt(collectionCard.amount, 0),
            input.cardIds ? inArray(collectionCard.cardId, input.cardIds) : undefined,
          );
          const [total] = await tx
            .select({ count: countDistinct(collectionCard.cardId) })
            .from(collectionCard)
            .innerJoin(collection, eq(collection.id, collectionCard.collectionId))
            .where(filter);
          const cards = await tx
            .select({
              cardId: collectionCard.cardId,
              quantity: sql<number>`sum(${collectionCard.amount})`.mapWith(Number),
            })
            .from(collectionCard)
            .innerJoin(collection, eq(collection.id, collectionCard.collectionId))
            .where(filter)
            .groupBy(collectionCard.cardId)
            .orderBy(asc(collectionCard.cardId))
            .limit(input.limit)
            .offset(input.offset);
          const rows = cards.length
            ? await tx
                .select({
                  cardId: collectionCard.cardId,
                  collectionId: collection.id,
                  collectionTitle: collection.title,
                  forDecks: collection.forDecks,
                  variantId: collectionCard.variantId,
                  foil: collectionCard.foil,
                  condition: collectionCard.condition,
                  language: collectionCard.language,
                  quantity: collectionCard.amount,
                })
                .from(collectionCard)
                .innerJoin(collection, eq(collection.id, collectionCard.collectionId))
                .where(
                  and(
                    filter,
                    inArray(
                      collectionCard.cardId,
                      cards.map(card => card.cardId),
                    ),
                  ),
                )
                .orderBy(
                  asc(collection.id),
                  asc(collectionCard.cardId),
                  asc(collectionCard.variantId),
                  asc(collectionCard.foil),
                  asc(collectionCard.condition),
                  asc(collectionCard.language),
                )
                .limit(1001)
            : [];
          if (rows.length > 1000)
            throw new ToolFailure(
              'Too many printings. Use a smaller page or select fewer collections.',
              413,
            );
          return {
            total: total!.count,
            limit: input.limit,
            offset: input.offset,
            forDecksOnly: input.forDecksOnly,
            cards: cards.map(card => ({
              ...cardIdentity(card.cardId),
              quantity: card.quantity,
              holdings: rows.filter(row => row.cardId === card.cardId),
            })),
            ownershipBasis:
              'Positive amount in your selected normal collections. amount2, wantlists and card lists are excluded. Copies are not reserved across saved decks.',
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async missing(userId: string, input: z.infer<typeof missingCardsInput>) {
      return database.transaction(
        async tx => {
          const filter = await selected(tx, userId, input);
          const result = await createDeckRepository(tx).getDeck(userId, input.deckId);
          if (!result) throw new ToolFailure('Deck not found or unavailable to your account.', 404);
          if ('tooLarge' in result)
            throw new ToolFailure('This deck exceeds the supported content limit.', 413);
          if (result.deck.cardPoolId)
            throw new ToolFailure(
              'Missing-card checks support normal decks. Limited decks use the cards in their pool.',
              400,
            );
          const boardIds = new Set(
            input.boards.map(board => ({ main: 1, sideboard: 2, maybeboard: 3 })[board]),
          );
          const required = new Map<string, number>();
          for (const card of result.contents)
            if (boardIds.has(card.board))
              required.set(card.cardId, (required.get(card.cardId) ?? 0) + card.quantity);
          if (input.includeLeadersAndBase)
            for (const id of [
              result.deck.leaderCardId1,
              result.deck.leaderCardId2,
              result.deck.baseCardId,
            ])
              if (id) required.set(id, (required.get(id) ?? 0) + 1);
          const owned = required.size
            ? await tx
                .select({
                  cardId: collectionCard.cardId,
                  quantity: sql<number>`sum(${collectionCard.amount})`.mapWith(Number),
                })
                .from(collectionCard)
                .innerJoin(collection, eq(collection.id, collectionCard.collectionId))
                .where(
                  and(
                    filter,
                    gt(collectionCard.amount, 0),
                    inArray(collectionCard.cardId, [...required.keys()]),
                  ),
                )
                .groupBy(collectionCard.cardId)
            : [];
          const quantities = new Map(owned.map(card => [card.cardId, card.quantity]));
          const cards = [...required]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cardId, quantity]) => ({
              ...cardIdentity(cardId),
              required: quantity,
              owned: quantities.get(cardId) ?? 0,
              missing: Math.max(0, quantity - (quantities.get(cardId) ?? 0)),
            }));
          return {
            deckId: input.deckId,
            boards: [...boardIds].sort(),
            includeLeadersAndBase: input.includeLeadersAndBase,
            forDecksOnly: input.forDecksOnly,
            cards,
            missingCopies: cards.reduce((sum, card) => sum + card.missing, 0),
            complete: cards.every(card => card.missing === 0),
            ownershipBasis:
              'All printings/conditions/languages count by logical card ID. Positive amount only; no reservation across other decks.',
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  };
}
export type CollectionRepository = ReturnType<typeof createCollectionRepository>;
