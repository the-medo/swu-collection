import * as Sentry from '@sentry/bun';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { monitoredWorkerCommand, workerCommand } from '../lib/creators/worker/command.ts';

if (import.meta.main) {
  const args = process.argv.slice(2);
  const log = (result: unknown) => console.log(JSON.stringify(result));
  if (args.includes('--help') || args.includes('--dry-run') || args[0] === 'status') {
    try {
      const result = await workerCommand(args);
      if (result.help) console.log(result.help);
      else log(result);
      process.exit(0);
    } catch {
      log({ error: 'invalid_creator_worker_read_command' });
      process.exit(1);
    }
  }
  const code = await monitoredWorkerCommand(
    () => workerCommand(args),
    new SentryCron(CRON_SENTRY_MONITOR_SLUGS.CREATOR_VIDEO_WORKER),
    () => Sentry.flush(2_000),
    log,
  );
  process.exit(code);
}
