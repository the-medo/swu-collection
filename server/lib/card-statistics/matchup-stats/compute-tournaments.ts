import { db } from '../../../db';
import { cardStatMatchupTournaments } from '../../../db/schema/card_stat_matchup_schema.ts';
import { eq } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { batchArray } from '../../utils/batch.ts';

/**
 * Compute and store tournament IDs for a card stat matchup
 * @param id - The ID of the overview record
 * @param params - The matchup parameters
 * @returns Array of tournament IDs
 */
export async function computeCardStatMatchupTournaments(
  id: string,
  params: {
    meta_id?: number;
    tournament_id?: string;
    tournament_group_id?: string;
  }
): Promise<string[]> {
  const { meta_id, tournament_id, tournament_group_id } = params;
  let tournamentIds: string[] = [];

  if (tournament_id) {
    // If a specific tournament is requested, use that
    tournamentIds = [tournament_id];
  } else if (tournament_group_id) {
    // If a tournament group is requested, fetch all tournaments in that group
    const tournaments = await db
      .select({
        tournamentId: tournamentGroupTournament.tournamentId,
      })
      .from(tournamentGroupTournament)
      .where(eq(tournamentGroupTournament.groupId, tournament_group_id));

    tournamentIds = tournaments.map(t => t.tournamentId);
  } else if (meta_id) {
    // If a meta is requested, fetch all tournaments in that meta
    const tournaments = await db
      .select({
        id: tournament.id,
      })
      .from(tournament)
      .where(eq(tournament.meta, meta_id));

    tournamentIds = tournaments.map(t => t.id);
  }

  // Insert tournament IDs into the tournaments table
  if (tournamentIds.length > 0) {
    // Create an array of objects to insert
    const values = tournamentIds.map(tournamentId => ({
      id,
      tournamentId,
    }));

    // Use batch inserts for better performance
    const BATCH_SIZE = 5000; // Adjust based on your database's capabilities
    const batches = batchArray(values, BATCH_SIZE);

    await db.transaction(async tx => {
      for (const batch of batches) {
        await tx.insert(cardStatMatchupTournaments).values(batch);
      }
    });
  }

  return tournamentIds;
}
