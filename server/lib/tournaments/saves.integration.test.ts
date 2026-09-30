import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { userSettings } from '../../db/schema/user_settings.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import { tournamentSaveService as service } from './saves.ts';
import { createUserTournamentSavesRoute } from '../../routes/user-tournament-saves.ts';
import { userSettingsGetRoute } from '../../routes/user-settings/get.ts';
import { userSettingsPostRoute } from '../../routes/user-settings/post.ts';
import { userSetupGetRoute } from '../../routes/user-setup/get.ts';
import type { AuthExtension } from '../../auth/auth.ts';

test.skipIf(process.env.TOURNAMENT_SAVE_DB_TEST !== '1')(
  'saved events isolate accounts, enforce API contracts, cascade, and stay out of development dumps',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const users = ['a', 'b'].map(suffix => `saves-test-${crypto.randomUUID()}-${suffix}`);
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    let account: string | null = users[0];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        if (account)
          c.set('user', { id: account } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/saves', createUserTournamentSavesRoute())
      .route('/settings', userSettingsGetRoute)
      .route('/settings', userSettingsPostRoute)
      .route('/setup', userSetupGetRoute);
    const put = (id: string, body: unknown) =>
      app.request(`/saves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Saves fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(tournament).values(
        ids.map((id, index) => ({
          id,
          userId: users[0],
          name: `Saved fixture ${index}`,
          type: 'pq',
          location: 'FR',
          continent: 'Europe',
          attendance: 0,
          format: 1,
          meta: null,
          days: 3,
          date: new Date('2026-10-31'),
          coordinates: index ? null : { x: 2.35, y: 48.85 },
        })),
      );
      const created = await put(ids[0], { status: 'saved' });
      expect(created.status).toBe(200);
      expect(created.headers.get('Cache-Control')).toBe('private, no-store');
      const first = (await created.json()).data;
      expect(first).toMatchObject({
        tournamentId: ids[0],
        status: 'saved',
        additionalInfo: {},
        tournament: { date: '2026-10-31', days: 3, coordinates: { x: 2.35, y: 48.85 } },
      });
      expect(first).not.toHaveProperty('userId');
      expect(await service.list(users[1])).toEqual([]);
      const updated = (await (await put(ids[0], { status: 'going' })).json()).data;
      expect(updated.status).toBe('going');
      expect(updated.createdAt).toBe(first.createdAt);
      expect(await service.list(users[0])).toHaveLength(1);
      for (const body of [
        { status: 'unknown' },
        { status: 'saved', userId: users[1] },
        {},
        { status: null },
      ])
        expect((await put(ids[0], body)).status).toBe(400);
      expect((await put('not-a-uuid', { status: 'saved' })).status).toBe(400);
      expect((await put(crypto.randomUUID(), { status: 'saved' })).status).toBe(404);
      account = null;
      expect((await app.request('/saves')).status).toBe(401);
      expect((await put(ids[0], { status: 'saved' })).status).toBe(401);
      expect((await app.request(`/saves/${ids[0]}`, { method: 'DELETE' })).status).toBe(401);
      account = users[1];
      expect((await (await app.request('/saves')).json()).data).toEqual([]);
      await put(ids[0], { status: 'maybe' });
      account = users[0];
      expect((await app.request(`/saves/${ids[0]}`, { method: 'DELETE' })).status).toBe(200);
      expect((await app.request(`/saves/${ids[0]}`, { method: 'DELETE' })).status).toBe(200);
      expect(await service.list(users[0])).toEqual([]);
      expect((await service.list(users[1]))[0].status).toBe('maybe');
      await db.update(tournament).set({ name: 'Updated fixture' }).where(eq(tournament.id, ids[0]));
      expect((await service.list(users[1]))[0].tournament.name).toBe('Updated fixture');
      await Promise.all([
        service.save(users[0], ids[1], 'saved'),
        service.save(users[0], ids[1], 'going'),
      ]);
      expect(await service.list(users[0])).toHaveLength(1);
      expect((await service.list(users[0]))[0].tournament.coordinates).toBeNull();
      // Calendar preferences share the existing partial settings API and survive round trips.
      await db
        .insert(userSettings)
        .values({ userId: users[0], key: 'homepageMode', value: 'live' });
      expect((await (await app.request('/settings')).json()).calendarWeekStartsOn).toBe(1);
      for (const day of [0, 6]) {
        const response = await app.request('/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarWeekStartsOn: day }),
        });
        expect(response.status).toBe(200);
        expect(await (await app.request('/settings')).json()).toMatchObject({
          calendarWeekStartsOn: day,
          homepageMode: 'live',
        });
        expect(
          (await (await app.request('/setup')).json()).data.settings.calendarWeekStartsOn,
        ).toBe(day);
      }
      account = users[1];
      expect((await (await app.request('/settings')).json()).calendarWeekStartsOn).toBe(1);
      // Run the exact sanitizer statements only against a transaction-local shadow table.
      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE user_tournament_save;/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_tournament_save\) THEN[\s\S]*?END IF;/,
      )![0];
      await db.transaction(async tx => {
        await tx.execute(
          sql`CREATE TEMP TABLE user_tournament_save (user_id text, additional_info jsonb) ON COMMIT DROP`,
        );
        await tx.execute(
          sql`INSERT INTO user_tournament_save VALUES ('opted-in','{"private":true}'), ('opted-out','{"private":true}')`,
        );
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
      await db.delete(tournament).where(eq(tournament.id, ids[0]));
      expect(await service.list(users[1])).toEqual([]);
      await service.save(users[1], ids[1], 'maybe');
      await db.delete(user).where(eq(user.id, users[1]));
      expect(
        await db
          .select()
          .from(userTournamentSave)
          .where(
            and(
              eq(userTournamentSave.userId, users[1]),
              eq(userTournamentSave.tournamentId, ids[1]),
            ),
          ),
      ).toEqual([]);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, ids));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);
