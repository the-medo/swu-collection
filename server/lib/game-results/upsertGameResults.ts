import { db } from '../../db';
import { gameResult } from '../../db/schema/game_result.ts';
import type { GameResult } from '../../db/schema/game_result.ts';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { teamMember } from '../../db/schema/team_member.ts';
import { teamDeck } from '../../db/schema/team_deck.ts';

export const upsertGameResults = async (results: GameResult[]) => {
  if (results.length === 0) {
    return;
  }

  // ======== Overcomplicated logic of adding new decks to teams ============
  // - in case of data mocking, game results of multiple users can be upserted at once
  const distinctUserIds = [...new Set(results.map(result => result.userId))];
  const userTeamsWithAutoAddDeck = await db
    .select({
      teamId: teamMember.teamId,
      userId: teamMember.userId,
    })
    .from(teamMember)
    .where(and(inArray(teamMember.userId, distinctUserIds), eq(teamMember.autoAddDeck, true)));

  if (userTeamsWithAutoAddDeck.length > 0) {
    const teamDecksToAdd: { teamId: string; deckId: string }[] = [];
    results.forEach(result => {
      userTeamsWithAutoAddDeck.forEach(userTeam => {
        if (userTeam.userId === result.userId) {
          teamDecksToAdd.push({ teamId: userTeam.teamId, deckId: result.deckId });
        }
      });
    });

    if (teamDecksToAdd.length > 0) {
      await db.insert(teamDeck).values(teamDecksToAdd).onConflictDoNothing();
    }
  }

  // ======================================================

  // ======== Insert game results
  await db
    .insert(gameResult)
    .values(results)
    .onConflictDoUpdate({
      target: [gameResult.userId, gameResult.gameId],
      set: {
        deckId: sql`excluded.deck_id`,
        matchId: sql`excluded.match_id`,
        gameNumber: sql`excluded.game_number`,
        leaderCardId: sql`excluded.leader_card_id`,
        baseCardKey: sql`excluded.base_card_key`,
        opponentLeaderCardId: sql`excluded.opponent_leader_card_id`,
        opponentBaseCardKey: sql`excluded.opponent_base_card_key`,
        hasInitiative: sql`excluded.has_initiative`,
        hasMulligan: sql`excluded.has_mulligan`,
        isWinner: sql`excluded.is_winner`,
        containsUnknownCards: sql`excluded.contains_unknown_cards`,
        gameSource: sql`excluded.game_source`,
        cardMetrics: sql`excluded.card_metrics`,
        roundMetrics: sql`excluded.round_metrics`,
        otherData: sql`excluded.other_data`,

        // exclude: sql`excluded.exclude`,
        // manuallyEdited: sql`excluded.manually_edited`,
        // userEventId: sql`excluded.user_event_id`,
        // note: sql`excluded.note`,

        updatedAt: new Date().toISOString(),
      },
    });
};
