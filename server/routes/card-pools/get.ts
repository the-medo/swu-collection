import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';

// Basic query params similar to decks/collections filters
export const zCardPoolsQuery = z.object({
  userId: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  set: z.string().optional(),
  type: z.enum(['prerelease', 'sealed', 'draft']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  order: z.enum(['asc', 'desc']).default('desc'),
  sort: z.enum(['created_at', 'updated_at']).default('updated_at'),
});
export type CardPoolsQuery = z.infer<typeof zCardPoolsQuery>;

export const cardPoolsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zCardPoolsQuery),
  async c => {
    const { limit, offset } = c.req.valid('query');
    // TODO: implement filters and DB query
    return c.json(
      {
        data: [],
        pagination: { limit, offset, hasMore: false },
        note: 'Not implemented yet. This should list your card pools or public ones based on filters.',
      },
      501,
    );
  },
);
