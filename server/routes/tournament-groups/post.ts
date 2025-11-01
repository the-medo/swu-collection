import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { tournamentGroup as tournamentGroupTable } from '../../db/schema/tournament_group.ts';
import { booleanPreprocessor } from '../../../shared/lib/zod/booleanPreprocessor.ts';

// Define request body schema
const zTournamentGroupCreateRequest = z.object({
  name: z.string().min(1).max(255),
  metaId: z.number().int().optional(),
  position: z.number().int().optional().default(0),
  description: z.string().optional(),
  visible: booleanPreprocessor.optional().default(true),
});

export const tournamentGroupPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentGroupCreateRequest),
  async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournamentGroup: ['create'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to create a tournament group.",
        },
        403,
      );
    }

    const newGroup = await db
      .insert(tournamentGroupTable)
      .values({
        ...data,
      })
      .returning();

    return c.json({ data: newGroup[0] }, 201);
  },
);
