import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { user } from '../db/schema/auth-schema.ts';
import { userSettings } from '../db/schema/user_settings.ts';
import type { AuthExtension } from '../auth/auth.ts';
import { userSettingsGetRoute } from '../routes/user-settings/get.ts';
import { userSettingsPostRoute } from '../routes/user-settings/post.ts';
import { userSetupGetRoute } from '../routes/user-setup/get.ts';
import { userHomeLocationService as service } from './userHomeLocation.ts';
import { homeLocationSettingKey } from '../../shared/lib/userHomeLocation.ts';
import { TournamentLocationError } from './tournaments/geocoding.ts';

test.skipIf(process.env.HOME_LOCATION_DB_TEST !== '1')(
  'home locations stay private, atomic and isolated between accounts and out of development dumps',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const userId = `home-test-${crypto.randomUUID()}`;
    const otherId = `${userId}-other`;
    const now = new Date();
    const input = { address: '', city: 'Paris', state: '', postalCode: '', country: 'FR' };
    const geocoder = async () => ({
      coordinates: { x: 2.35, y: 48.85 },
      additionalInfo: {
        locationPrecision: 'city',
        geocoding: { formattedAddress: 'Paris, France' },
      },
    });
    try {
      await db
        .insert(user)
        .values(
          [userId, otherId].map(id => ({
            id,
            name: 'Home fixture',
            displayName: id,
            email: `${id}@invalid.local`,
            emailVerified: false,
            currency: 'USD',
            createdAt: now,
            updatedAt: now,
          })),
        );
      await db.insert(userSettings).values({ userId, key: 'homepageMode', value: 'live' });
      expect(await service.get(userId)).toBeNull();
      const saved = await service.save(userId, input, geocoder);
      expect((await service.get(userId))?.coordinates).toEqual({ x: 2.35, y: 48.85 });
      expect(await service.get(otherId)).toBeNull();
      await expect(
        service.save(userId, { ...input, city: 'Lyon' }, async () => {
          throw new TournamentLocationError('Failed', 502);
        }),
      ).rejects.toMatchObject({ status: 502 });
      expect(await service.get(userId)).toEqual(saved);
      const app = new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', { id: userId } as NonNullable<AuthExtension['Variables']['user']>);
          await next();
        })
        .route('/settings', userSettingsGetRoute)
        .route('/settings', userSettingsPostRoute)
        .route('/setup', userSetupGetRoute);
      expect(await (await app.request('/settings')).json()).not.toHaveProperty(
        homeLocationSettingKey,
      );
      expect((await (await app.request('/setup')).json()).data.settings).not.toHaveProperty(
        homeLocationSettingKey,
      );
      const patch = await app.request('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckPrices: true }),
      });
      expect(patch.status).toBe(200);
      expect((await (await app.request('/settings')).json()).homepageMode).toBe('live');
      expect(await service.get(userId)).toEqual(saved);
      await service.save(otherId, { ...input, city: 'Other' }, geocoder);
      await service.save(userId, null);
      expect(await service.get(userId)).toBeNull();
      expect(await service.get(otherId)).not.toBeNull();
      expect(
        (
          await db
            .select()
            .from(userSettings)
            .where(and(eq(userSettings.userId, userId), eq(userSettings.key, 'homepageMode')))
        )[0].value,
      ).toBe('live');
      // Exercise the exact new cleanup rule with a temp table, leaving real data untouched.
      const sanitizer = await Bun.file(
        new URL('../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/DELETE FROM user_settings WHERE key = 'home_location';/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_settings WHERE key = 'home_location'\) THEN[\s\S]*?END IF;/,
      )![0];
      await db.transaction(async tx => {
        await tx.execute(
          sql`CREATE TEMP TABLE user_settings (user_id text, key text, value text) ON COMMIT DROP`,
        );
        await tx.execute(
          sql`INSERT INTO user_settings VALUES ('opted-in','home_location','private'), ('opted-out','home_location','private'), ('opted-in','homepageMode','live')`,
        );
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
        expect(
          (await tx.execute(sql`SELECT count(*)::int AS count FROM user_settings`))[0].count,
        ).toBe(1);
      });
    } finally {
      await db.delete(user).where(eq(user.id, userId));
      await db.delete(user).where(eq(user.id, otherId));
    }
  },
);
