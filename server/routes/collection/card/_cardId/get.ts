import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { collection } from '../../../../db/schema/collection.ts';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import type {
  CollectionCardLookupList,
  CollectionCardLookupResponse,
} from '../../../../../shared/types/CollectionCardLookup.ts';

/** All stored variants of a card in the session owner's lists. */
export const collectionCardLookupGetRoute = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    c.header('Vary', 'Cookie');
    if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
    await next();
  })
  .get(
    '/',
    zValidator('param', z.object({ cardId: z.string().trim().min(1).max(255) })),
    async c => {
      const userId = c.get('user')!.id;
      const { cardId } = c.req.valid('param');
      const { collectionId: _collectionId, ...cardColumns } = getTableColumns(collectionCard);
      const rows = await db
        .select({
          collection: {
            id: collection.id,
            title: collection.title,
            collectionType: collection.collectionType,
          },
          card: cardColumns,
        })
        .from(collectionCard)
        .innerJoin(collection, eq(collectionCard.collectionId, collection.id))
        .where(and(eq(collection.userId, userId), eq(collectionCard.cardId, cardId)))
        .orderBy(
          asc(collection.collectionType),
          asc(collection.title),
          asc(collection.id),
          asc(collectionCard.variantId),
          asc(collectionCard.foil),
          asc(collectionCard.condition),
          asc(collectionCard.language),
        );

      const lists = new Map<string, CollectionCardLookupList>();
      for (const row of rows) {
        const list = lists.get(row.collection.id);
        if (list) {
          list.cards.push(row.card);
        } else {
          lists.set(row.collection.id, { collection: row.collection, cards: [row.card] });
        }
      }
      return c.json<CollectionCardLookupResponse>({ data: [...lists.values()] });
    },
  );
