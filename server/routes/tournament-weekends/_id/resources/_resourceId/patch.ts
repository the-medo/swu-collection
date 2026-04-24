import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { db } from '../../../../../db';
import { tournament as tournamentTable } from '../../../../../db/schema/tournament.ts';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../../db/schema/tournament_weekend.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { extractMeleeTournamentId } from '../../../../../lib/live-tournaments/resourceUrls.ts';

const zTournamentWeekendResourceUpdateRequest = z.object({
  approved: z.boolean(),
});

export const tournamentWeekendIdResourcesResourceIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTournamentWeekendResourceUpdateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const resourceId = z.guid().parse(c.req.param('resourceId'));
    const { approved } = c.req.valid('json');

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

    if (approved && existingResource.resource.resourceType === 'melee') {
      if (!meleeTournamentId) {
        return c.json({ message: 'Stored Melee resource URL is invalid' }, 400);
      }

      if (
        existingResource.tournament.meleeId &&
        existingResource.tournament.meleeId !== meleeTournamentId
      ) {
        return c.json(
          {
            message: `Tournament already has a different Melee ID (${existingResource.tournament.meleeId})`,
          },
          409,
        );
      }
    }

    const resource = await db.transaction(async tx => {
      if (existingResource.resource.resourceType === 'melee' && meleeTournamentId) {
        if (approved) {
          await tx
            .update(tournamentTable)
            .set({
              meleeId: meleeTournamentId,
              updatedAt: sql`NOW()`,
            })
            .where(eq(tournamentTable.id, existingResource.tournament.id));
        } else if (existingResource.tournament.meleeId === meleeTournamentId) {
          await tx
            .update(tournamentTable)
            .set({
              meleeId: null,
              updatedAt: sql`NOW()`,
            })
            .where(eq(tournamentTable.id, existingResource.tournament.id));
        }
      }

      return (
        await tx
          .update(tournamentWeekendResource)
          .set({
            approved,
            updatedAt: sql`NOW()`,
          })
          .where(eq(tournamentWeekendResource.id, resourceId))
          .returning()
      )[0];
    });

    return c.json({ data: resource });
  },
);
