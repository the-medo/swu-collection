/**
 * Prepare Daily Snapshot Cron Script
 *
 * Usage:
 *  - bun run server/crons/prepare-daily-snapshot.ts [YYYY-MM-DD]
 * If no date is provided, it will use today's date.
 */

import runDailySnapshot from '../lib/daily-snapshots/daily-snapshot-main.ts';

function parseDateArg(arg?: string): Date | undefined {
  if (!arg) return undefined;
  const d = new Date(arg);
  if (isNaN(d.getTime())) {
    console.warn(`[prepare-daily-snapshot] Invalid date argument '${arg}', falling back to today`);
    return undefined;
  }
  return d;
}

async function main() {
  const dateArg = process.argv[2];
  const date = parseDateArg(dateArg);

  console.log('[prepare-daily-snapshot] Starting daily snapshot...', date ? `(date=${date.toISOString().slice(0,10)})` : '(date=today)');

  try {
    const result = await runDailySnapshot(date);
    console.log('[prepare-daily-snapshot] Completed');
    console.log('[prepare-daily-snapshot] Summary:', {
      date: result.date,
      tournamentGroupId: result.tournamentGroupId,
      sections: result.sections.map(s => ({ name: s.name, ok: s.ok })),
    });
    process.exit(0);
  } catch (error) {
    console.error('[prepare-daily-snapshot] Error:', error);
    process.exit(1);
  }
}

// Execute the main function in the same style as other crons
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('[prepare-daily-snapshot] Unhandled error:', error);
    process.exit(1);
  });
