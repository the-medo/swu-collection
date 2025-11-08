import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdCardsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const { id } = c.req.valid('param');
    // TODO: return list of all cards in the card pool if user has rights
    return c.json(
      {
        data: [],
        poolId: id,
        note: 'Not implemented yet. Should return card list for a given card pool.',
      },
      501,
    );
  },
);
