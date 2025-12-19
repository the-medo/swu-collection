import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { entityPrice } from '../../../../db/schema/entity_price.ts';
import { recomputePricesForDecks } from '../../../../lib/entity-prices/recomputePricesForDecks.ts';

export const deckIdPricePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramDeckId = z.guid().parse(c.req.param('id'));

  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

  // Check if there was a recent update in the last 5 minutes
  const recentlyUpdated = await db
    .select({ entityId: entityPrice.entityId })
    .from(entityPrice)
    .where(and(eq(entityPrice.entityId, paramDeckId), gte(entityPrice.updatedAt, tenSecondsAgo)))
    .limit(1);

  if (recentlyUpdated.length === 0) {
    await recomputePricesForDecks([paramDeckId]);
  }

  // Return all entity_price rows for this deck
  const rows = await db
    .select()
    .from(entityPrice)
    .where(and(eq(entityPrice.entityId, paramDeckId), eq(entityPrice.type, 'deck')));

  return c.json({ data: rows });
});
