import { randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import { getCrossfireReportsDiscordConfig } from './config.ts';
import { DiscordApiError, sendDiscordForumPost } from './client.ts';
import type { DiscordCreateForumPostPayload } from './types.ts';

type Config = ReturnType<typeof getCrossfireReportsDiscordConfig>;
type Report = { id: string; label: string; description: string };
export function buildCrossfireReportPost(
  report: Report,
  origin: string,
): DiscordCreateForumPostPayload {
  return {
    name: (report.label.trim() || 'Game problem').slice(0, 100),
    message: {
      content: 'New Crossfire bug report',
      allowed_mentions: { parse: [], users: [], roles: [], replied_user: false },
      embeds: [
        {
          title: (report.label || 'Game problem').slice(0, 120),
          description: report.description.slice(0, 3000),
          url: `${origin}/crossfire/reports/${encodeURIComponent(report.id)}`,
          color: 0xa42e3c,
          footer: { text: 'Open the saved position in SWUBASE · Reporter or admin login required' },
        },
      ],
    },
  };
}

export async function deliverCrossfireReports(
  sql: Sql,
  options: {
    config?: Config;
    fetchFn?: typeof fetch;
    dryRun?: boolean;
    limit?: number;
    reportId?: string;
  } = {},
) {
  const config = options.config ?? getCrossfireReportsDiscordConfig();
  if (!config.enabled) return { status: 'skipped' as const, sent: 0, failed: 0 };
  if (!config.channelId || !config.appBaseUrl || !config.botToken)
    throw new Error('Crossfire report notifications are not configured');
  const limit = Math.min(20, Math.max(1, options.limit ?? 20));
  if (options.dryRun) {
    const rows =
      await sql`SELECT r.id,r.label,r.description,COALESCE(n.app_base_url,${config.appBaseUrl}) AS origin
      FROM play.report_notifications n JOIN play.problem_reports r ON r.id=n.report_id
      WHERE n.status <> 'sent' AND (${options.reportId ?? null}::text IS NULL OR n.report_id=${options.reportId ?? null}) ORDER BY n.next_attempt_at,n.report_id LIMIT ${limit}`;
    return {
      status: 'dry-run' as const,
      sent: 0,
      failed: 0,
      messages: rows.map(r =>
        buildCrossfireReportPost(
          { id: r.id, label: r.label, description: r.description },
          r.origin,
        ),
      ),
    };
  }
  let sent = 0,
    failed = 0;
  for (let i = 0; i < limit; i++) {
    const lease = randomUUID();
    // Commit a short claim before network I/O. A crashed sender is reclaimable;
    // concurrent submissions/retries cannot own the same notification lease.
    const [row] = await sql`WITH candidate AS (
      SELECT report_id FROM play.report_notifications
      WHERE ((status='pending' AND next_attempt_at <= clock_timestamp())
         OR (status='sending' AND lease_until < clock_timestamp()))
        AND (${options.reportId ?? null}::text IS NULL OR report_id=${options.reportId ?? null})
      ORDER BY next_attempt_at,report_id FOR UPDATE SKIP LOCKED LIMIT 1
    ), claimed AS (
      UPDATE play.report_notifications n SET status='sending',lease_id=${lease},
        lease_until=clock_timestamp()+interval '60 seconds',attempts=attempts+1,
        channel_id=COALESCE(channel_id,${config.channelId}),app_base_url=COALESCE(app_base_url,${config.appBaseUrl})
      FROM candidate c WHERE n.report_id=c.report_id RETURNING n.*
    ) SELECT c.*,r.label,r.description FROM claimed c JOIN play.problem_reports r ON r.id=c.report_id`;
    if (!row) break;
    try {
      const post = await sendDiscordForumPost({
        channelId: row.channel_id,
        config,
        fetchFn: options.fetchFn,
        payload: buildCrossfireReportPost(
          { id: row.report_id, label: row.label, description: row.description },
          row.app_base_url,
        ),
      });
      await sql`UPDATE play.report_notifications SET status='sent',message_id=${post.message.id},sent_at=clock_timestamp(),
        lease_id=NULL,lease_until=NULL,last_error=NULL WHERE report_id=${row.report_id} AND lease_id=${lease}`;
      sent++;
    } catch (error) {
      let delay = Math.min(3600, 30 * 2 ** Math.min(row.attempts, 7));
      if (error instanceof DiscordApiError && error.status === 429) {
        try {
          const retry = JSON.parse(error.body).retry_after;
          if (typeof retry === 'number' && Number.isFinite(retry))
            delay = Math.max(delay, Math.ceil(retry));
        } catch {
          /* Use the bounded exponential delay for an invalid response. */
        }
      }
      // Never persist an upstream response body, token or user note as an error.
      const code =
        error instanceof DiscordApiError ? `discord-${error.status}` : 'delivery-unconfirmed';
      await sql`UPDATE play.report_notifications SET status='pending',lease_id=NULL,lease_until=NULL,
        last_error=${code},next_attempt_at=clock_timestamp()+(${delay} * interval '1 second')
        WHERE report_id=${row.report_id} AND lease_id=${lease}`;
      failed++;
      // Stop the batch on upstream failure, especially a global rate limit.
      break;
    }
  }
  return { status: failed ? ('failed' as const) : ('sent' as const), sent, failed };
}
