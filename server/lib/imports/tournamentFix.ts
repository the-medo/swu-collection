import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import {
  fetchRoundStandings,
  fetchTournamentView,
  parseStandingsToTournamentDeck2,
} from './tournamentImportLib.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch, type TournamentMatchInsert } from '../../db/schema/tournament_match.ts';

export async function runTournamentFix(tournamentId: string) {
  const t = (await db.select().from(tournament).where(eq(tournament.id, tournamentId)))[0];

  const meleeTournamentId = t.meleeId;
  console.log('Melee tournament id: ', meleeTournamentId);
  if (!meleeTournamentId) throw new Error('Melee tournament ID is empty');

  const roundId = await fetchTournamentView(meleeTournamentId);
  console.log('Round id: ', roundId);
  if (!roundId) throw new Error('Round ID is empty');

  const roundStandings = await fetchRoundStandings(roundId);
  console.log('Standing count: ', roundStandings.length);

  let tournamentDecks = await db
    .select()
    .from(tournamentDeck)
    .where(eq(tournamentDeck.tournamentId, t.id));

  const parsedStandings = roundStandings.map(s =>
    parseStandingsToTournamentDeck2(s, t, tournamentDecks),
  );

  const playerInfo: Record<
    string,
    {
      deckId: string;
      meleeDeckId: string;
      matches: TournamentMatchInsert[];
    }
  > = {};

  tournamentDecks.forEach(td => {
    if (!td.meleePlayerUsername) {
      console.warn('Melee player username is empty');
      return;
    }
    playerInfo[td.meleePlayerUsername] = {
      deckId: td.deckId,
      meleeDeckId: td.meleeDecklistGuid ?? '',
      matches: [],
    };
  });

  let matchesWithEmptyPlayer2Deck = await db
    .select()
    .from(tournamentMatch)
    .where(
      and(
        eq(tournamentMatch.tournamentId, t.id),
        isNull(tournamentMatch.p2DeckId),
        isNotNull(tournamentMatch.p2Username),
      ),
    );

  console.log('Matches with empty player 2 deck:', matchesWithEmptyPlayer2Deck.length);

  // Array to store matches that need to be updated
  const matchesToUpdate = [];

  // Iterate through matches with empty p2DeckId
  for (const match of matchesWithEmptyPlayer2Deck) {
    // Find if the p2Username matches any oldUsername in parsedStandings
    const matchingStanding = parsedStandings.find(
      standing => standing.oldUsername === match.p2Username,
    );

    // If a match is found, prepare the update
    if (
      matchingStanding &&
      matchingStanding.realDecklistId &&
      matchingStanding.meleePlayerUsername
    ) {
      matchesToUpdate.push({
        matchId: match.id,
        newUsername: matchingStanding.meleePlayerUsername,
        newDeckId: matchingStanding.realDecklistId,
        points: match.p1Points,
      });
    }
  }

  console.log('Matches to update:', matchesToUpdate.length);

  // Update the matches in the database
  if (matchesToUpdate.length > 0) {
    for (const matchUpdate of matchesToUpdate) {
      await db
        .update(tournamentMatch)
        .set({
          p2Username: matchUpdate.newUsername,
          p2DeckId: matchUpdate.newDeckId,
          p2Points: matchUpdate.points,
        })
        .where(eq(tournamentMatch.id, matchUpdate.matchId));

      console.log(
        `Updated match ${matchUpdate.matchId}: ${matchUpdate.newUsername} with deck ${matchUpdate.newDeckId}`,
      );
    }

    console.log(`Successfully updated ${matchesToUpdate.length} matches.`);
  } else {
    console.log('No matches to update.');
  }

  console.log('Deleting duplicate matches...');

  /*

DELETE FROM tournament_match
WHERE id IN (
    SELECT
        CASE
            WHEN tm1.id < tm2.id THEN tm1.id
            ELSE tm2.id
            END as match_id_to_delete
    FROM
        tournament_match tm1
        JOIN tournament_match tm2 ON
            tm1.p1_username = tm2.p2_username
            AND tm1.p2_username = tm2.p1_username
            AND tm1.round = tm2.round
    WHERE
        tm1.tournament_id = '18e74d6b-44f0-4152-a298-20ad6c3d1270'
        AND tm1.tournament_id = tm2.tournament_id
)
   */

  // Get duplicate matches and delete one from each pair
  const duplicateIdsQuery = sql`
    SELECT 
      CASE 
        WHEN tm1.id < tm2.id THEN tm1.id 
        ELSE tm2.id 
      END AS match_id_to_delete
    FROM 
      ${tournamentMatch} tm1
      JOIN ${tournamentMatch} tm2 ON
        tm1.p1_username = tm2.p2_username
        AND tm1.p2_username = tm2.p1_username
        AND tm1.round = tm2.round
    WHERE
      tm1.tournament_id = ${tournamentId}
      AND tm1.tournament_id = tm2.tournament_id
      AND tm1.id != tm2.id
  `;

  const duplicateIds = await db.execute(duplicateIdsQuery);

  const matchIdsToDelete = duplicateIds.map(row => row.match_id_to_delete) as string[];

  console.log(`Found ${matchIdsToDelete.length} duplicate matches to delete`);

  if (matchIdsToDelete.length > 0) {
    const deleteResult = await db
      .delete(tournamentMatch)
      .where(sql`${tournamentMatch.id} IN ${matchIdsToDelete}`);

    console.log(`Successfully deleted ${matchIdsToDelete.length} duplicate matches`);
  } else {
    console.log('No duplicate matches to delete');
  }

  return {
    updatedMatches: matchesToUpdate.length,
  };
}
