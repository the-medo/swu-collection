import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckFavoriteRequest } from '../../../../../types/ZDeck.ts';
import { db } from '../../../../db';
import { userDeckFavorite } from '../../../../db/schema/user_deck_favorite.ts';
import { eq, and } from 'drizzle-orm';
import { deck } from '../../../../db/schema/deck.ts';
import {
  createNotifications,
  lockNotificationSource,
  retractUnseenNotifications,
} from '../../../../lib/notifications/write.ts';
import { z } from 'zod';

export const deckIdFavoritePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', z.object({ id: z.uuid() })),
  zValidator('json', zDeckFavoriteRequest),
  async c => {
    const paramDeckId = c.req.valid('param').id;
    const user = c.get('user');
    const { isFavorite } = c.req.valid('json');

    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    try {
      if (isFavorite) {
        const accessible = await db.transaction(async tx => {
          await lockNotificationSource(tx, ['deck.favorite', paramDeckId, user.id]);
          const [target] = await tx
            .select({ userId: deck.userId, public: deck.public })
            .from(deck)
            .where(eq(deck.id, paramDeckId))
            .for('share');
          if (!target || (target.public === 0 && target.userId !== user.id)) return false;
          const inserted = await tx
            .insert(userDeckFavorite)
            .values({ userId: user.id, deckId: paramDeckId })
            .onConflictDoNothing()
            .returning();
          if (!inserted.length || target.userId === user.id) return true;
          await createNotifications(tx, [
            {
              recipientUserId: target.userId,
              actorUserId: user.id,
              type: 'deck.favorite',
              entityType: 'deck',
              entityId: paramDeckId,
              dedupeKey: `deck.favorite:${paramDeckId}:${user.id}`,
            },
          ]);
          return true;
        });
        if (!accessible) return c.json({ message: 'Deck not found' }, 404);

        return c.json({ message: 'Deck favorited successfully' }, 201);
      } else {
        await db.transaction(async tx => {
          await lockNotificationSource(tx, ['deck.favorite', paramDeckId, user.id]);
          await tx
            .delete(userDeckFavorite)
            .where(
              and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, paramDeckId)),
            );
          await retractUnseenNotifications(tx, {
            type: 'deck.favorite',
            entityType: 'deck',
            entityId: paramDeckId,
            actorUserId: user.id,
          });
        });

        return c.json({ message: 'Deck unfavorited successfully' }, 200);
      }
    } catch (error) {
      console.error('Error updating deck favorite:', error);
      return c.json({ message: 'Internal server error' }, 500);
    }
  },
);
