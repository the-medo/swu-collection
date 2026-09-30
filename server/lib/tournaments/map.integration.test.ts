import { expect, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { meta } from '../../db/schema/meta.ts';
import { SwuSet } from '../../../types/enums.ts';
import { getTournamentMap } from './map.ts';

test.skipIf(process.env.TOURNAMENT_MAP_DB_TEST !== '1')(
  'map sync scopes sets, includes all formats/dates, preserves timestamp precision, and reconciles deletes',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const userId = `map-test-${crypto.randomUUID()}`;
    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const metaIds: number[] = [];
    try {
      await db.insert(user).values({
        id: userId,
        name: 'Map fixture',
        displayName: userId,
        email: `${userId}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const metas = await db
        .insert(meta)
        .values([
          { name: 'Map fixture', set: 'hmw', format: 1, date: '2026-01-01', season: 999 },
          { name: 'Map fixture', set: 'ash', format: 1, date: '2026-01-01', season: 999 },
        ])
        .returning({ id: meta.id });
      metaIds.push(...metas.map(m => m.id));
      for (const [i, id] of ids.entries())
        await db.insert(tournament).values({
          id,
          userId,
          name: 'Map fixture',
          type: 'pq',
          location: 'BR',
          continent: 'South America',
          attendance: 0,
          format: i === 1 ? 3 : 1,
          meta: metaIds[i === 2 ? 1 : 0],
          days: 1,
          date: new Date(i === 0 ? '2026-01-01' : '2027-01-01'),
          updatedAt: sql`'2026-08-01T00:00:00.123456'::timestamp`,
          coordinates: i === 0 ? { x: -46.63, y: -23.55 } : null,
        });
      const full = await getTournamentMap(SwuSet.HMW);
      const own = full.tournaments.filter(t => ids.includes(t.id));
      expect(own).toHaveLength(2);
      expect(own.find(t => t.id === ids[0])?.coordinates).toEqual({ x: -46.63, y: -23.55 });
      expect(own[0].updatedAt).toBe('2026-08-01T00:00:00.123456Z');
      const unchanged = await getTournamentMap(SwuSet.HMW, '2026-08-02T00:00:00Z');
      expect(unchanged.tournaments.filter(t => ids.includes(t.id))).toHaveLength(0);
      expect(unchanged.versions.filter(t => ids.includes(t.id))).toHaveLength(2);
      await db
        .update(tournament)
        .set({ coordinates: null, updatedAt: sql`'2026-08-03T00:00:00.123457'::timestamp` })
        .where(eq(tournament.id, ids[0]));
      const delta = await getTournamentMap(SwuSet.HMW, '2026-08-03T00:00:00.123457Z');
      expect(delta.tournaments.filter(t => ids.includes(t.id))).toMatchObject([
        { id: ids[0], coordinates: null },
      ]);
      await db.delete(tournament).where(eq(tournament.id, ids[0]));
      await db.update(tournament).set({ meta: metaIds[1] }).where(eq(tournament.id, ids[1]));
      expect((await getTournamentMap(SwuSet.HMW)).versions.some(t => ids.includes(t.id))).toBe(
        false,
      );
      expect(
        (await getTournamentMap(SwuSet.ASH)).versions.filter(t => ids.includes(t.id)),
      ).toHaveLength(2);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, ids));
      if (metaIds.length) await db.delete(meta).where(inArray(meta.id, metaIds));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);
