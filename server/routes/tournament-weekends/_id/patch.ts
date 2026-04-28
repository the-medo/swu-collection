import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { tournamentWeekend } from '../../../db/schema/tournament_weekend.ts';
import {
  isSaturdayDateString,
  syncTournamentWeekendTournaments,
  zSaturdayDateMessage,
} from '../../../lib/live-tournaments/tournamentWeekendMaintenance.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { createLiveWeekendReplacePatchEvent } from '../../../lib/live-tournaments/liveTournamentHomeCache.ts';

const zTournamentWeekendUpdateRequest = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    date: z.string().refine(isSaturdayDateString, zSaturdayDateMessage).optional(),
    isLive: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

export const tournamentWeekendIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTournamentWeekendUpdateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');

    const existing = (
      await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId)).limit(1)
    )[0];

    if (!existing) {
      return c.json({ message: 'Tournament weekend not found' }, 404);
    }

    const [updatedWeekend] = await db.transaction(async tx => {
      if (data.isLive === true) {
        await tx
          .update(tournamentWeekend)
          .set({ isLive: false, updatedAt: sql`NOW()` })
          .where(eq(tournamentWeekend.isLive, true));
      }

      return tx
        .update(tournamentWeekend)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.date !== undefined ? { date: data.date } : {}),
          ...(data.isLive !== undefined ? { isLive: data.isLive } : {}),
          updatedAt: sql`NOW()`,
        })
        .where(eq(tournamentWeekend.id, weekendId))
        .returning();
    });

    const syncResult =
      data.date !== undefined
        ? await syncTournamentWeekendTournaments(weekendId, data.date)
        : undefined;
    const refreshedWeekend = (
      await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId)).limit(1)
    )[0];

    await createLiveWeekendReplacePatchEvent(weekendId);

    return c.json({
      data: {
        weekend: refreshedWeekend ?? updatedWeekend,
        sync: syncResult,
      },
    });
  },
);
