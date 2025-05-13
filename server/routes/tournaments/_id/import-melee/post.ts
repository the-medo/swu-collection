import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentImportMeleeRequest } from '../../../../../types/ZTournament.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { db } from '../../../../db';
import { runTournamentImport } from '../../../../lib/imports/tournamentImportWorkflow.ts';
import { computeAndSaveTournamentStatistics, computeAndSaveMetaStatistics } from '../../../../lib/card-statistics';

export const tournamentIdImportMeleePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentImportMeleeRequest),
  async c => {
    const paramTournamentId = z.string().uuid().parse(c.req.param('id'));
    const { meleeId } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournament: ['import'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to import this deck.",
        },
        403,
      );
    }

    const condIsOwner = eq(tournamentTable.userId, user.id);
    const condTournamentId = eq(tournamentTable.id, paramTournamentId);

    // Check if the tournament exists and the user is the owner
    const tournament = (
      await db.select().from(tournamentTable).where(and(condIsOwner, condTournamentId))
    )[0];

    if (!tournament) {
      return c.json(
        {
          message: "Tournament doesn't exist or you don't have permission to update it",
        },
        404,
      );
    }

    // Update the tournament with the meleeId
    await db.update(tournamentTable).set({ meleeId }).where(and(condIsOwner, condTournamentId));

    runTournamentImport(paramTournamentId).then(async () => {
      // Update tournament to set imported flag to true
      await db
        .update(tournamentTable)
        .set({ imported: true })
        .where(and(condIsOwner, condTournamentId));

      // Compute tournament card statistics
      await computeAndSaveTournamentStatistics(paramTournamentId);

      // If tournament has a meta, compute meta card statistics
      if (tournament.meta) {
        await computeAndSaveMetaStatistics(tournament.meta);
      }
    });

    // Mock response - in a real implementation, this would fetch data from melee.gg
    // and process it to insert decks and matches
    return c.json({
      success: true,
      message: 'Import from melee.gg initiated. The tournament data will be processed.',
      data: {
        tournamentId: paramTournamentId,
        meleeId,
        status: 'processing',
      },
    });
  },
);
