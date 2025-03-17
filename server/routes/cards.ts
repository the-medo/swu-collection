import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardList } from '../db/lists.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// This timestamp will be regenerated whenever the server restarts
export const cardListLastUpdated = new Date().toISOString();

const clientVersionSchema = z.object({
  lastUpdated: z.string().optional(),
});

export const cardsRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', clientVersionSchema),
  async c => {
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
  },
);
