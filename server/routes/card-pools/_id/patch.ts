import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { and, eq } from 'drizzle-orm';
import { cardPools as cardPoolsTable } from '../../../db/schema/card_pool.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
});

export const cardPoolsIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    try {
      // Ensure the pool exists and is owned by the user
      const [existing] = await db
        .select({ id: cardPoolsTable.id, userId: cardPoolsTable.userId })
        .from(cardPoolsTable)
        .where(eq(cardPoolsTable.id, id))
        .limit(1);

      if (!existing || existing.userId !== user.id) {
        // Hide existence if not owned
        return c.json({ message: 'Card pool not found' }, 404);
      }

      const updates: Record<string, unknown> = {};
      if (typeof body.name !== 'undefined') updates.name = body.name;
      if (typeof body.description !== 'undefined') updates.description = body.description;
      if (typeof body.visibility !== 'undefined') updates.visibility = body.visibility;
      updates.updatedAt = new Date().toISOString();

      const [updated] = await db
        .update(cardPoolsTable)
        .set(updates)
        .where(and(eq(cardPoolsTable.id, id), eq(cardPoolsTable.userId, user.id)))
        .returning();

      if (!updated) return c.json({ message: 'Failed to update card pool' }, 500);

      return c.json({ data: updated });
    } catch (e) {
      return c.json({ message: 'Failed to update card pool' }, 500);
    }
  },
);
