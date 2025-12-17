import { db } from '../../db';
import { collection } from '../../db/schema/collection.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';

// Helper to get cutoff date (8 hours ago and ~2 months ago)
const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
const oneMonthAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

/**
 * Returns recent collection IDs that need price recomputation.
 * Criteria:
 * - entity_price missing for the collection (type='collection'), OR
 * - entity_price.updated_at < collection.updated_at (collection changed), OR
 * - entity_price.updated_at < 8 hours ago (prices may have been updated)
 * Ordered by collection.updated_at DESC, limited by `count`.
 * Filters out collections older than ~1 month (based on updatedAt || createdAt).
 */
export const getRecentCollectionsForPriceRecomputation = async (
  count: number,
): Promise<string[]> => {
  const rows = await db
    .select({ id: collection.id, updatedAt: collection.updatedAt, createdAt: collection.createdAt })
    .from(collection)
    .leftJoin(
      entityPrice,
      and(eq(entityPrice.entityId, collection.id), eq(entityPrice.type, 'collection')),
    )
    .where(
      and(
        or(
          isNull(entityPrice.updatedAt),
          lt(entityPrice.updatedAt, collection.updatedAt),
          lt(entityPrice.updatedAt, eightHoursAgo),
        ),
        lt(collection.collectionType, 3), //recompute only 1 and 2 (collections + wantlists)
      ),
    )
    .groupBy(collection.id, collection.updatedAt, collection.createdAt)
    .orderBy(desc(collection.updatedAt))
    .limit(count);

  const cutoff = oneMonthAgo();
  const recent = rows.filter(r => (r.updatedAt ?? r.createdAt) >= cutoff);
  return recent.map(r => r.id);
};

export default getRecentCollectionsForPriceRecomputation;
