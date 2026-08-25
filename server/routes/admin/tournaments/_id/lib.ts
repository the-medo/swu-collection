import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../../db';
import { tournament } from '../../../../db/schema/tournament.ts';
import {
  computeAndSaveMetaStatistics,
  computeAndSaveTournamentStatistics,
} from '../../../../lib/card-statistics';
import { updateTournamentGroupsStatisticsForTournament } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

export const zTournamentIdParams = z.object({
  tournamentId: z.uuid(),
});

export const zTournamentStandingParams = zTournamentIdParams.extend({
  deckId: z.uuid(),
});

export const zTournamentStandingUpdateBody = z
  .object({
    placement: z.number().int().min(1).nullable(),
    recordWin: z.number().int().min(0),
    recordLose: z.number().int().min(0),
    recordDraw: z.number().int().min(0),
    points: z.number().int().min(0),
  })
  .strict();

export type TournamentStandingUpdate = z.infer<typeof zTournamentStandingUpdateBody>;

export async function getAdminTournament(tournamentId: string) {
  return (
    await db
      .select({
        id: tournament.id,
        meta: tournament.meta,
      })
      .from(tournament)
      .where(eq(tournament.id, tournamentId))
  )[0];
}

export async function refreshTournamentResultsDerivedData(
  tournamentId: string,
  metaId: number | null,
): Promise<string[]> {
  const warnings: string[] = [];
  let tournamentStatisticsRefreshed = false;

  try {
    await computeAndSaveTournamentStatistics(tournamentId);
    tournamentStatisticsRefreshed = true;
  } catch (error) {
    console.error(`Failed to refresh tournament statistics for ${tournamentId}:`, error);
    warnings.push('Tournament card statistics could not be refreshed.');
  }

  if (metaId && tournamentStatisticsRefreshed) {
    try {
      await computeAndSaveMetaStatistics(metaId);
    } catch (error) {
      console.error(`Failed to refresh meta statistics for tournament ${tournamentId}:`, error);
      warnings.push('Meta card statistics could not be refreshed.');
    }
  } else if (metaId) {
    warnings.push('Meta card statistics were not refreshed because tournament statistics failed.');
  }

  try {
    await updateTournamentGroupsStatisticsForTournament(tournamentId);
  } catch (error) {
    console.error(`Failed to refresh tournament group statistics for ${tournamentId}:`, error);
    warnings.push('Tournament group statistics could not be refreshed.');
  }

  return warnings;
}
