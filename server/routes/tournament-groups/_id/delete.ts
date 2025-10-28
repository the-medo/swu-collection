import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../db/schema/tournament_group.ts';
import { z } from 'zod';

export const tournamentGroupIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  const id = z.guid().parse(c.req.param('id'));
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        tournamentGroup: ['delete'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json(
      {
        message: "You don't have permission to delete a tournament group.",
      },
      403,
    );
  }

  // Check if the tournament group exists
  const existingGroup = await db
    .select()
    .from(tournamentGroupTable)
    .where(eq(tournamentGroupTable.id, id));

  if (existingGroup.length === 0) {
    return c.json({ message: 'Tournament group not found' }, 404);
  }

  // Delete the tournament group
  // Note: The related tournament_group_tournament records will be deleted automatically
  // due to the ON DELETE CASCADE constraint in the schema
  await db.delete(tournamentGroupTable).where(eq(tournamentGroupTable.id, id));

  return c.json({ message: 'Tournament group deleted successfully' });
});
