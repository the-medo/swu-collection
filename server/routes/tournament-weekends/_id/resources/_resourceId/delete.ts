import { Hono } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { tournament as tournamentTable } from '../../../../../db/schema/tournament.ts';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../../db/schema/tournament_weekend.ts';
import { extractMeleeTournamentId } from '../../../../../lib/live-tournaments/resourceUrls.ts';

export const tournamentWeekendIdResourcesResourceIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const resourceId = z.guid().parse(c.req.param('resourceId'));

    const existingResource = (
      await db
        .select({
          resource: tournamentWeekendResource,
          tournament: tournamentTable,
        })
        .from(tournamentWeekendResource)
        .innerJoin(
          tournamentWeekendTournament,
          eq(tournamentWeekendResource.tournamentId, tournamentWeekendTournament.tournamentId),
        )
        .innerJoin(tournamentTable, eq(tournamentWeekendResource.tournamentId, tournamentTable.id))
        .where(
          and(
            eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
            eq(tournamentWeekendResource.id, resourceId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingResource) {
      return c.json({ message: 'Tournament weekend resource not found' }, 404);
    }

    const meleeTournamentId =
      existingResource.resource.resourceType === 'melee'
        ? extractMeleeTournamentId(existingResource.resource.resourceUrl)
        : null;

    await db.transaction(async tx => {
      if (
        existingResource.resource.approved &&
        meleeTournamentId &&
        existingResource.tournament.meleeId === meleeTournamentId
      ) {
        await tx
          .update(tournamentTable)
          .set({
            meleeId: null,
            updatedAt: sql`NOW()`,
          })
          .where(eq(tournamentTable.id, existingResource.tournament.id));
      }

      await tx.delete(tournamentWeekendResource).where(eq(tournamentWeekendResource.id, resourceId));
    });

    return c.body(null, 204);
  },
);
