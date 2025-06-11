import { db } from '../../db';
import { tournamentGroupStats } from '../../db/schema/tournament_group_stats.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { eq, sql, sum, count } from 'drizzle-orm';

/**
 * Type for tournament group stats result
 */
export interface TournamentGroupStatsResult {
  tournamentGroupId: string;
  importedTournaments: number;
  totalTournaments: number;
  attendance: number;
}

/**
 * Computes tournament group stats
 * @param groupId - ID of the tournament group
 * @returns Tournament group stats result
 */
async function computeTournamentGroupStats(groupId: string): Promise<TournamentGroupStatsResult> {
  // Get stats by joining tournaments to tournament_group_tournament
  const result = await db
    .select({
      totalTournaments: count(tournament.id),
      importedTournaments: count(sql`CASE WHEN ${tournament.imported} = true THEN 1 END`).mapWith(
        Number,
      ),
      attendance: sum(tournament.attendance).mapWith(Number),
    })
    .from(tournamentGroupTournament)
    .innerJoin(tournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(eq(tournamentGroupTournament.groupId, groupId))
    .groupBy(tournamentGroupTournament.groupId);

  // If no tournaments found, return default values
  if (result.length === 0) {
    return {
      tournamentGroupId: groupId,
      importedTournaments: 0,
      totalTournaments: 0,
      attendance: 0,
    };
  }

  // Return the stats
  return {
    tournamentGroupId: groupId,
    importedTournaments: result[0].importedTournaments,
    totalTournaments: result[0].totalTournaments,
    attendance: result[0].attendance || 0, // Handle null attendance
  };
}

/**
 * Saves tournament group stats to the database
 * @param stats - Tournament group stats result
 */
async function saveTournamentGroupStats(stats: TournamentGroupStatsResult): Promise<void> {
  // Begin transaction
  await db.transaction(async tx => {
    // Delete existing stats for this group
    await tx
      .delete(tournamentGroupStats)
      .where(eq(tournamentGroupStats.tournamentGroupId, stats.tournamentGroupId));

    // Insert new stats
    await tx.insert(tournamentGroupStats).values({
      tournamentGroupId: stats.tournamentGroupId,
      importedTournaments: stats.importedTournaments,
      totalTournaments: stats.totalTournaments,
      attendance: stats.attendance,
    });
  });
}

/**
 * Computes and saves tournament group stats
 * @param groupId - ID of the tournament group
 * @returns Tournament group stats result
 */
export async function computeAndSaveTournamentGroupStats(
  groupId: string,
): Promise<TournamentGroupStatsResult> {
  // Compute stats
  const stats = await computeTournamentGroupStats(groupId);

  // Save stats to database
  await saveTournamentGroupStats(stats);

  return stats;
}

/**
 * Computes tournament group stats without saving to database
 * @param groupId - ID of the tournament group
 * @returns Tournament group stats result
 */
export async function computeTournamentGroupStatsOnly(
  groupId: string,
): Promise<TournamentGroupStatsResult> {
  return computeTournamentGroupStats(groupId);
}
