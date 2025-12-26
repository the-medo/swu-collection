import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { fetchCardDecksData } from '../../../lib/cards/card-decks.ts';

const cardDecksQuerySchema = z.object({
  tournamentId: z.string().optional(),
  tournamentGroupId: z.string().optional(),
  metaId: z.coerce.number().optional(),
  leaderCardId: z.string().optional(),
  baseCardId: z.string().optional(),
});

export const decksForModalsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', cardDecksQuerySchema),
  async c => {
    const { tournamentId, tournamentGroupId, metaId, leaderCardId, baseCardId } =
      c.req.valid('query');

    if (!tournamentId && !tournamentGroupId && !metaId) {
      return c.json(
        { error: 'Either tournamentId, tournamentGroupId or metaId must be provided' },
        400,
      );
    }

    try {
      const data = await fetchCardDecksData({
        cardId: undefined,
        tournamentId,
        tournamentGroupId,
        metaId,
        leaderCardId,
        baseCardId,
      });

      return c.json({ data });
    } catch (error) {
      console.error('Error fetching decks for modals:', error);
      return c.json({ error: 'Failed to fetch decks for modals' }, 500);
    }
  },
);
