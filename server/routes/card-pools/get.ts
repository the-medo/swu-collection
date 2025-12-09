import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { and, eq, sql } from 'drizzle-orm';
import { cardPools as cardPoolsTable } from '../../db/schema/card_pool.ts';
import { withPagination } from '../../lib/withPagination.ts';

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
    const user = c.get('user');
    const { userId, visibility, set, type, limit, offset, sort, order } = c.req.valid('query');

    const filters = [] as any[];

    // Visibility rule: only show public pools unless viewing your own
    if (!userId || userId !== user?.id) {
      filters.push(eq(cardPoolsTable.visibility, 'public'));
    } else {
      // Owner can optionally filter by a specific visibility
      if (visibility) {
        filters.push(eq(cardPoolsTable.visibility, visibility));
      }
    }

    if (userId) {
      filters.push(eq(cardPoolsTable.userId, userId));
    }

    if (set) {
      filters.push(eq(cardPoolsTable.set, set));
    }

    if (type) {
      filters.push(eq(cardPoolsTable.type, type));
    }

    let query = db.select().from(cardPoolsTable).$dynamic();

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    query = withPagination(query, limit, offset);

    const data = await query.orderBy(sql.raw(`${sort} ${order}`));

    return c.json({
      data,
      pagination: {
        limit,
        offset,
        hasMore: data.length === limit,
      },
    });
  },
);
