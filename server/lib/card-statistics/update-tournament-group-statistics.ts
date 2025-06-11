import { db } from '../../db';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import { eq } from 'drizzle-orm';
import { computeAndSaveTournamentGroupStatistics } from './tournament-group-statistics.ts';
import { computeAndSaveTournamentGroupStats } from '../tournament-group/tournament-group-stats.ts';
import { computeAndSaveTournamentGroupLeaderBase } from '../tournament-group/tournament-group-leader-base.ts';

/**
 * Updates card statistics for a tournament group
 * @param groupId - ID of the tournament group
 */
export async function updateTournamentGroupStatistics(groupId: string): Promise<void> {
  // Compute and save tournament group statistics
  await computeAndSaveTournamentGroupStatistics(groupId);
  await computeAndSaveTournamentGroupStats(groupId);
  await computeAndSaveTournamentGroupLeaderBase(groupId);
}

/**
 * Updates card statistics for all tournament groups that contain a specific tournament
 * @param tournamentId - ID of the tournament
 */
export async function updateTournamentGroupsStatisticsForTournament(
  tournamentId: string,
): Promise<void> {
  // Find all groups that contain this tournament
  const groups = await db
    .select({ groupId: tournamentGroupTournament.groupId })
    .from(tournamentGroupTournament)
    .where(eq(tournamentGroupTournament.tournamentId, tournamentId));

  // Update statistics for each group
  for (const group of groups) {
    await updateTournamentGroupStatistics(group.groupId);
  }
}

/**
 * Updates card statistics for all tournament groups
 */
export async function updateAllTournamentGroupsStatistics(): Promise<void> {
  // Find all tournament groups
  const groups = await db
    .select({ groupId: tournamentGroupTournament.groupId })
    .from(tournamentGroupTournament);

  // Update statistics for each group
  for (const group of groups) {
    await updateTournamentGroupStatistics(group.groupId);
  }
}
