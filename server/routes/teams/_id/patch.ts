import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zTeamUpdateRequest } from '../../../../types/ZTeam.ts';
import { db } from '../../../db';
import { team as teamTable } from '../../../db/schema/team.ts';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../lib/getTeamMembership.ts';
import { assertNamedTextAllowed, assertTextAllowed } from '../../../lib/moderation/content.ts';

export const teamsIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTeamUpdateRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');

    // Check ownership
    const membership = await getTeamMembership(teamId, user.id);

    if (!membership || membership.role !== 'owner') {
      return c.json({ message: 'Only team owners can update team settings' }, 403);
    }

    let text: { name?: string | null; shortcut?: string | null; description?: string | null } =
      data;
    if (data.privacy === 'public') {
      const [current] = await db.select().from(teamTable).where(eq(teamTable.id, teamId));
      if (!current) return c.json({ message: 'Team not found' }, 404);
      text = { ...current, ...data };
    }
    assertNamedTextAllowed(text, 'Team');
    assertTextAllowed(text.shortcut, 'shortcut', 'Team shortcut');

    // Check shortcut uniqueness if changing
    if (data.shortcut) {
      const existing = await db
        .select({ id: teamTable.id })
        .from(teamTable)
        .where(eq(teamTable.shortcut, data.shortcut))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== teamId) {
        return c.json({ message: 'This shortcut is already taken' }, 400);
      }
    }

    const [updated] = await db
      .update(teamTable)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(teamTable.id, teamId))
      .returning();

    return c.json({ data: updated });
  },
);
