import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });
const zQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  order: z.enum(['asc', 'desc']).default('desc'),
  sort: z.enum(['created_at', 'updated_at', 'name']).default('updated_at'),
});

export const cardPoolsIdDecksGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  zValidator('query', zQuery),
  async c => {
    const { id } = c.req.valid('param');
    const { limit, offset } = c.req.valid('query');
    // TODO: return decks created for this card pool
    return c.json(
      {
        data: [],
        poolId: id,
        pagination: { limit, offset, hasMore: false },
        note: 'Not implemented yet. Should list decks for a given card pool.',
      },
      501,
    );
  },
);
