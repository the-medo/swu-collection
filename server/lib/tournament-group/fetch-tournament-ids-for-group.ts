import { db } from '../../db';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import { eq } from 'drizzle-orm';

/**
 * Fetches tournament IDs for a tournament group
 * @param groupId - ID of the tournament group
 * @returns Array of tournament IDs
 */
export async function fetchTournamentIdsForGroup(groupId: string): Promise<string[]> {
  const result = await db
    .select({ tournamentId: tournamentGroupTournament.tournamentId })
    .from(tournamentGroupTournament)
    .where(eq(tournamentGroupTournament.groupId, groupId));

  return result.map(r => r.tournamentId);
}
