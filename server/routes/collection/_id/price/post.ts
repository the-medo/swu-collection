import { Hono } from 'hono';
import { type AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../../../../db';
import { entityPrice } from '../../../../db/schema/entity_price.ts';
import { recomputePricesForCollections } from '../../../../lib/entity-prices/recomputePricesForCollections.ts';

export const collectionIdPricePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramCollectionId = z.guid().parse(c.req.param('id'));

  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

  // Check if there was a recent update in the last 5 minutes
  const recentlyUpdated = await db
    .select({ entityId: entityPrice.entityId })
    .from(entityPrice)
    .where(
      and(eq(entityPrice.entityId, paramCollectionId), gte(entityPrice.updatedAt, tenSecondsAgo)),
    )
    .limit(1);

  if (recentlyUpdated.length === 0) {
    await recomputePricesForCollections([paramCollectionId]);
  }

  // Return all entity_price rows for this collection
  const rows = await db
    .select()
    .from(entityPrice)
    .where(and(eq(entityPrice.entityId, paramCollectionId), eq(entityPrice.type, 'collection')));

  return c.json({ data: rows });
});
