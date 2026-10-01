import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { userCalendarSubscription } from '../../db/schema/user_calendar_subscription.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { tournamentSaveService } from '../tournaments/saves.ts';
import { createCalendarSubscriptionService } from './service.ts';
import { createCalendarFeedRoute } from '../../routes/calendar-feed.ts';
import { createUserCalendarSubscriptionRoute } from '../../routes/user-calendar-subscription.ts';

test.skipIf(process.env.CALENDAR_SUBSCRIPTION_DB_TEST !== '1')(
  'calendar subscription lifecycle, privacy, updates and revocation',
  async () => {
    const dbUrl = new URL(process.env.DATABASE_URL!);
    if (dbUrl.hostname !== '127.0.0.1' || !dbUrl.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const users = [crypto.randomUUID(), crypto.randomUUID()];
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const service = createCalendarSubscriptionService({
      origin: 'https://example.com',
      secret: 'fixture-calendar-secret-'.repeat(3),
    });
    let account: string | null = null;
    let sessionReads = 0;
    const app = new Hono<AuthExtension>()
      .route('/api/calendar', createCalendarFeedRoute(service))
      .use('*', async (c, next) => {
        sessionReads++;
        c.set(
          'user',
          account
            ? ({ id: account, role: account === users[1] ? 'admin' : 'user' } as NonNullable<
                AuthExtension['Variables']['user']
              >)
            : null,
        );
        await next();
      })
      .route('/api/user-calendar-subscription', createUserCalendarSubscriptionRoute(service));
    const change = (
      method = 'GET',
      path = '',
      headers: Record<string, string> = { 'X-Requested-With': 'swubase' },
    ) => app.request('/api/user-calendar-subscription' + path, { method, headers });
    const getFeed = (url: string, etag?: string, method = 'GET') =>
      app.request(new URL(url).pathname, {
        method,
        headers: etag ? { 'If-None-Match': etag } : {},
      });
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Calendar fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(tournament).values(
        ids.map((id, i) => ({
          id,
          userId: users[0],
          name: i ? 'Other user event' : 'Private plans tournament',
          type: 'pq',
          location: 'Paris',
          continent: 'Europe',
          attendance: 0,
          format: 1,
          meta: null,
          days: 2,
          date: new Date('2026-10-31'),
        })),
      );
      for (const [method, path] of [
        ['GET', ''],
        ['PUT', ''],
        ['POST', '/regenerate'],
        ['DELETE', ''],
      ])
        expect((await change(method, path)).status).toBe(401);
      account = users[0];
      expect((await (await change()).json()).data).toEqual({ enabled: false, url: null });
      expect((await change('PUT', '', {})).status).toBe(403);
      const enabled = await change('PUT');
      expect(enabled.headers.get('Cache-Control')).toBe('private, no-store');
      const url = (await enabled.json()).data.url;
      expect(url).toStartWith('https://example.com/api/calendar/');
      expect((await (await change('PUT')).json()).data.url).toBe(url);
      expect((await (await change()).json()).data.url).toBe(url);
      const readCount = sessionReads;
      const empty = await getFeed(url);
      expect(empty.status).toBe(200);
      expect(await empty.text()).not.toContain('BEGIN:VEVENT');
      expect(sessionReads).toBe(readCount); // Google needs neither session cookies nor login.
      await tournamentSaveService.save(users[0], ids[0], 'maybe');
      await tournamentSaveService.save(users[1], ids[1], 'going');
      await db
        .update(userTournamentSave)
        .set({ additionalInfo: { notes: 'SECRET RESERVATION' } })
        .where(eq(userTournamentSave.userId, users[0]));
      const response = await getFeed(url);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
      const body = await response.text();
      expect(body).toContain('SUMMARY:Private plans tournament');
      expect(body).toContain('CATEGORIES:Maybe');
      expect(body).toContain('DTEND;VALUE=DATE:20261102');
      expect(body).not.toContain('Other user event');
      expect(body).not.toContain('SECRET RESERVATION');
      expect(body).not.toContain(users[0]);
      const etag = response.headers.get('ETag')!;
      expect((await getFeed(url, etag)).status).toBe(304);
      expect((await getFeed(url, `W/${etag}`)).status).toBe(304);
      expect((await getFeed(url, '*')).status).toBe(304);
      const head = await getFeed(url, undefined, 'HEAD');
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
      await tournamentSaveService.save(users[0], ids[0], 'going');
      const updated = await getFeed(url, etag);
      expect(updated.status).toBe(200);
      expect(updated.headers.get('ETag')).not.toBe(etag);
      expect(await updated.text()).toContain('CATEGORIES:Going');
      await db
        .update(tournament)
        .set({
          name: 'Rescheduled tournament',
          date: new Date('2026-12-31'),
          days: 3,
          updatedAt: new Date(),
        })
        .where(eq(tournament.id, ids[0]));
      const rescheduled = await (await getFeed(url)).text();
      expect(rescheduled).toContain('SUMMARY:Rescheduled tournament');
      expect(rescheduled).toContain('DTEND;VALUE=DATE:20270103');
      expect(rescheduled.replace(/\r\n /g, '')).toContain(`UID:tournament-${ids[0]}@swubase.com`);
      account = users[1];
      expect((await (await change()).json()).data.enabled).toBe(false);
      const otherUrl = (await (await change('PUT', `?userId=${users[0]}`)).json()).data.url;
      expect(otherUrl).not.toBe(url);
      expect(await (await getFeed(otherUrl)).text()).toContain('Other user event');
      await change('DELETE');
      expect((await getFeed(otherUrl)).status).toBe(404);
      expect((await getFeed(url)).status).toBe(200);
      account = users[0];
      const rotated = (await (await change('POST', '/regenerate')).json()).data.url;
      expect(rotated).not.toBe(url);
      expect((await getFeed(url, etag)).status).toBe(404);
      expect((await getFeed(rotated)).status).toBe(200);
      await tournamentSaveService.remove(users[0], ids[0]);
      expect(await (await getFeed(rotated)).text()).not.toContain('BEGIN:VEVENT');
      const disabled = (await (await change('DELETE')).json()).data;
      expect(disabled).toEqual({ enabled: false, url: null });
      expect((await getFeed(rotated)).status).toBe(404);
      const reenabled = (await (await change('PUT')).json()).data.url;
      expect(reenabled).not.toBe(rotated);
      for (const path of [
        '/api/calendar/bad.ics',
        '/api/calendar/bad',
        '/api/calendar/extra/bad.ics',
      ]) {
        const invalid = await app.request(path);
        expect(invalid.status).toBe(404);
        expect(invalid.headers.get('Content-Type')).not.toContain('text/html');
      }
      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE user_calendar_subscription;/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_calendar_subscription\)[\s\S]*?END IF;/,
      )![0];
      await db.transaction(async tx => {
        await tx.execute(
          sql`CREATE TEMP TABLE user_calendar_subscription (secret text) ON COMMIT DROP`,
        );
        await tx.execute(
          sql`INSERT INTO user_calendar_subscription VALUES ('private subscription')`,
        );
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
      await db.delete(tournament).where(inArray(tournament.id, ids));
      await db.delete(user).where(eq(user.id, users[0]));
      expect((await getFeed(reenabled)).status).toBe(404);
      expect(
        await db
          .select()
          .from(userCalendarSubscription)
          .where(eq(userCalendarSubscription.userId, users[0])),
      ).toHaveLength(0);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, ids));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
