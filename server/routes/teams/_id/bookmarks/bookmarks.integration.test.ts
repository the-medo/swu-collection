import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { user } from '../../../../db/schema/auth-schema.ts';
import { team } from '../../../../db/schema/team.ts';
import { teamMember } from '../../../../db/schema/team_member.ts';
import { teamBookmark } from '../../../../db/schema/team_bookmark.ts';
import { teamsIdBookmarksRoute } from './index.ts';
import { MAX_TEAM_BOOKMARKS } from '../../../../../types/ZTeamBookmark.ts';

test.skipIf(process.env.TEAM_BOOKMARK_DB_TEST !== '1')(
  'team bookmarks enforce membership, safe links, team scoping, persistence and cleanup',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_')) {
      throw new Error('Select an isolated worktree database.');
    }
    const userIds = ['owner', 'member', 'visitor'].map(
      role => `bookmark-${role}-${crypto.randomUUID()}`,
    );
    const teamIds = [crypto.randomUUID(), crypto.randomUUID()];
    let account: string | null = userIds[1];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        if (account)
          c.set('user', { id: account } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/teams/:id/bookmarks', teamsIdBookmarksRoute);
    const request = (method: string, id: string, bookmarkId?: string, body?: unknown) =>
      app.request(`/teams/${id}/bookmarks${bookmarkId ? `/${bookmarkId}` : ''}`, {
        method,
        ...(body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
      });
    const payload = { label: ' Discord ', url: ' https://discord.gg/example ' };
    try {
      await db.insert(user).values(
        userIds.map(id => ({
          id,
          name: 'Bookmark fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(team).values(teamIds.map(id => ({ id, name: 'Bookmarks fixture' })));
      await db.insert(teamMember).values([
        { teamId: teamIds[0], userId: userIds[0], role: 'owner' },
        { teamId: teamIds[0], userId: userIds[1], role: 'member' },
        { teamId: teamIds[1], userId: userIds[1], role: 'member' },
      ]);

      expect((await (await request('GET', teamIds[0])).json()).data).toEqual([]);
      const created = await request('POST', teamIds[0], undefined, payload);
      expect(created.status).toBe(201);
      expect(created.headers.get('Cache-Control')).toBe('private, no-store');
      const first = (await created.json()).data;
      expect(first).toMatchObject({
        teamId: teamIds[0],
        label: 'Discord',
        url: 'https://discord.gg/example',
      });
      expect((await (await request('GET', teamIds[0])).json()).data).toEqual([first]);
      expect((await (await request('GET', teamIds[1])).json()).data).toEqual([]);

      for (const body of [
        { label: '  ', url: 'https://example.com' },
        { label: 'x'.repeat(101), url: 'https://example.com' },
        ...[
          'javascript:alert(1)',
          'data:text/html,test',
          'file:///etc/passwd',
          'ftp://example.com',
          '/relative',
          'example.com',
          'https://',
        ].map(url => ({ label: 'Link', url })),
        { label: 'Link', url: `https://example.com/${'a'.repeat(2048)}` },
        { ...payload, teamId: teamIds[1] },
        {},
      ]) {
        expect((await request('POST', teamIds[0], undefined, body)).status).toBe(400);
        expect((await request('PATCH', teamIds[0], first.id, body)).status).toBe(400);
      }
      expect((await request('GET', 'not-a-uuid')).status).toBe(400);
      expect((await request('PATCH', teamIds[0], 'not-a-uuid', payload)).status).toBe(400);
      expect((await request('DELETE', teamIds[0], 'not-a-uuid')).status).toBe(400);
      for (const id of [crypto.randomUUID(), first.id]) {
        expect((await request('PATCH', teamIds[1], id, payload)).status).toBe(404);
        expect((await request('DELETE', teamIds[1], id)).status).toBe(404);
      }
      expect((await request('GET', crypto.randomUUID())).status).toBe(404);

      for (const outsider of [userIds[2], null]) {
        account = outsider;
        for (const [method, bookmarkId, body] of [
          ['GET', undefined, undefined],
          ['POST', undefined, payload],
          ['PATCH', first.id, payload],
          ['DELETE', first.id, undefined],
        ] as const) {
          expect((await request(method, teamIds[0], bookmarkId, body)).status).toBe(
            outsider ? 403 : 401,
          );
        }
      }
      account = userIds[0];
      const updated = await request('PATCH', teamIds[0], first.id, {
        label: 'Practice',
        url: 'http://example.com/practice',
      });
      expect(updated.status).toBe(200);
      expect((await updated.json()).data).toMatchObject({
        id: first.id,
        createdAt: first.createdAt,
        label: 'Practice',
      });
      account = userIds[1];
      expect((await (await request('GET', teamIds[0])).json()).data[0].label).toBe('Practice');
      expect((await request('DELETE', teamIds[0], first.id)).status).toBe(200);
      expect((await request('DELETE', teamIds[0], first.id)).status).toBe(404);
      expect((await (await request('GET', teamIds[0])).json()).data).toEqual([]);

      await db.insert(teamBookmark).values(
        Array.from({ length: MAX_TEAM_BOOKMARKS - 1 }, (_, index) => ({
          teamId: teamIds[0],
          label: `Fixture ${index}`,
          url: 'https://example.com',
        })),
      );
      const concurrent = await Promise.all([
        request('POST', teamIds[0], undefined, payload),
        request('POST', teamIds[0], undefined, payload),
      ]);
      expect(concurrent.map(response => response.status).sort()).toEqual([201, 409]);
      expect((await (await request('GET', teamIds[0])).json()).data).toHaveLength(
        MAX_TEAM_BOOKMARKS,
      );
      await db.delete(teamMember).where(eq(teamMember.userId, userIds[1]));
      expect((await request('GET', teamIds[0])).status).toBe(403);
      expect((await request('POST', teamIds[0], undefined, payload)).status).toBe(403);
      await db.delete(team).where(eq(team.id, teamIds[0]));
      expect(
        await db.select().from(teamBookmark).where(eq(teamBookmark.teamId, teamIds[0])),
      ).toEqual([]);

      // Verify the exact dump cleanup/assertion on a transaction-local shadow table.
      const sanitizer = await Bun.file(
        new URL('../../../../../scripts/remote-dev/sql/002-teams-and-matches.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/DO \$team_bookmarks\$[\s\S]*?\$team_bookmarks\$;/)![0];
      const assertion = sanitizer.match(
        /IF to_regclass\('public.team_bookmark'\) IS NOT NULL THEN\s+IF EXISTS \(SELECT 1 FROM team_bookmark\) THEN[\s\S]*?END IF;\s+END IF;/,
      )![0];
      await db.transaction(async tx => {
        await tx.execute(sql`CREATE TEMP TABLE team_bookmark (url text) ON COMMIT DROP`);
        await tx.execute(sql`INSERT INTO team_bookmark VALUES ('https://private.example.com')`);
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
      // The guarded block also succeeds when an older backup has no bookmark table.
      const absentTableCleanup = cleanup.replace(
        /team_bookmark/g,
        'team_bookmark_not_yet_migrated',
      );
      const absentTableAssertion = assertion.replace(
        /team_bookmark/g,
        'team_bookmark_not_yet_migrated',
      );
      await db.transaction(async tx => {
        await tx.execute(sql.raw(absentTableCleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${absentTableAssertion} END $$;`));
      });
    } finally {
      await db.delete(team).where(inArray(team.id, teamIds));
      await db.delete(user).where(inArray(user.id, userIds));
    }
  },
);
