import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { userCalendarRoute } from '../../routes/user-calendar.ts';
import { teamsIdEventsGetRoute } from '../../routes/teams/_id/events/get.ts';
import { tournamentSaveService } from './saves.ts';

test.skipIf(process.env.CALENDAR_SHARING_DB_TEST !== '1')(
  'calendar privacy, team membership and safe shared projections',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const users = Array.from({ length: 6 }, () => `calendar-fixture-${crypto.randomUUID()}`);
    const teams = [crypto.randomUUID(), crypto.randomUUID()];
    const events = Array.from({ length: 6 }, () => crypto.randomUUID());
    let viewer: string | null = null;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          viewer
            ? ({ id: viewer, role: viewer === users[5] ? 'admin' : 'user' } as NonNullable<
                AuthExtension['Variables']['user']
              >)
            : null,
        );
        await next();
      })
      .route('/calendar', userCalendarRoute)
      .route('/teams/:id/events', teamsIdEventsGetRoute);
    const privacy = (value: unknown) =>
      app.request('/calendar/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
    const shared = (owner: string) => app.request(`/calendar/${owner}`);
    const teamEvents = (id = teams[0], from = '2026-10-01') =>
      app.request(`/teams/${id}/events?from=${from}`);
    try {
      await db
        .insert(user)
        .values(
          users.map((id, i) => ({
            id,
            name: `Private legal name ${i}`,
            displayName: `Calendar ${i} ${id}`,
            email: `${id}@invalid.local`,
            emailVerified: false,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
            calendarPrivacy: (i === 1 ? 'private' : i === 3 ? 'public' : 'unlisted') as
              | 'private'
              | 'unlisted'
              | 'public',
          })),
        );
      await db
        .insert(team)
        .values(
          teams.map((id, i) => ({
            id,
            name: `Calendar team ${i}`,
            privacy: i ? 'public' : 'private',
          })),
        );
      await db
        .insert(teamMember)
        .values([
          ...users
            .slice(0, 4)
            .map((userId, i) => ({
              teamId: teams[0],
              userId,
              role: i ? ('member' as const) : ('owner' as const),
            })),
          { teamId: teams[1], userId: users[2], role: 'member' },
          { teamId: teams[1], userId: users[4], role: 'owner' },
        ]);
      await db
        .insert(tournament)
        .values(
          events.map((id, i) => ({
            id,
            userId: users[0],
            name: `Calendar event ${i}`,
            type: 'pq',
            format: 1,
            location: 'Paris',
            continent: 'Europe',
            attendance: 0,
            days: i === 1 ? 3 : 1,
            date: new Date(
              ['2026-09-28', '2026-09-29', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'][
                i
              ],
            ),
          })),
        );
      await tournamentSaveService.save(users[2], events[0], 'saved'); // past
      await tournamentSaveService.save(users[2], events[1], 'going'); // ongoing
      await tournamentSaveService.save(users[2], events[2], 'maybe');
      await tournamentSaveService.save(users[3], events[2], 'going'); // same event, another member
      await tournamentSaveService.save(users[1], events[3], 'saved'); // private-only event
      await tournamentSaveService.save(users[0], events[4], 'saved'); // own private remains visible to self
      await tournamentSaveService.save(users[4], events[5], 'going'); // outside target team
      await db
        .update(userTournamentSave)
        .set({ additionalInfo: { notes: 'SECRET BOOKING NOTE' } })
        .where(inArray(userTournamentSave.userId, users));
      expect((await app.request('/calendar/privacy')).status).toBe(401);
      expect((await privacy({ privacy: 'public' })).status).toBe(401);
      expect((await teamEvents()).status).toBe(401);
      expect((await shared(users[2])).status).toBe(404);
      const publicResponse = await shared(users[3]);
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.headers.get('Cache-Control')).toBe('private, no-store');
      const publicBody = await publicResponse.json();
      expect(publicBody.data.events).toHaveLength(1);
      expect(Object.keys(publicBody.data.events[0]).sort()).toEqual([
        'status',
        'tournament',
        'tournamentId',
      ]);
      expect(JSON.stringify(publicBody)).not.toContain('SECRET');
      expect(JSON.stringify(publicBody)).not.toContain('@invalid.local');
      expect(JSON.stringify(publicBody)).not.toContain('Private legal');
      for (const actor of [users[0], users[2], users[4], users[5]]) {
        viewer = actor;
        expect((await shared(users[1])).status).toBe(404); // neither team owners nor admins override private
      }
      viewer = users[0];
      expect((await (await app.request('/calendar/privacy')).json()).data.privacy).toBe('unlisted');
      expect((await shared(users[2])).status).toBe(200);
      expect((await privacy({ privacy: 'private', userId: users[2] })).status).toBe(400);
      expect((await privacy({ privacy: 'friends' })).status).toBe(400);
      expect((await privacy({ privacy: 'private' })).status).toBe(200);
      expect((await (await app.request('/calendar/privacy')).json()).data.privacy).toBe('private');
      expect((await teamEvents('not-a-uuid')).status).toBe(400);
      expect((await teamEvents(teams[0], '2026-02-30')).status).toBe(400);
      const teamResponse = await teamEvents();
      expect(teamResponse.headers.get('Cache-Control')).toBe('private, no-store');
      const rows = (await teamResponse.json()).data;
      expect(rows.map((row: any) => row.tournament.id)).toEqual([events[1], events[2], events[4]]);
      expect(rows[1].members.map((member: any) => member.userId)).toEqual([users[2], users[3]]);
      expect(rows[1].members.map((member: any) => member.status)).toEqual(['maybe', 'going']);
      expect(Object.keys(rows[1].members[0]).sort()).toEqual([
        'displayName',
        'image',
        'status',
        'userId',
      ]);
      expect(JSON.stringify(rows)).not.toContain('SECRET');
      viewer = users[2];
      expect((await (await teamEvents()).json()).data.map((row: any) => row.tournament.id)).toEqual(
        [events[1], events[2]],
      );
      viewer = users[1];
      expect((await shared(users[1])).status).toBe(200);
      expect(
        (await (await teamEvents()).json()).data.map((row: any) => row.tournament.id),
      ).toContain(events[3]);
      viewer = users[4];
      expect((await teamEvents()).status).toBe(403);
      expect((await shared(users[2])).status).toBe(200); // shared through another team
      await db
        .delete(teamMember)
        .where(and(eq(teamMember.teamId, teams[1]), eq(teamMember.userId, users[2])));
      expect((await shared(users[2])).status).toBe(404);
      viewer = users[2];
      expect((await privacy({ privacy: 'private' })).status).toBe(200);
      viewer = users[0];
      expect((await (await teamEvents()).json()).data.map((row: any) => row.tournament.id)).toEqual(
        [events[2], events[4]],
      );
      expect((await shared(users[2])).status).toBe(404);
      viewer = users[2];
      await privacy({ privacy: 'public' });
      viewer = null;
      expect((await shared(users[2])).status).toBe(200);
      viewer = users[5];
      expect((await teamEvents()).status).toBe(403);
      expect((await teamEvents(teams[1])).status).toBe(403); // public team still has members-only events
      expect((await shared(users[5])).status).toBe(200);
      expect((await (await shared(users[5])).json()).data.events).toEqual([]);
      viewer = users[0];
      await db
        .delete(teamMember)
        .where(and(eq(teamMember.teamId, teams[0]), eq(teamMember.userId, users[0])));
      expect((await teamEvents()).status).toBe(403);
      expect((await shared('missing-owner')).status).toBe(404);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, events));
      await db.delete(team).where(inArray(team.id, teams));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);
