import type { ReportHistoryCounts } from '../../../shared/types/userReportModeration.ts';
import type { userReport } from '../../db/schema/user_report.ts';
import { DiscordApiError, sendDiscordForumPost } from './client.ts';
import { getUserReportsDiscordConfig, joinDiscordAppUrl } from './config.ts';
import {
  claimNotificationForSend,
  markNotificationFailed,
  markNotificationSuccess,
} from './notificationLog.ts';
import { sanitizeDiscordMessageText, truncateDiscordText } from './tournamentDisplay.ts';
import {
  discordNotificationTypes,
  type DiscordCreateForumPostPayload,
  type DiscordNotificationIdentity,
} from './types.ts';

type Config = ReturnType<typeof getUserReportsDiscordConfig>;
export type UserReportDiscordData = {
  report: typeof userReport.$inferSelect;
  reporter: { id: string; displayName: string };
  reported: { id: string; displayName: string };
  history?: { reporter: ReportHistoryCounts; reported: ReportHistoryCounts };
};
type NotificationLog = {
  claim: typeof claimNotificationForSend;
  success: typeof markNotificationSuccess;
  failed: typeof markNotificationFailed;
};
const notificationLog: NotificationLog = {
  claim: claimNotificationForSend,
  success: markNotificationSuccess,
  failed: markNotificationFailed,
};

export function getUserReportDiscordIdentity(id: string): DiscordNotificationIdentity {
  return {
    notificationType: discordNotificationTypes.userReport,
    scopeType: 'user-report',
    scopeId: id,
    scopeKey: `user-report:${id}`,
  };
}

export function buildUserReportDiscordPost(
  { report, reporter, reported, history }: UserReportDiscordData,
  config: Pick<Config, 'roleId' | 'appBaseUrl'>,
): DiscordCreateForumPostPayload {
  if (!config.roleId) throw new Error('DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID is required.');
  if (!config.appBaseUrl) throw new Error('DISCORD_APP_BASE_URL is required.');
  const safe = (text: string, max: number) =>
    truncateDiscordText(sanitizeDiscordMessageText(text).replace(/([\[\]])/g, '\\$1'), max);
  const profileUrl = (id: string) =>
    joinDiscordAppUrl(config.appBaseUrl, `/users/${encodeURIComponent(id)}`);
  const historyUrl = (id: string) =>
    joinDiscordAppUrl(
      config.appBaseUrl,
      `/admin?page=user-reports&reportStatus=all&reportUserId=${encodeURIComponent(id)}`,
    );
  const reportUrl = joinDiscordAppUrl(
    config.appBaseUrl,
    `/admin?page=user-reports&reportId=${report.id}`,
  );
  const person = (value: { id: string; displayName: string }, counts?: ReportHistoryCounts) =>
    truncateDiscordText(
      `${safe(value.displayName, 256)}\n[Open profile](${profileUrl(value.id)})\nUser ID: ${safe(value.id, 200)}\n[Report history](${historyUrl(value.id)})${counts ? `\n${counts.sent} sent · ${counts.received} received (${counts.openReceived} open)` : ''}`,
      700,
    );
  return {
    name: truncateDiscordText(
      `User report · ${reported.displayName.replace(/\s+/g, ' ').replace(/@/g, '＠')}`,
      100,
    ),
    message: {
      content: `<@&${config.roleId}> New user report`,
      allowed_mentions: { parse: [], roles: [config.roleId], users: [], replied_user: false },
      embeds: [
        {
          title: 'User report',
          url: reportUrl,
          color: 0xef4444,
          description: `${safe(report.description, 3800)}\n\n[Review report](${reportUrl})`,
          fields: [
            { name: 'Reported user', value: person(reported, history?.reported) },
            { name: 'Reported by', value: person(reporter, history?.reporter) },
            {
              name: 'Submitted from',
              value: report.source === 'conversation' ? 'Conversation' : 'User profile',
              inline: true,
            },
            { name: 'Submitted at (UTC)', value: report.createdAt.toISOString(), inline: true },
          ],
          footer: { text: `Report ID: ${report.id}` },
        },
      ],
    },
  };
}

export async function runUserReportDiscordAfterSave(
  data: UserReportDiscordData,
  options: {
    config?: Config;
    dryRun?: boolean;
    fetchFn?: typeof fetch;
    log?: NotificationLog;
  } = {},
) {
  const log = options.log ?? notificationLog;
  let phase: 'configuration' | 'payload' | 'delivery' = 'configuration';
  try {
    const config = options.config ?? getUserReportsDiscordConfig();
    if (!config.enabled && !options.dryRun)
      return { status: 'skipped' as const, reason: 'Discord user reports are disabled.' };
    phase = 'payload';
    const identity = getUserReportDiscordIdentity(data.report.id);
    const payload = buildUserReportDiscordPost(data, config);
    if (options.dryRun) return { status: 'dry-run' as const, identity, payload };
    if (!config.channelId) throw new Error('DISCORD_USER_REPORTS_CHANNEL_ID is required.');
    phase = 'delivery';
    const claim = await log.claim({ ...identity, discordChannelId: config.channelId, payload });
    if (!claim.claimed) return { status: 'skipped' as const, reason: claim.reason };
    let messageId = claim.notification.discordMessageId;
    try {
      if (!messageId) {
        const post = await sendDiscordForumPost({
          channelId: claim.notification.discordChannelId,
          payload,
          config,
          fetchFn: options.fetchFn,
        });
        messageId = post.message.id;
      }
      await log.success({ ...identity, discordMessageId: messageId, payload });
      return {
        status: 'sent' as const,
        discordMessageId: messageId,
        channelId: claim.notification.discordChannelId,
      };
    } catch (error) {
      const code =
        error instanceof DiscordApiError ? `discord-${error.status}` : 'delivery-unconfirmed';
      await log.failed({
        ...identity,
        error: code,
        payload,
        discordMessageId: messageId ?? undefined,
      });
      console.error(`[discord user reports] ${data.report.id}: ${code}`);
      return { status: 'failed' as const, error: code };
    }
  } catch (error) {
    const message =
      phase === 'delivery'
        ? 'notification-failed'
        : `${phase}: ${error instanceof Error ? error.message : 'invalid configuration'}`;
    console.error(`[discord user reports] ${data.report.id}: ${message}`);
    return { status: 'failed' as const, error: message };
  }
}
