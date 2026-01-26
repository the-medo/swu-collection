import { db } from '../../db';
import { gameResult } from '../../db/schema/game_result.ts';
import type { GameResult } from '../../db/schema/game_result.ts';
import { sql } from 'drizzle-orm';

export const upsertGameResults = async (results: GameResult[]) => {
  if (results.length === 0) {
    return;
  }

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
