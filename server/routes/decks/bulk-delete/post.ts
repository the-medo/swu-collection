import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { zDeckBulkDeleteRequest } from '../../../../types/ZDeck.ts';
import type { AuthExtension } from '../../../auth/auth.ts';
import { deleteDecksOwnedByUser } from '../../../lib/decks/deleteDecks.ts';

export const decksBulkDeletePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckBulkDeleteRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { deckIds } = c.req.valid('json');
    const result = await deleteDecksOwnedByUser(user.id, deckIds);

    if (result.status === 'not_found') {
      return c.json(
        { message: "One or more decks don't exist or you don't have permission to delete them" },
        404,
      );
    }

    if (result.status === 'conflict') {
      return c.json(
        { message: 'One or more decks are linked to tournament data and cannot be deleted' },
        409,
      );
    }

    return c.json({
      data: {
        deletedDeckIds: result.deletedDecks.map(deck => deck.id),
        affectedCardPoolIds: result.affectedCardPoolIds,
      },
    });
  },
);
