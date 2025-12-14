/**
 * Card Stats Cleanup Cron Script
 *
 * This script cleans up old card statistics data:
 * 1. Finds all card_stat_matchup_overview IDs created in the last 15 minutes
 * 2. Deletes all rows from related tables that don't match these recent IDs
 *
 * Run with: bun card-stats-cleanup.ts
 */

import { db } from '../db';
import {
  cardStatMatchupOverview,
  cardStatMatchupInfo,
  cardStatMatchupDecks,
  cardStatMatchupTournaments,
} from '../db/schema/card_stat_matchup_schema.ts';
import { sql, not, inArray, gte } from 'drizzle-orm';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';

async function main() {
  console.log('Starting card stats cleanup...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['cleanup-card-stats']);
  cron.started();

  try {
    // Calculate the timestamp for 15 minutes ago
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    // Find all overview IDs created in the last 15 minutes
    const recentOverviews = await db
      .select({ id: cardStatMatchupOverview.id })
      .from(cardStatMatchupOverview)
      .where(gte(cardStatMatchupOverview.createdAt, fifteenMinutesAgo));

    const recentIds = recentOverviews.map(overview => overview.id);
    console.log(`Found ${recentIds.length} recent card stat matchup overviews`);

    if (recentIds.length > 0) {
      await db.delete(cardStatMatchupInfo).where(not(inArray(cardStatMatchupInfo.id, recentIds)));
      await db.delete(cardStatMatchupDecks).where(not(inArray(cardStatMatchupDecks.id, recentIds)));
      await db
        .delete(cardStatMatchupTournaments)
        .where(not(inArray(cardStatMatchupTournaments.id, recentIds)));
    } else {
      await db.execute(sql`TRUNCATE TABLE card_stat_matchup_info`);
      await db.execute(sql`TRUNCATE TABLE card_stat_matchup_decks`);
      await db.execute(sql`TRUNCATE TABLE card_stat_matchup_tournaments`);
    }

    console.log('Card stats cleanup completed successfully');
    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('Error during card stats cleanup:', error);
    cron.crashed(error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
