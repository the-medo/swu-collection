import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../../auth/auth.ts';

const zParams = z.object({ cardPoolNumber: z.number().int().nonnegative(), deckId: z.uuid() });
const zBody = z.object({
  location: z.enum(['pool', 'deck', 'trash']),
});

export const cardPoolsIdDecksDeckIdCardPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const { cardPoolNumber, deckId } = c.req.valid('param');
    const body = c.req.valid('json');
    // TODO: update card location within the deck
    return c.json(
      {
        data: { cardPoolNumber, deckId, updated: body },
        note: 'Not implemented yet. Should patch location for a card in a deck.',
      },
      501,
    );
  },
);
