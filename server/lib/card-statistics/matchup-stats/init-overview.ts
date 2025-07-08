import { db } from '../../../db';
import { cardStatMatchupOverview } from '../../../db/schema/card_stat_matchup_schema.ts';

/**
 * Initialize a card stat matchup overview record
 * @param userId - The user ID
 * @param params - The matchup parameters
 * @returns The ID of the inserted record
 */
export async function initCardStatMatchupOverview(
  userId: string | undefined,
  params: {
    meta_id?: number;
    tournament_id?: string;
    tournament_group_id?: string;
    leaderId?: string;
    baseId?: string;
    leaderId2?: string;
    baseId2?: string;
  }
): Promise<string> {
  // Insert a new record into the overview table
  const [result] = await db
    .insert(cardStatMatchupOverview)
    .values({
      userId,
      params: JSON.stringify(params),
    })
    .returning({ id: cardStatMatchupOverview.id });

  return result.id;
}