import { db } from '../../../db';
import {
  cardStatMatchupDecks,
  cardStatMatchupTournaments,
} from '../../../db/schema/card_stat_matchup_schema.ts';
import { and, eq, or } from 'drizzle-orm';
import { tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck } from '../../../db/schema/deck.ts';
import { deckInformation } from '../../../db/schema/deck_information.ts';
import { baseSpecialNames } from '../../../../shared/lib/basicBases.ts';
import { batchArray } from '../../utils/batch.ts';

/**
 * Compute and store deck IDs for a card stat matchup
 * @param overviewId - The ID of the overview record
 * @param leaderId - The ID of the leader card (optional)
 * @param baseId - The ID of the base card (optional)
 * @returns Array of deck IDs
 */
export async function computeCardStatMatchupDecks(
  overviewId: string,
  leaderId?: string,
  baseId?: string,
): Promise<string[]> {
  // Check if baseId corresponds to a special base name
  const baseSpecialName = baseId ? baseSpecialNames[baseId] : undefined;

  // Build the base query with all necessary joins
  let query = db
    .select({
      deckId: deck.id,
    })
    .from(tournamentDeck)
    .innerJoin(deck, eq(tournamentDeck.deckId, deck.id))
    .innerJoin(
      cardStatMatchupTournaments,
      and(
        eq(cardStatMatchupTournaments.id, overviewId),
        eq(cardStatMatchupTournaments.tournamentId, tournamentDeck.tournamentId),
      ),
    )
    .$dynamic();

  // Add additional joins and conditions based on whether there's a special base name
  if (baseSpecialName) {
    // Case with special base name - join with deck_information
    query = query.innerJoin(deckInformation, eq(deck.id, deckInformation.deckId)).where(
      and(
        // Leader condition (if leaderId is provided)
        leaderId ? eq(deck.leaderCardId1, leaderId) : undefined,
        // Special base name condition
        eq(deckInformation.baseSpecialName, baseSpecialName),
      ),
    );
  } else {
    // Case without special base name - standard conditions
    query = query.where(
      and(
        // Leader condition (if leaderId is provided)
        leaderId ? eq(deck.leaderCardId1, leaderId) : undefined,
        // Base condition (if baseId is provided)
        baseId ? eq(deck.baseCardId, baseId) : undefined,
      ),
    );
  }

  // Execute the query
  const decks = await query;
  const deckIds = decks.map(d => d.deckId);

  // Insert deck IDs into the decks table
  if (deckIds.length > 0) {
    // Create an array of objects to insert
    const values = deckIds.map(deckId => ({
      id: overviewId,
      deckId,
    }));

    // Use batch inserts for better performance
    const BATCH_SIZE = 5000; // Adjust based on your database's capabilities
    const batches = batchArray(values, BATCH_SIZE);

    await db.transaction(async tx => {
      for (const batch of batches) {
        await tx.insert(cardStatMatchupDecks).values(batch);
      }
    });
  }

  return deckIds;
}
