import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { integrationGameData } from '../../../../db/schema/integration.ts';
import { or, eq, desc } from 'drizzle-orm';

export const karabastGameResultGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');

  if (!user) {
    return c.json([]);
  }

  const results = await db
    .select()
    .from(integrationGameData)
    .where(or(eq(integrationGameData.userId1, user.id), eq(integrationGameData.userId2, user.id)))
    .orderBy(desc(integrationGameData.createdAt));

  return c.json(results);
});
