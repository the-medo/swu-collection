import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, ilike } from 'drizzle-orm';
import { db } from '../db';
import { user } from '../db/schema/auth-schema.ts';
import type { AuthExtension } from '../auth/auth.ts';

// Public profile discovery: never return account names, emails, or auth metadata.
export const userSearchRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', z.object({ q: z.string().trim().min(2).max(80) })),
  async c => {
    const { q } = c.req.valid('query');
    const literal = q.replace(/[\\%_]/g, '\\$&');
    const data = await db
      .select({ id: user.id, displayName: user.displayName })
      .from(user)
      .where(ilike(user.displayName, `%${literal}%`))
      .orderBy(asc(user.displayName), asc(user.id))
      .limit(10);
    return c.json({ data });
  },
);
