import { expect, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { meta } from '../../db/schema/meta.ts';
import { getTournamentMap } from './map.ts';
import { eventHighlightService } from './eventHighlights.ts';

test.skipIf(process.env.TOURNAMENT_MAP_DB_TEST !== '1')(
  'date sync includes all sets and missing metas, handles boundaries, deltas, date moves, deletes and highlights',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const userId = `map-test-${crypto.randomUUID()}`;
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2027-02-01', '2027-02-02'];
    const ids = dates.map(() => crypto.randomUUID());
    const metaIds: number[] = [];
    let highlightId: string | undefined;
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
          format: i === 2 ? 3 : 1,
          meta: i === 3 ? null : metaIds[i % 2],
          days: 1,
          date: new Date(dates[i]),
          updatedAt: sql`'2026-08-01T00:00:00.123456'::timestamp`,
          coordinates: null,
        });
      const full = await getTournamentMap();
      expect(full.window).toEqual({ from: '2026-10-02', to: '2027-02-01' });
      expect(full.range).toEqual(full.window);
      const own = full.tournaments.filter(t => ids.includes(t.id));
      expect(own.map(t => t.id).sort()).toEqual(ids.slice(1, 4).sort());
      expect(own[0].updatedAt).toBe('2026-08-01T00:00:00.123456Z');
      expect(own.find(t => t.id === ids[2])?.format).toBe(3);
      const custom = await getTournamentMap({ from: '2026-10-01', to: '2026-10-02' });
      expect(
        custom.tournaments
          .filter(t => ids.includes(t.id))
          .map(t => t.id)
          .sort(),
      ).toEqual(ids.slice(0, 2).sort());
      expect((await getTournamentMap({ from: '2026-09-01' })).range).toEqual({
        from: '2026-09-01',
        to: '2026-12-31',
      });
      const unchanged = await getTournamentMap({ updatedSince: '2026-08-02T00:00:00Z' });
      expect(unchanged.tournaments.filter(t => ids.includes(t.id))).toHaveLength(0);
      expect(unchanged.versions.filter(t => ids.includes(t.id))).toHaveLength(3);
      await db
        .update(tournament)
        .set({
          coordinates: { x: 2, y: 48 },
          updatedAt: sql`'2026-08-03T00:00:00.123457'::timestamp`,
        })
        .where(eq(tournament.id, ids[1]));
      const delta = await getTournamentMap({ updatedSince: '2026-08-03T00:00:00.123457Z' });
      expect(delta.tournaments.filter(t => ids.includes(t.id))).toMatchObject([
        { id: ids[1], coordinates: { x: 2, y: 48 } },
      ]);
      await db.delete(tournament).where(eq(tournament.id, ids[1]));
      // Moving with an old timestamp still changes membership/version manifests.
      await db
        .update(tournament)
        .set({ date: new Date('2027-03-01') })
        .where(eq(tournament.id, ids[2]));
      expect(
        (await getTournamentMap()).versions.filter(t => ids.includes(t.id)).map(t => t.id),
      ).toEqual([ids[3]]);
      const input = {
        date: '2026-10-02',
        imageUrl: 'https://images.swubase.com/logo.png',
        description: 'Integration fixture',
      };
      const created = await eventHighlightService.create(input);
      highlightId = created.id;
      expect(
        (await getTournamentMap({ updatedSince: '2099-01-01T00:00:00Z' })).highlights.find(
          h => h.id === highlightId,
        ),
      ).toMatchObject(input);
      await eventHighlightService.update(highlightId, {
        ...input,
        date: '2027-03-01',
        description: 'Updated fixture',
      });
      expect(
        (await getTournamentMap()).highlights.find(h => h.id === highlightId)?.description,
      ).toBe('Updated fixture');
      expect((await eventHighlightService.list()).some(h => h.id === highlightId)).toBe(true);
      expect(await eventHighlightService.remove(highlightId)).toBe(true);
      expect((await getTournamentMap()).highlights.some(h => h.id === highlightId)).toBe(false);
    } finally {
      if (highlightId) await eventHighlightService.remove(highlightId);
      await db.delete(tournament).where(inArray(tournament.id, ids));
      if (metaIds.length) await db.delete(meta).where(inArray(meta.id, metaIds));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);
