import type { Tournament } from '../../db/schema/tournament.ts';
import type {
  TournamentWeekend,
  TournamentWeekendResource,
} from '../../db/schema/tournament_weekend.ts';
import {
  extractMeleeTournamentId,
  extractYoutubeVideoId,
} from '../live-tournaments/resourceUrls.ts';
import { DiscordApiError, sendDiscordForumPost } from './client.ts';
import { getResourceSubmissionsDiscordConfig, joinDiscordAppUrl } from './config.ts';
import {
  claimNotificationForSend,
  markNotificationFailed,
  markNotificationSuccess,
} from './notificationLog.ts';
import { sanitizeDiscordMessageText, truncateDiscordText } from './tournamentDisplay.ts';
import {
  discordNotificationTypes,
  type DiscordCreateForumPostPayload,
  type DiscordEmbed,
  type DiscordNotificationIdentity,
} from './types.ts';

type Config = ReturnType<typeof getResourceSubmissionsDiscordConfig>;

// Use the saved submission and authenticated submitter from this request, so a
// concurrent upsert cannot change the attribution while Discord is being sent.
export type ResourceSubmissionDiscordData = {
  resource: TournamentWeekendResource;
  tournament: Pick<Tournament, 'id' | 'name' | 'location' | 'date'>;
  weekend: Pick<TournamentWeekend, 'id' | 'name' | 'date'>;
  submitter: { id: string; displayName: string };
};

export type ResourceSubmissionDiscordResult =
  | { status: 'skipped'; reason: string }
  | {
      status: 'dry-run';
      identity: DiscordNotificationIdentity;
      payload: DiscordCreateForumPostPayload;
    }
  | { status: 'sent'; discordMessageId: string; channelId: string }
  | { status: 'failed'; error: string };

export function getResourceSubmissionDiscordIdentity(
  resourceId: string,
): DiscordNotificationIdentity {
  return {
    notificationType: discordNotificationTypes.resourceSubmission,
    scopeType: 'tournament-weekend-resource',
    scopeId: resourceId,
    scopeKey: `tournament-weekend-resource:${resourceId}`,
  };
}

function safeText(value: string, limit = 1024) {
  return truncateDiscordText(sanitizeDiscordMessageText(value), limit);
}

export function buildResourceSubmissionDiscordPost(
  { resource, tournament, weekend, submitter }: ResourceSubmissionDiscordData,
  config: Pick<Config, 'roleId' | 'appBaseUrl'>,
): DiscordCreateForumPostPayload {
  if (!config.roleId) throw new Error('DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID is required.');
  if (!config.appBaseUrl) throw new Error('DISCORD_APP_BASE_URL is required.');
  const isMelee = resource.resourceType === 'melee';
  const kind = isMelee ? 'Melee ID' : 'YouTube stream / video';
  const tournamentUrl = joinDiscordAppUrl(config.appBaseUrl, `/tournaments/${tournament.id}`);
  const reviewUrl = joinDiscordAppUrl(config.appBaseUrl, '/admin?page=resource-submissions');
  const videoId = isMelee ? null : extractYoutubeVideoId(resource.resourceUrl);
  const meleeId = isMelee ? extractMeleeTournamentId(resource.resourceUrl) : null;
  const embed: DiscordEmbed = {
    title: safeText(resource.title || `${kind}: ${tournament.name}`, 256),
    url: resource.resourceUrl,
    color: isMelee ? 0x5865f2 : 0xff0000,
    description: [
      `Open the ${isMelee ? 'Melee tournament' : 'YouTube video'} using the title above.`,
      `[Open tournament](${tournamentUrl}) · [Review submissions](${reviewUrl})`,
      resource.description ? `\n${safeText(resource.description, 2000)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    fields: [
      { name: 'Resource type', value: kind, inline: true },
      {
        name: 'Status',
        value: resource.approved ? 'Already approved' : 'Pending admin review',
        inline: true,
      },
      {
        name: 'Submitted by',
        value: `${safeText(submitter.displayName, 256)}\nUser ID: ${safeText(submitter.id, 128)}`,
      },
      { name: 'Tournament', value: safeText(tournament.name, 255) },
      {
        name: 'Location',
        value: safeText(tournament.location || 'Not specified', 255),
        inline: true,
      },
      { name: 'Tournament date', value: tournament.date.toISOString().slice(0, 10), inline: true },
      { name: 'Weekend', value: `${safeText(weekend.name, 255)} (${weekend.date})` },
      // Timestamp columns are UTC without an offset in PostgreSQL.
      {
        name: 'Submitted at (UTC)',
        value: resource.updatedAt.slice(0, 19).replace('T', ' '),
        inline: true,
      },
      ...(meleeId ? [{ name: 'Melee ID', value: safeText(meleeId), inline: true }] : []),
    ],
    footer: {
      text: `Resource ID: ${resource.id} · Review in Admin → Resource submissions.`,
    },
    ...(videoId ? { image: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } } : {}),
  };

  return {
    name: safeText(`${isMelee ? 'Melee ID' : 'YouTube'} · ${tournament.name}`, 100),
    message: {
      content: `<@&${config.roleId}> New resource submission`,
      allowed_mentions: { parse: [], roles: [config.roleId], users: [], replied_user: false },
      embeds: [embed],
    },
  };
}

/** Best-effort delivery: saving a resource must not depend on Discord availability. */
export async function runResourceSubmissionDiscordAfterSave(
  data: ResourceSubmissionDiscordData,
  options: { config?: Config; dryRun?: boolean; fetchFn?: typeof fetch } = {},
): Promise<ResourceSubmissionDiscordResult> {
  let phase: 'configuration' | 'payload' | 'delivery' = 'configuration';
  try {
    const config = options.config ?? getResourceSubmissionsDiscordConfig();
    if (!config.enabled && !options.dryRun) {
      return {
        status: 'skipped',
        reason: 'Discord resource submission notifications are disabled.',
      };
    }
    phase = 'payload';
    const identity = getResourceSubmissionDiscordIdentity(data.resource.id);
    const payload = buildResourceSubmissionDiscordPost(data, config);
    if (options.dryRun) return { status: 'dry-run', identity, payload };
    if (!config.channelId) throw new Error('DISCORD_RESOURCE_SUBMISSIONS_CHANNEL_ID is required.');

    phase = 'delivery';
    const claim = await claimNotificationForSend({
      ...identity,
      discordChannelId: config.channelId,
      payload,
    });
    if (!claim.claimed) return { status: 'skipped', reason: claim.reason };

    let messageId = claim.notification.discordMessageId;
    try {
      // If Discord accepted the post but recording success failed, preserve and
      // reuse the starter-message ID instead of creating a second forum post.
      if (!messageId) {
        const post = await sendDiscordForumPost({
          channelId: claim.notification.discordChannelId,
          payload,
          config,
          fetchFn: options.fetchFn,
        });
        messageId = post.message.id;
      }
      await markNotificationSuccess({ ...identity, discordMessageId: messageId, payload });
      return {
        status: 'sent',
        discordMessageId: messageId,
        channelId: claim.notification.discordChannelId,
      };
    } catch (error) {
      // Upstream response bodies may contain submitted content; store only a code.
      const code =
        error instanceof DiscordApiError ? `discord-${error.status}` : 'delivery-unconfirmed';
      await markNotificationFailed({
        ...identity,
        error: code,
        payload,
        discordMessageId: messageId ?? undefined,
      });
      console.error(`[discord resource submissions] ${data.resource.id}: ${code}`);
      return { status: 'failed', error: code };
    }
  } catch (error) {
    // Configuration and payload errors are ours; database/upstream errors can
    // include credentials or submitted content and must remain redacted.
    const message =
      phase === 'delivery'
        ? 'notification-failed'
        : `${phase}: ${error instanceof Error ? error.message : 'invalid configuration'}`;
    console.error(`[discord resource submissions] ${data.resource.id}: ${message}`);
    return { status: 'failed', error: message };
  }
}
