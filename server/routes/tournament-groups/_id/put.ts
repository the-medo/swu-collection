import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../db/schema/tournament_group.ts';
import { booleanPreprocessor } from '../../../../shared/lib/zod/booleanPreprocessor.ts';

// Define request body schema
const zTournamentGroupUpdateRequest = z.object({
  name: z.string().min(1).max(255).optional(),
  metaId: z.number().int().optional(),
  position: z.number().int().optional(),
  description: z.string().optional(),
  visible: booleanPreprocessor.optional(),
});

export const tournamentGroupIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zTournamentGroupUpdateRequest),
  async c => {
    const user = c.get('user');
    const id = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournamentGroup: ['update'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to update a tournament group.",
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

    // Update the tournament group
    const updatedGroup = await db
      .update(tournamentGroupTable)
      .set({
        ...data,
      })
      .where(eq(tournamentGroupTable.id, id))
      .returning();

    return c.json({ data: updatedGroup[0] });
  },
);
