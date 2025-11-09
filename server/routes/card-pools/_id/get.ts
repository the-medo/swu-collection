import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { and, eq, or, ne, SQL } from 'drizzle-orm';
import { cardPools as cardPoolsTable } from '../../../db/schema/card_pool.ts';

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    const { id } = c.req.valid('param');

    try {
      // Build visibility/ownership constraint
      let conditions: SQL<unknown>[] = [eq(cardPoolsTable.id, id)];
      if (!user) {
        // Unauthenticated: only non-private pools are visible
        conditions.push(ne(cardPoolsTable.visibility, 'private'));
      } else {
        // Authenticated: owner can see any; others can see non-private
        const cond = or(
          ne(cardPoolsTable.visibility, 'private'),
          eq(cardPoolsTable.userId, user.id),
        )!;
        conditions.push(cond);
      }

      const [pool] = await db
        .select()
        .from(cardPoolsTable)
        .where(and(...conditions))
        .limit(1);

      if (!pool) {
        // Do not reveal whether the resource exists if not visible
        return c.json({ message: 'Card pool not found' }, 404);
      }

      return c.json({ data: pool });
    } catch (e) {
      return c.json({ message: 'Failed to fetch card pool' }, 500);
    }
  },
);
