import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { cardVariantPrice } from '../../../../db/schema/card_variant_price.ts';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import { cardList } from '../../../../db/lists.ts';

// Result type: Record<card_id, Record<variant_id, boolean>>
export const checkDeletedVariantsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  // Ensure admin permission
  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        admin: ['access'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json({ message: "You don't have permission to access this resource." }, 403);
  }

  try {
    // Load distinct card_id + variant_id from card_variant_price
    const cvpPairs = await db
      .select({ cardId: cardVariantPrice.cardId, variantId: cardVariantPrice.variantId })
      .from(cardVariantPrice);

    // Load distinct card_id + variant_id from collection_card
    const ccPairs = await db
      .select({ cardId: collectionCard.cardId, variantId: collectionCard.variantId })
      .from(collectionCard)
      .groupBy(collectionCard.cardId, collectionCard.variantId);

    // Build initial map from both sources
    const map: Record<string, Record<string, boolean>> = {};

    const addPair = (cardId: string, variantId: string) => {
      if (!map[cardId]) map[cardId] = {};
      map[cardId][variantId] = true;
    };

    cvpPairs.forEach(p => addPair(p.cardId, p.variantId));
    ccPairs.forEach(p => addPair(p.cardId, p.variantId));

    // Remove variants that actually exist in current cardList
    Object.entries(cardList).forEach(([cid, card]) => {
      if (!card) return;
      const variants = card.variants ?? {};
      if (!map[cid]) return;
      Object.keys(variants).forEach(vid => {
        if (map[cid] && map[cid][vid]) {
          delete map[cid][vid];
        }
      });
      // If inner map becomes empty, remove the card key for cleanliness
      if (map[cid] && Object.keys(map[cid]).length === 0) {
        delete map[cid];
      }
    });

    return c.json({ message: 'ok', data: map }, 200);
  } catch (error) {
    console.error('Error checking deleted variants:', error);
    return c.json(
      {
        message: 'Failed to check deleted variants',
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
