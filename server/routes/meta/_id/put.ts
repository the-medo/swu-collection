import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zMetaUpdateRequest } from '../../../../types/ZMeta.ts';
import { db } from '../../../db';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { eq } from 'drizzle-orm';

export const metaIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zMetaUpdateRequest),
  async c => {
    const user = c.get('user');
    const id = Number(c.req.param('id'));
    const data = c.req.valid('json');
    
    if (isNaN(id)) {
      return c.json({ message: 'Invalid ID format' }, 400);
    }
    
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          meta: ['update'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to update a meta entry.",
        },
        403,
      );
    }

    // Check if meta exists
    const existingMeta = await db
      .select({ id: metaTable.id })
      .from(metaTable)
      .where(eq(metaTable.id, id))
      .limit(1);

    if (existingMeta.length === 0) {
      return c.json({ message: 'Meta not found' }, 404);
    }

    const updatedMeta = await db
      .update(metaTable)
      .set(data)
      .where(eq(metaTable.id, id))
      .returning();

    return c.json({ data: updatedMeta[0] });
  },
);