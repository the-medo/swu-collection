import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { gameResult } from '../../db/schema/game_result.ts';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const schema = z.object({
  datetimeFrom: z.string().optional(),
  datetimeTo: z.string().optional(),
  teamId: z.string().optional(),
});

export const gameResultGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', schema),
  async c => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { datetimeFrom, datetimeTo, teamId } = c.req.valid('query');

    let whereClause;

    if (datetimeFrom && datetimeTo) {
      whereClause = and(
        eq(gameResult.userId, user.id),
        gte(gameResult.createdAt, datetimeFrom),
        lte(gameResult.createdAt, datetimeTo),
      );
    } else if (datetimeFrom) {
      whereClause = and(eq(gameResult.userId, user.id), gte(gameResult.updatedAt, datetimeFrom));
    } else {
      whereClause = eq(gameResult.userId, user.id);
    }

    const results = await db
      .select()
      .from(gameResult)
      .where(whereClause)
      .orderBy(desc(gameResult.createdAt));

    return c.json(results);
  },
);
