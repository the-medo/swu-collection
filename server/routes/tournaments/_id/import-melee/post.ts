import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentImportMeleeRequest } from '../../../../../types/ZTournament.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { db } from '../../../../db';
import { runTournamentImport } from '../../../../lib/imports/tournamentImportWorkflow.ts';
import {
  computeAndSaveTournamentStatistics,
  computeAndSaveMetaStatistics,
} from '../../../../lib/card-statistics';
import { updateTournamentGroupsStatisticsForTournament } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';
import { generateDeckThumbnails } from '../../../../lib/decks/generateDeckThumbnail.ts';

export const tournamentIdImportMeleePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentImportMeleeRequest),
  async c => {
    const paramTournamentId = z.guid().parse(c.req.param('id'));
    const { meleeId, forcedRoundId, markAsImported, minRound, maxRound } = c.req.valid('json');
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

    const generateThumbnails = !minRound && !maxRound;

    runTournamentImport(paramTournamentId, forcedRoundId, minRound, maxRound).then(async () => {
      if (markAsImported) {
        // Update tournament to set imported flag to true
        await db
          .update(tournamentTable)
          .set({ imported: true, updatedAt: sql`NOW()` })
          .where(and(condIsOwner, condTournamentId));

        // Compute tournament card statistics
        await computeAndSaveTournamentStatistics(paramTournamentId);

        // If tournament has a meta, compute meta card statistics
        if (tournament.meta) {
          await computeAndSaveMetaStatistics(tournament.meta);
        }

        // Update tournament group statistics for all groups that contain this tournament
        try {
          await updateTournamentGroupsStatisticsForTournament(paramTournamentId);
        } catch (error) {
          console.error('Error updating tournament group statistics:', error);
          // Continue with the response even if statistics update fails
        }
      }

      if (generateThumbnails) {
        // Generate thumbnails for all unique leader/base combinations in the tournament
        console.log(`Generating thumbnails for tournament: ${paramTournamentId}`);
        const { results, errors } = await generateDeckThumbnails({
          tournament_id: paramTournamentId,
          force: false, // Don't force regeneration of existing thumbnails
        });
        console.log(
          `Generated ${results.length} thumbnails for tournament: ${paramTournamentId}. ${errors.length} errors.`,
        );
      } else {
        console.log('Generation of thumbnails skipped.');
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
        minRound,
        maxRound,
        status: 'processing',
      },
    });
  },
);
