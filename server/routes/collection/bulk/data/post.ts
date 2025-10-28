import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../../../db';
import { eq, inArray } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';

// Input: array of collectionId-lastUpdatedAt pairs coming from frontend cache
const zCollectionItem = z.object({
  collectionId: z.string().min(1),
  lastUpdatedAt: z.iso.datetime().optional(),
});

const zBody = z.object({
  collections: z.array(zCollectionItem).optional().default([]),
});

export type Collection = typeof collectionTable.$inferSelect;
export type CollectionCard = typeof collectionCardTable.$inferSelect;

export const collectionsBulkDataPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zBody),
  async c => {
    const { collections: clientCollections } = c.req.valid('json');

    // 1) Ensure user is authenticated
    const userId = c.var.user?.id;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 2) Load all collections for current user
    const userCollections = await db
      .select()
      .from(collectionTable)
      .where(eq(collectionTable.userId, userId));

    // If no client list provided, return all collections and all their cards
    const byId = new Map<string, z.infer<typeof zCollectionItem>>(
      (clientCollections ?? []).map(it => [it.collectionId, it]),
    );

    // 3) Decide which collections need to be sent (new or updated)
    const neededCollections: Collection[] = [];
    if (!clientCollections || clientCollections.length === 0) {
      neededCollections.push(...userCollections);
    } else {
      for (const col of userCollections) {
        const item = byId.get(col.id);
        if (!item) {
          // client does not have this collection at all -> send
          neededCollections.push(col);
          continue;
        }
        if (!item.lastUpdatedAt) {
          neededCollections.push(col);
          continue;
        }
        const clientDate = new Date(item.lastUpdatedAt);
        const dbDate = new Date(col.updatedAt as unknown as any);
        if (clientDate < dbDate) {
          neededCollections.push(col);
        }
      }
    }

    // 4) Fetch collection_card rows for the needed collections
    const neededIds = neededCollections.map(cn => cn.id);
    let cards: CollectionCard[] = [];
    if (neededIds.length > 0) {
      cards = await db
        .select()
        .from(collectionCardTable)
        .where(inArray(collectionCardTable.collectionId, neededIds as any));
    }

    // 5) Group cards by collectionId
    const collectionCards: Record<string, CollectionCard[]> = {};
    for (const card of cards) {
      const cid = (card as any).collectionId as string;
      if (!collectionCards[cid]) collectionCards[cid] = [];
      collectionCards[cid].push(card);
    }

    clientCollections.forEach(cc => {
      if (!collectionCards[cc.collectionId]) {
        collectionCards[cc.collectionId] = [];
      }
    });

    // 6) Determine collections sent by client but not found for this user (removed)
    const userIds = new Set<string>(userCollections.map(uc => uc.id));
    const removedCollections: string[] = [];
    for (const item of clientCollections ?? []) {
      if (!userIds.has(item.collectionId)) {
        removedCollections.push(item.collectionId);
      }
    }

    return c.json({
      collections: neededCollections,
      collectionCardsMap: collectionCards,
      removedCollections,
    });
  },
);
