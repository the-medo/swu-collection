import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { meta as metaTable } from '../../../../db/schema/meta.ts';
import { tournamentGroup as tournamentGroupTable } from '../../../../db/schema/tournament_group.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournamentGroup,
} from '../../../../db/schema/tournament_weekend.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { createLiveMetaGroupsPatchEvent } from '../../../../lib/live-tournaments/liveTournamentHomeCache.ts';

const zTournamentWeekendGroupCreateRequest = z.object({
  tournamentGroupId: z.guid(),
  formatId: z.number().int().positive().nullable().optional(),
  metaId: z.number().int().positive().nullable().optional(),
});

export const tournamentWeekendIdTournamentGroupsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentWeekendGroupCreateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');

    const [weekend] = await db
      .select({ id: tournamentWeekend.id })
      .from(tournamentWeekend)
      .where(eq(tournamentWeekend.id, weekendId))
      .limit(1);

    if (!weekend) {
      return c.json({ message: 'Tournament weekend not found' }, 404);
    }

    const [group] = await db
      .select({
        tournamentGroup: tournamentGroupTable,
        meta: metaTable,
      })
      .from(tournamentGroupTable)
      .leftJoin(metaTable, eq(tournamentGroupTable.metaId, metaTable.id))
      .where(eq(tournamentGroupTable.id, data.tournamentGroupId))
      .limit(1);

    if (!group) {
      return c.json({ message: 'Tournament group not found' }, 404);
    }

    const metaId = data.metaId ?? group.tournamentGroup.metaId ?? null;
    const formatId = data.formatId ?? group.meta?.format ?? null;

    const [weekendGroup] = await db
      .insert(tournamentWeekendTournamentGroup)
      .values({
        tournamentWeekendId: weekendId,
        tournamentGroupId: data.tournamentGroupId,
        formatId,
        metaId,
      })
      .onConflictDoUpdate({
        target: [
          tournamentWeekendTournamentGroup.tournamentWeekendId,
          tournamentWeekendTournamentGroup.tournamentGroupId,
        ],
        set: {
          formatId,
          metaId,
        },
      })
      .returning();

    await db
      .update(tournamentWeekend)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(tournamentWeekend.id, weekendId));

    await createLiveMetaGroupsPatchEvent(weekendId);

    return c.json({ data: weekendGroup }, 201);
  },
);
