import { z } from 'zod';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { Database } from '../server/lib/creators/types.ts';
import { cardPools, cardPoolCards } from '../server/db/schema/card_pool.ts';
import { getBasicBaseIdsForSet } from '../shared/lib/basicBases.ts';
import { SwuSet } from '../types/enums.ts';
import { articleCatalog } from './articles/catalog.ts';
import { cardDetails } from './cards.ts';
import { ToolFailure } from './tools/results.ts';

export const cardPoolListInput = z.strictObject({
  query: z.string().trim().min(1).max(120).optional(),
  type: z.enum(['sealed', 'prerelease', 'draft']).optional(),
  set: z.string().trim().min(1).max(32).optional(),
  status: z.enum(['in_progress', 'ready']).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(25).default(10),
  offset: z.number().int().min(0).max(10000).default(0),
});
export const cardPoolGetInput = z.strictObject({ poolId: z.uuid() });
const columns = {
  poolId: cardPools.id,
  name: cardPools.name,
  set: cardPools.set,
  type: cardPools.type,
  status: cardPools.status,
  visibility: cardPools.visibility,
  custom: cardPools.custom,
  edited: cardPools.edited,
  archivedAt: cardPools.archivedAt,
  createdAt: cardPools.createdAt,
  updatedAt: cardPools.updatedAt,
};
const summarize = <T extends { name: string | null }>(row: T) => ({
  ...row,
  name: row.name?.slice(0, 255) ?? null,
});

export function createCardPoolRepository(
  database: Database,
  catalogReader = articleCatalog(database),
) {
  return {
    async list(userId: string, input: z.infer<typeof cardPoolListInput>) {
      const filter = and(
        eq(cardPools.userId, userId),
        input.type ? eq(cardPools.type, input.type) : undefined,
        input.set ? eq(cardPools.set, input.set) : undefined,
        input.status ? eq(cardPools.status, input.status) : undefined,
        input.visibility ? eq(cardPools.visibility, input.visibility) : undefined,
        input.includeArchived ? undefined : isNull(cardPools.archivedAt),
        input.query
          ? ilike(cardPools.name, '%' + input.query.replace(/[\\%_]/g, '\\$&') + '%')
          : undefined,
      );
      return database.transaction(
        async tx => {
          const [total] = await tx.select({ count: count() }).from(cardPools).where(filter);
          const rows = await tx
            .select(columns)
            .from(cardPools)
            .where(filter)
            .orderBy(desc(cardPools.updatedAt), asc(cardPools.id))
            .limit(input.limit)
            .offset(input.offset);
          return {
            total: total!.count,
            limit: input.limit,
            offset: input.offset,
            pools: rows.map(summarize),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async get(userId: string, input: z.infer<typeof cardPoolGetInput>, websiteOrigin: string) {
      const saved = await database.transaction(
        async tx => {
          const [pool] = await tx
            .select({ ...columns, description: cardPools.description })
            .from(cardPools)
            .where(
              and(
                eq(cardPools.id, input.poolId),
                or(
                  eq(cardPools.userId, userId),
                  inArray(cardPools.visibility, ['public', 'unlisted']),
                ),
              ),
            )
            .limit(1);
          if (!pool)
            throw new ToolFailure('Card pool not found or unavailable to your account.', 404);
          const cards = await tx
            .select({ cardPoolNumber: cardPoolCards.cardPoolNumber, cardId: cardPoolCards.cardId })
            .from(cardPoolCards)
            .where(eq(cardPoolCards.cardPoolId, pool.poolId))
            .orderBy(asc(cardPoolCards.cardPoolNumber))
            .limit(1001);
          if (cards.length > 1000)
            throw new ToolFailure(
              'This pool exceeds the supported limit of 1,000 physical cards.',
              413,
            );
          return { pool, cards };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      // Load after releasing the snapshot so concurrent reads cannot exhaust the pool.
      const catalog = await catalogReader();
      const copies = new Map<string, number[]>();
      for (const card of saved.cards) {
        const numbers = copies.get(card.cardId) ?? [];
        numbers.push(card.cardPoolNumber);
        copies.set(card.cardId, numbers);
      }
      const describe = (cardId: string) => {
        const card = catalog[cardId];
        return {
          cardId,
          catalogAvailable: Boolean(card),
          preview: Boolean(card?.preview),
          details: card ? cardDetails(card, websiteOrigin) : null,
        };
      };
      const cards = [...copies]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cardId, cardPoolNumbers]) => ({
          ...describe(cardId),
          quantity: cardPoolNumbers.length,
          cardPoolNumbers,
        }));
      const set = z.enum(SwuSet).safeParse(saved.pool.set);
      const basicBaseOptions = set.success
        ? getBasicBaseIdsForSet(set.data, catalog).map(describe)
        : [];
      return {
        pool: {
          ...saved.pool,
          ...summarize(saved.pool),
          description: saved.pool.description?.slice(0, 4000) ?? null,
          descriptionTruncated: (saved.pool.description?.length ?? 0) > 4000,
          url: websiteOrigin + '/limited/pool/' + saved.pool.poolId + '/detail',
        },
        catalog: 'official_and_active_preview' as const,
        totalPhysicalCards: saved.cards.length,
        cards,
        missingCardIds: cards.filter(card => !card.catalogAvailable).map(card => card.cardId),
        previewCardIds: cards.filter(card => card.preview).map(card => card.cardId),
        basicBaseOptions,
        buildingGuidance:
          'Each cardPoolNumber identifies one physical copy in this pool. Use a copy at most once within a proposed build; alternative builds may reuse the pool. Basic base options match the app set catalog and are separate from physical inventory. In-progress pools may be incomplete. Unknown cards have no verified text. This tool reads inventory; the agent proposes builds and checks applicable event rules.',
      };
    },
  };
}
export type CardPoolRepository = ReturnType<typeof createCardPoolRepository>;
