import { expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { tournamentLocationService as service } from './location.ts';
import { TournamentLocationError } from './geocoding.ts';

// Explicit opt-in: this test creates and removes its own fixtures in a worktree DB.
test.skipIf(process.env.TOURNAMENT_LOCATION_DB_TEST !== '1')(
  'persists points/JSON and protects coordinates against stale edits and failed recomputes',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const id = crypto.randomUUID();
    const userId = `location-test-${id}`;
    const now = new Date();
    try {
      await db
        .insert(user)
        .values({
          id: userId,
          name: 'Location fixture',
          displayName: userId,
          email: `${userId}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: now,
          updatedAt: now,
        });
      await db
        .insert(tournament)
        .values({
          id,
          userId,
          name: 'PQ location fixture',
          type: 'pq',
          location: 'FR',
          continent: 'Europe',
          attendance: 0,
          format: 1,
          days: 1,
          date: now,
        });
      const original = (await service.list()).find(row => row.id === id)!;
      expect(original.additionalInfo).toEqual({});
      expect(original.coordinates).toBeNull();
      await service.save(
        id,
        { city: 'Paris', links: [{ url: 'https://example.com' }], custom_data: { nested_key: 42 } },
        {},
      );
      const geocoder = async (info: typeof original.additionalInfo) => ({
        coordinates: { x: 2.35, y: 48.85 },
        additionalInfo: { ...info, locationPrecision: 'city', geocoding: { provider: 'fixture' } },
      });
      const computed = await service.compute(id, false, geocoder);
      expect(computed.tournament.coordinates).toEqual({ x: 2.35, y: 48.85 });
      const raw = await db.execute(
        sql`SELECT jsonb_snake_to_camel(to_jsonb(t.*)) || jsonb_build_object('coordinates', CASE WHEN t.coordinates IS NULL THEN NULL ELSE jsonb_build_object('x',t.coordinates[0],'y',t.coordinates[1]) END) AS value FROM tournament t WHERE id=${id}`,
      );
      expect(raw[0].value).toMatchObject({
        coordinates: { x: 2.35, y: 48.85 },
        additionalInfo: { custom_data: { nested_key: 42 } },
      });
      expect(
        (
          await service.compute(id, false, async () => {
            throw new Error('Must skip provider');
          })
        ).status,
      ).toBe('skipped');
      await expect(
        service.compute(id, true, async () => {
          throw new TournamentLocationError('Provider failed', 502);
        }),
      ).rejects.toMatchObject({ status: 502 });
      let current = (await service.list()).find(row => row.id === id)!;
      expect(current.coordinates).toEqual(computed.tournament.coordinates);
      const linked = await service.save(
        id,
        { ...current.additionalInfo, storeUrl: 'https://example.com/store' },
        current.additionalInfo,
      );
      expect(linked.coordinates).toEqual(current.coordinates);
      await expect(service.save(id, { city: 'Rome' }, {})).rejects.toMatchObject({ status: 409 });
      // An edit while the provider is in flight must survive and reject the stale result.
      await expect(
        service.compute(id, true, async info => {
          await service.save(id, { ...info, city: 'Lyon' }, info);
          return geocoder(info);
        }),
      ).rejects.toMatchObject({ status: 409 });
      current = (await service.list()).find(row => row.id === id)!;
      expect(current.coordinates).toBeNull();
      expect(current.additionalInfo.city).toBe('Lyon');
      expect(current.additionalInfo.geocoding).toBeUndefined();
      expect(current.additionalInfo.locationPrecision).toBeUndefined();
      expect(current.additionalInfo.links).toHaveLength(1);
      await expect(service.compute(crypto.randomUUID(), false, geocoder)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      await db.delete(tournament).where(eq(tournament.id, id));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);
