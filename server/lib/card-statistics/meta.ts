import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { eq } from 'drizzle-orm';

/**
 * Fetches tournament IDs for a given meta
 * @param metaId - ID of the meta
 * @returns Array of tournament IDs
 */
export async function fetchTournamentIdsForMeta(metaId: number): Promise<string[]> {
  const tournaments = await db
    .select({ id: tournament.id })
    .from(tournament)
    .where(eq(tournament.meta, metaId));

  return tournaments.map(t => t.id);
}
