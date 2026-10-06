import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { team } from '../../../../db/schema/team.ts';
import { teamBookmark } from '../../../../db/schema/team_bookmark.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { MAX_TEAM_BOOKMARKS, zTeamBookmarkRequest } from '../../../../../types/ZTeamBookmark.ts';

const bookmarkParams = z.object({ id: z.uuid(), bookmarkId: z.uuid() });

export const teamsIdBookmarksRoute = new Hono<AuthExtension>()
  .use('*', zValidator('param', z.object({ id: z.uuid() })))
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = c.req.param('id')!;
    if (!(await getTeamMembership(teamId, user.id))) {
      const [existing] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));
      if (!existing) return c.json({ message: 'Team not found' }, 404);
      return c.json({ message: 'Only team members can access team bookmarks' }, 403);
    }
    await next();
  })
  .get('/', async c => {
    const bookmarks = await db
      .select()
      .from(teamBookmark)
      .where(eq(teamBookmark.teamId, c.req.param('id')!))
      .orderBy(asc(teamBookmark.createdAt), asc(teamBookmark.id));
    return c.json({ data: bookmarks });
  })
  .post('/', zValidator('json', zTeamBookmarkRequest), async c => {
    const teamId = c.req.param('id')!;
    const result = await db.transaction(async tx => {
      // Serialize additions for this team so concurrent requests cannot exceed the limit.
      const [existing] = await tx
        .select({ id: team.id })
        .from(team)
        .where(eq(team.id, teamId))
        .for('update');
      if (!existing) return { error: 'not-found' } as const;
      const [{ total }] = await tx
        .select({ total: count() })
        .from(teamBookmark)
        .where(eq(teamBookmark.teamId, teamId));
      if (total >= MAX_TEAM_BOOKMARKS) return { error: 'limit' } as const;
      const [bookmark] = await tx
        .insert(teamBookmark)
        .values({ ...c.req.valid('json'), teamId })
        .returning();
      return { data: bookmark } as const;
    });
    if ('error' in result) {
      if (result.error === 'not-found') return c.json({ message: 'Team not found' }, 404);
      return c.json({ message: `Teams can have up to ${MAX_TEAM_BOOKMARKS} bookmarks` }, 409);
    }
    return c.json({ data: result.data }, 201);
  })
  .patch(
    '/:bookmarkId',
    zValidator('param', bookmarkParams),
    zValidator('json', zTeamBookmarkRequest),
    async c => {
      const { id, bookmarkId } = c.req.valid('param');
      const [bookmark] = await db
        .update(teamBookmark)
        .set(c.req.valid('json'))
        .where(and(eq(teamBookmark.teamId, id), eq(teamBookmark.id, bookmarkId)))
        .returning();
      if (!bookmark) return c.json({ message: 'Bookmark not found' }, 404);
      return c.json({ data: bookmark });
    },
  )
  .delete('/:bookmarkId', zValidator('param', bookmarkParams), async c => {
    const { id, bookmarkId } = c.req.valid('param');
    const [bookmark] = await db
      .delete(teamBookmark)
      .where(and(eq(teamBookmark.teamId, id), eq(teamBookmark.id, bookmarkId)))
      .returning({ id: teamBookmark.id });
    if (!bookmark) return c.json({ message: 'Bookmark not found' }, 404);
    return c.json({ data: bookmark });
  });
