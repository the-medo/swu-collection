import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardList } from '../db/lists.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { fetchCardDecksData } from '../lib/cards/card-decks.ts';

// This timestamp will be regenerated whenever the server restarts
export const cardListLastUpdated = new Date().toISOString();

const clientVersionSchema = z.object({
  lastUpdated: z.string().optional(),
});

const cardDecksQuerySchema = z.object({
  tournamentId: z.string().optional(),
  metaId: z.coerce.number().optional(),
  leaderCardId: z.string().optional(),
  baseCardId: z.string().optional(),
});

export const cardsRoute = new Hono<AuthExtension>()
  .get('/:id/decks', zValidator('query', cardDecksQuerySchema), async c => {
    const cardId = c.req.param('id');
    const { tournamentId, metaId, leaderCardId, baseCardId } = c.req.valid('query');

    // Ensure at least one of tournamentId or metaId is provided
    if (!tournamentId && !metaId) {
      return c.json({ error: 'Either tournamentId or metaId must be provided' }, 400);
    }

    try {
      const data = await fetchCardDecksData({
        cardId,
        tournamentId,
        metaId,
        leaderCardId,
        baseCardId,
      });

      return c.json({ data });
    } catch (error) {
      console.error('Error fetching card decks:', error);
      return c.json({ error: 'Failed to fetch card decks' }, 500);
    }
  })
  .post('/', zValidator('json', clientVersionSchema), async c => {
    const { lastUpdated } = c.req.valid('json');

    if (!lastUpdated) {
      // Client has no data, send full data
      return c.json({
        needsUpdate: true,
        lastUpdated: cardListLastUpdated,
        cards: cardList,
      });
    }

    // Compare timestamps
    const clientDate = new Date(lastUpdated);
    const serverDate = new Date(cardListLastUpdated);

    if (clientDate < serverDate) {
      // Client has outdated data, send full data
      return c.json({
        needsUpdate: true,
        lastUpdated: cardListLastUpdated,
        cards: cardList,
      });
    } else {
      // Client has current data
      return c.json({
        needsUpdate: false,
        lastUpdated: cardListLastUpdated,
        cards: undefined,
      });
    }
  });
