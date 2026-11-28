import { expect, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meta } from '../../db/schema/meta.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentGroup } from '../../db/schema/tournament_group.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
  tournamentWeekendTournamentGroup,
} from '../../db/schema/tournament_weekend.ts';
import { createPQMetaReassignmentService } from './pqMetaReassignment.ts';

test.skipIf(process.env.PQ_REASSIGN_DB_TEST !== '1')(
  'atomic reassignment, stale/mixed previews, concurrent applies, preserved identities, and post-commit failures',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const userId = `pq-reassign-${crypto.randomUUID()}`;
    const tournamentIds = Array.from({ length: 5 }, () => crypto.randomUUID());
    const groupIds = Array.from({ length: 4 }, () => crypto.randomUUID());
    const weekendId = crypto.randomUUID();
    const collisionGroupId = crypto.randomUUID();
    const metaIds: number[] = [];
    const recomputed: number[] = [];
    const refreshed: string[] = [];
    const service = createPQMetaReassignmentService(db, {
      recomputeMeta: async id => {
        // Effects see the committed state, never a partial reassignment.
        expect(
          (await db.select().from(tournament).where(eq(tournament.id, tournamentIds[0]!)))[0]!.meta,
        ).toBe(metaIds[1]);
        recomputed.push(id);
        if (id === metaIds[0]) throw new Error('Fixture statistics failure');
      },
      refreshWeekend: async id => {
        refreshed.push(id);
      },
    });
    try {
      await db.insert(user).values({
        id: userId,
        name: 'PQ fixture',
        displayName: userId,
        email: `${userId}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      for (const [name, format] of [
        ['Old Premier', 1],
        ['New Premier', 1],
        ['Old Eternal', 6],
        ['New Eternal', 6],
        ['Sealed', 3],
      ] as const) {
        const [row] = await db
          .insert(meta)
          .values({ name, format, set: 'ic27', season: 999, date: '2090-01-07' })
          .returning();
        metaIds.push(row!.id);
      }
      for (const [i, id] of tournamentIds.entries())
        await db.insert(tournament).values({
          id,
          userId,
          type: i === 4 ? 'sq' : 'pq',
          name: `PQ fixture ${i}`,
          location: 'FR',
          continent: 'Europe',
          attendance: 0,
          format: i === 1 ? 6 : i === 2 ? 3 : 1,
          meta: i === 1 ? metaIds[2] : i === 2 ? metaIds[4] : metaIds[0],
          date: new Date(i === 3 ? '2090-01-06' : '2090-01-07'),
          days: 1,
          imported: i === 0,
          updatedAt: sql`'2020-01-01'::timestamp`,
        });
      for (const [i, id] of groupIds.entries()) {
        await db.insert(tournamentGroup).values({
          id,
          name: i === 3 ? 'Featured fixture' : 'PQ Week 4',
          metaId: i === 1 ? metaIds[2] : i === 2 ? metaIds[4] : metaIds[0],
          position: 40,
          visible: i === 1,
        });
        await db
          .insert(tournamentGroupTournament)
          .values({ groupId: id, tournamentId: tournamentIds[i === 3 ? 0 : i]!, position: 10 });
      }
      await db
        .insert(tournamentWeekend)
        .values({ id: weekendId, name: 'PQ fixture weekend', date: '2090-01-07' });
      for (const i of [0, 1, 2]) {
        await db.insert(tournamentWeekendTournamentGroup).values({
          tournamentWeekendId: weekendId,
          tournamentGroupId: groupIds[i]!,
          formatId: i === 1 ? 6 : i === 2 ? 3 : 1,
          metaId: i === 1 ? metaIds[2] : i === 2 ? metaIds[4] : metaIds[0],
        });
        await db
          .insert(tournamentWeekendTournament)
          .values({ tournamentWeekendId: weekendId, tournamentId: tournamentIds[i]! });
      }
      const request = {
        fromDate: '2090-01-07',
        targets: [
          { formatId: 1 as const, metaId: metaIds[1]! },
          { formatId: 6 as const, metaId: metaIds[3]! },
        ],
      };
      const before = await service.preview(request);
      expect(before.tournaments.map(t => t.id).sort()).toEqual(tournamentIds.slice(0, 2).sort());
      expect(before.groups).toHaveLength(2);
      expect(before.weekendGroups).toHaveLength(2);
      expect(recomputed).toEqual([]);
      expect(
        (await db.select().from(tournament).where(eq(tournament.id, tournamentIds[0]!)))[0]!.meta,
      ).toBe(metaIds[0]);

      await db
        .insert(tournamentGroupTournament)
        .values({ groupId: groupIds[0]!, tournamentId: tournamentIds[3]! });
      await expect(
        service.apply({ ...request, previewToken: before.previewToken }),
      ).rejects.toThrow('Preview again');
      const mixed = await service.preview(request);
      expect(mixed.conflicts).toHaveLength(1);
      await expect(service.apply({ ...request, previewToken: mixed.previewToken })).rejects.toThrow(
        'conflicting',
      );
      // No earlier write escaped the rejected operation.
      expect(
        (await db.select().from(tournament).where(eq(tournament.id, tournamentIds[1]!)))[0]!.meta,
      ).toBe(metaIds[2]);
      await db
        .delete(tournamentGroupTournament)
        .where(eq(tournamentGroupTournament.tournamentId, tournamentIds[3]!));

      const beforeCollision = await service.preview(request);
      await db
        .insert(tournamentGroup)
        .values({ id: collisionGroupId, name: 'PQ Week 4', metaId: metaIds[1] });
      await expect(
        service.apply({ ...request, previewToken: beforeCollision.previewToken }),
      ).rejects.toThrow('Preview again');
      const collision = await service.preview(request);
      expect(collision.conflicts).toHaveLength(1);
      await expect(
        service.apply({ ...request, previewToken: collision.previewToken }),
      ).rejects.toThrow('conflicting');
      await db.delete(tournamentGroup).where(eq(tournamentGroup.id, collisionGroupId));
      const preview = await service.preview(request);
      const attempts = await Promise.allSettled([
        service.apply({ ...request, previewToken: preview.previewToken }),
        service.apply({ ...request, previewToken: preview.previewToken }),
      ]);
      expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(1);
      const rejected = attempts.find(a => a.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason.status).toBe(409);
      const result = (
        attempts.find(a => a.status === 'fulfilled') as PromiseFulfilledResult<
          Awaited<ReturnType<typeof service.apply>>
        >
      ).value;
      expect(result).toMatchObject({ groupCount: 2, weekendGroupCount: 2 });
      expect(result.warnings).toHaveLength(1);
      expect(recomputed.sort()).toEqual([metaIds[0]!, metaIds[1]!].sort());
      expect(refreshed).toEqual([weekendId]);
      const ts = await db.select().from(tournament).where(inArray(tournament.id, tournamentIds));
      expect(ts.find(t => t.id === tournamentIds[0])!.meta).toBe(metaIds[1]);
      expect(ts.find(t => t.id === tournamentIds[1])!.meta).toBe(metaIds[3]);
      for (const i of [2, 3, 4]) {
        expect(ts.find(t => t.id === tournamentIds[i])!.meta).toBe(
          i === 2 ? metaIds[4] : metaIds[0],
        );
        expect(ts.find(t => t.id === tournamentIds[i])!.updatedAt.toISOString()).toBe(
          '2020-01-01T00:00:00.000Z',
        );
      }
      expect(ts.find(t => t.id === tournamentIds[0])!.updatedAt.getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime(),
      );
      const gs = await db
        .select()
        .from(tournamentGroup)
        .where(inArray(tournamentGroup.id, groupIds));
      expect(gs.find(g => g.id === groupIds[0])).toMatchObject({
        name: 'PQ Week 4',
        position: 40,
        metaId: metaIds[1],
        visible: false,
      });
      expect(gs.find(g => g.id === groupIds[1])).toMatchObject({
        name: 'PQ Week 4',
        metaId: metaIds[3],
        visible: true,
      });
      expect(gs.find(g => g.id === groupIds[2])!.metaId).toBe(metaIds[4]);
      expect(gs.find(g => g.id === groupIds[3])!.metaId).toBe(metaIds[0]);
      expect(
        await db
          .select()
          .from(tournamentGroupTournament)
          .where(inArray(tournamentGroupTournament.groupId, groupIds)),
      ).toHaveLength(4);
      const links = await db
        .select()
        .from(tournamentWeekendTournamentGroup)
        .where(eq(tournamentWeekendTournamentGroup.tournamentWeekendId, weekendId));
      expect(links.find(l => l.tournamentGroupId === groupIds[0])!.metaId).toBe(metaIds[1]);
      expect(links.find(l => l.tournamentGroupId === groupIds[2])!.metaId).toBe(metaIds[4]);
      const noOp = await service.preview(request);
      expect(noOp.tournaments.length + noOp.groups.length + noOp.weekendGroups.length).toBe(0);
      expect(
        (await service.apply({ ...request, previewToken: noOp.previewToken })).tournamentIds,
      ).toEqual([]);
      expect(refreshed).toHaveLength(1);
    } finally {
      await db.delete(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId));
      await db
        .delete(tournamentGroup)
        .where(inArray(tournamentGroup.id, [...groupIds, collisionGroupId]));
      await db.delete(tournament).where(inArray(tournament.id, tournamentIds));
      if (metaIds.length) await db.delete(meta).where(inArray(meta.id, metaIds));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);
