import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { deleteDecksOwnedByUser } from '../../../lib/decks/deleteDecks.ts';

const zParams = z.object({ id: z.guid() });

export const deckIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');
    const result = await deleteDecksOwnedByUser(user.id, [id]);

    if (result.status === 'not_found') {
      return c.json(
        { message: "Deck doesn't exist or you don't have permission to delete it" },
        404,
      );
    }

    if (result.status === 'conflict') {
      return c.json({ message: 'Deck is linked to tournament data and cannot be deleted' }, 409);
    }

    return c.json({ data: result.deletedDecks[0] });
  },
);
