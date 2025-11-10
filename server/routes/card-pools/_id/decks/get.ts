import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { and, eq, or, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { withPagination } from '../../../../lib/withPagination.ts';

const zParams = z.object({ id: z.uuid() });
const zQuery = z.object({
  userId: z.string().optional(),
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
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const { userId, limit, offset, sort, order } = c.req.valid('query');

    // Base filters: only decks from this card pool
    const filters: any[] = [eq(deckTable.cardPoolId, id)];

    if (userId) {
      // When userId is specified explicitly, scope to that user's decks
      filters.push(eq(deckTable.userId, userId));
      // If requesting someone else's decks, only show public ones
      if (userId !== user?.id) {
        filters.push(eq(deckTable.public, 1));
      }
    } else {
      // When userId is not specified: return all public decks + requester's own decks (if logged in)
      if (user?.id) {
        filters.push(or(eq(deckTable.public, 1), eq(deckTable.userId, user.id)));
      } else {
        filters.push(eq(deckTable.public, 1));
      }
    }

    let query = db.select().from(deckTable).$dynamic();
    query = query.where(and(...filters));
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
