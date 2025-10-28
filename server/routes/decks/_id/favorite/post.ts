import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckFavoriteRequest } from '../../../../../types/ZDeck.ts';
import { db } from '../../../../db';
import { userDeckFavorite } from '../../../../db/schema/user_deck_favorite.ts';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const deckIdFavoritePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckFavoriteRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const user = c.get('user');
    const { isFavorite } = c.req.valid('json');

    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    try {
      if (isFavorite) {
        // Create favorite
        await db
          .insert(userDeckFavorite)
          .values({
            userId: user.id,
            deckId: paramDeckId,
          })
          .onConflictDoNothing();

        return c.json({ message: 'Deck favorited successfully' }, 201);
      } else {
        // Delete favorite
        await db
          .delete(userDeckFavorite)
          .where(
            and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, paramDeckId)),
          );

        return c.json({ message: 'Deck unfavorited successfully' }, 200);
      }
    } catch (error) {
      console.error('Error updating deck favorite:', error);
      return c.json({ message: 'Internal server error' }, 500);
    }
  },
);
