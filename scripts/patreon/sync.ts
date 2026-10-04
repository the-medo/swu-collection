import { db } from '../../server/db';
import { patreonService } from '../../server/lib/patreon/service.ts';
import { PatreonError } from '../../server/lib/patreon/config.ts';
import { logPatreonFailure } from '../../server/lib/patreon/log.ts';

try {
  const result = await patreonService.sync();
  console.log(
    `[patreon] Checked ${result.members} members; ${result.skipped} invalid records; ${result.awards} awards; ${result.credits} credits.`,
  );
} catch (error) {
  logPatreonFailure('sync', error);
  console.error(
    error instanceof PatreonError
      ? error.message
      : 'Patreon sync failed. No private response or database details are logged.',
  );
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
