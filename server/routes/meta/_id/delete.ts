import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { eq } from 'drizzle-orm';

export const metaIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  
  if (isNaN(id)) {
    return c.json({ message: 'Invalid ID format' }, 400);
  }
  
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        meta: ['delete'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json(
      {
        message: "You don't have permission to delete a meta entry.",
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

  await db
    .delete(metaTable)
    .where(eq(metaTable.id, id));

  return c.json({ success: true }, 200);
});