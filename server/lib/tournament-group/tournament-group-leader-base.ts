import { db } from '../../db';
import { tournamentGroupLeaderBase } from '../../db/schema/tournament_group_leader_base.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { and, eq, isNull, not, sql } from 'drizzle-orm';
import { batchArray } from '../utils/batch.ts';
import { fetchTournamentIdsForGroup } from './fetch-tournament-ids-for-group.ts';

/**
 * Type for tournament group leader base result
 */
export interface TournamentGroupLeaderBaseResult {
  tournamentGroupId: string;
  leaderCardId: string;
  baseCardId: string;
  winner: number;
  top8: number;
  total: number;
}

/**
 * Computes tournament group leader base statistics
 * @param groupId - ID of the tournament group
 * @returns Tournament group leader base statistics
 */
async function computeTournamentGroupLeaderBase(
  groupId: string,
): Promise<TournamentGroupLeaderBaseResult[]> {
  // Get tournament IDs for the group
  const tournamentIds = await fetchTournamentIdsForGroup(groupId);

  // If no tournaments, return empty array
  if (tournamentIds.length === 0) {
    return [];
  }

  // Get all decks of the tournament group
  const decks = await db
    .select({
      tournamentId: tournamentDeck.tournamentId,
      deckId: tournamentDeck.deckId,
      placement: tournamentDeck.placement,
      leaderCardId: deck.leaderCardId1,
      baseCardId: deck.baseCardId,
    })
    .from(tournamentDeck)
    .innerJoin(deck, eq(tournamentDeck.deckId, deck.id))
    .where(
      and(
        sql`${tournamentDeck.tournamentId} IN ${tournamentIds}`,
        not(isNull(deck.leaderCardId1)),
        not(isNull(deck.baseCardId)),
      ),
    );

  // Initialize stats object
  const stats: Record<string, TournamentGroupLeaderBaseResult> = {};

  // Process each deck
  for (const d of decks) {
    const leaderCardId = d.leaderCardId!;
    const baseCardId = d.baseCardId!;
    const key = `${leaderCardId}:${baseCardId}`;

    // Initialize stats for this leader-base combination if not exists
    if (!stats[key]) {
      stats[key] = {
        tournamentGroupId: groupId,
        leaderCardId,
        baseCardId,
        winner: 0,
        top8: 0,
        total: 0,
      };
    }

    // Increment total count
    stats[key].total++;

    // Check if winner (placement === 1)
    if (d.placement === 1) {
      stats[key].winner++;
    }

    // Check if in top 8 (placement <= 8)
    if (d.placement !== null && d.placement <= 8) {
      stats[key].top8++;
    }
  }

  // Convert stats object to array
  return Object.values(stats);
}

/**
 * Saves tournament group leader base statistics to the database
 * @param stats - Tournament group leader base statistics
 * @param groupId
 */
async function saveTournamentGroupLeaderBase(
  stats: TournamentGroupLeaderBaseResult[],
  groupId: string,
): Promise<void> {
  // If no stats, return
  if (stats.length === 0) {
    return;
  }

  const BATCH_SIZE = 5000; // Adjust based on database capabilities

  // Begin transaction
  await db.transaction(async tx => {
    // Delete existing stats for this group
    await tx
      .delete(tournamentGroupLeaderBase)
      .where(eq(tournamentGroupLeaderBase.tournamentGroupId, groupId));

    // Insert new stats in batches
    const batches = batchArray(stats, BATCH_SIZE);
    for (const batch of batches) {
      await tx.insert(tournamentGroupLeaderBase).values(batch);
    }
  });
}

/**
 * Computes and saves tournament group leader base statistics
 * @param groupId - ID of the tournament group
 * @returns Tournament group leader base statistics
 */
export async function computeAndSaveTournamentGroupLeaderBase(
  groupId: string,
): Promise<TournamentGroupLeaderBaseResult[]> {
  // Compute statistics
  const stats = await computeTournamentGroupLeaderBase(groupId);

  // Save statistics to database
  await saveTournamentGroupLeaderBase(stats, groupId);

  return stats;
}

/**
 * Computes tournament group leader base statistics without saving to database
 * @param groupId - ID of the tournament group
 * @returns Tournament group leader base statistics
 */
export async function computeTournamentGroupLeaderBaseOnly(
  groupId: string,
): Promise<TournamentGroupLeaderBaseResult[]> {
  return computeTournamentGroupLeaderBase(groupId);
}
