import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';

// Helper to get cutoff date (30 days ago)
const monthAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

/**
 * Returns recent deck IDs that need price recomputation.
 * Criteria:
 * - entity_price missing for the deck (type='deck'), OR
 * - entity_price.updated_at < deck.updated_at (outdated)
 * Ordered by deck.updated_at DESC, limited by `count`.
 * Additionally filters out decks older than 1 month (based on updatedAt || createdAt)
 * without issuing a second DB query by selecting timestamps in the initial query.
 */
export const getRecentDecksForPriceRecomputation = async (count: number): Promise<string[]> => {
  const rows = await db
    .select({ id: deck.id, updatedAt: deck.updatedAt, createdAt: deck.createdAt })
    .from(deck)
    .leftJoin(entityPrice, and(eq(entityPrice.entityId, deck.id), eq(entityPrice.type, 'deck')))
    .where(or(isNull(entityPrice.updatedAt), lt(entityPrice.updatedAt, deck.updatedAt)))
    // De-duplicate potential multiple entity_price rows per deck
    .groupBy(deck.id, deck.updatedAt, deck.createdAt)
    .orderBy(desc(deck.updatedAt))
    .limit(count);

  const cutoff = monthAgo();
  const recent = rows.filter(r => (r.updatedAt ?? r.createdAt) >= cutoff);
  return recent.map(r => r.id);
};

export default getRecentDecksForPriceRecomputation;
