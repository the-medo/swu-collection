import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });

export const cardPoolsIdDecksDeckIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const { id, deckId } = c.req.valid('param');
    // TODO: delete the deck and related relations rows
    return c.json(
      {
        data: { poolId: id, deckId },
        note: 'Not implemented yet. Should delete the deck (also from decks table).',
      },
      501,
    );
  },
);
