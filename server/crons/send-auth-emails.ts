import * as Sentry from '@sentry/bun';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { processAuthEmails } from '../lib/auth-email/outbox.ts';

if (import.meta.main) {
  const monitor = new SentryCron(CRON_SENTRY_MONITOR_SLUGS.AUTH_EMAIL_DELIVERY);
  monitor.started();
  let exitCode = 0;
  try {
    const result = await processAuthEmails();
    console.log('[auth-email]', result);
    if (result.failed || result.expired) {
      monitor.crashed(
        new Error('Auth email delivery needs attention; inspect bounded outbox status codes.'),
      );
      exitCode = 1;
    } else monitor.finished();
  } catch {
    // Database/provider errors can contain personal data. Only report a fixed message.
    monitor.crashed(new Error('Auth email worker failed.'));
    exitCode = 1;
  }
  await Sentry.flush(2000);
  process.exit(exitCode);
}
