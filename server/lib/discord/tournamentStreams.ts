import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentWeekendResource } from '../../db/schema/tournament_weekend.ts';
import { extractYoutubeVideoId } from '../live-tournaments/resourceUrls.ts';
import { sendDiscordChannelMessage } from './client.ts';
import { getTournamentStreamsDiscordConfig, joinDiscordAppUrl } from './config.ts';
import {
  claimNotificationForSend,
  markNotificationFailed,
  markNotificationSuccess,
} from './notificationLog.ts';
import { getTournamentDiscordDisplayName, truncateDiscordText } from './tournamentDisplay.ts';
import {
  discordNotificationTypes,
  type DiscordCreateMessagePayload,
  type DiscordEmbed,
  type DiscordNotificationIdentity,
  type SendTournamentStreamDiscordMessageOptions,
  type TournamentStreamDiscordAfterApprovalResult,
  type TournamentStreamDiscordMessageData,
  type TournamentStreamDiscordResource,
  type TournamentStreamDiscordResult,
  type TournamentStreamDiscordTournament,
  type TournamentStreamsDiscordConfig,
} from './types.ts';

const DISCORD_EMBED_TITLE_LIMIT = 256;

export class TournamentStreamDiscordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TournamentStreamDiscordValidationError';
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getYoutubeThumbnailUrl(resourceUrl: string) {
  const videoId = extractYoutubeVideoId(resourceUrl);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
}

export function getTournamentStreamDiscordNotificationIdentity(
  resourceId: string,
): DiscordNotificationIdentity {
  return {
    notificationType: discordNotificationTypes.tournamentStream,
    scopeType: 'tournament-weekend-resource',
    scopeId: resourceId,
    scopeKey: `tournament-weekend-resource:${resourceId}`,
  };
}

export function buildTournamentStreamTournamentUrl(appBaseUrl: string, tournamentId: string) {
  return joinDiscordAppUrl(appBaseUrl, `/tournaments/${tournamentId}`);
}

export async function loadTournamentStreamDiscordMessageData({
  resourceId,
  config = getTournamentStreamsDiscordConfig({ requireConfigured: true }),
}: {
  resourceId: string;
  config?: TournamentStreamsDiscordConfig;
}): Promise<TournamentStreamDiscordMessageData> {
  const [record] = await db
    .select({
      resource: tournamentWeekendResource,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location,
      },
    })
    .from(tournamentWeekendResource)
    .innerJoin(tournament, eq(tournamentWeekendResource.tournamentId, tournament.id))
    .where(eq(tournamentWeekendResource.id, resourceId))
    .limit(1);

  if (!record) {
    throw new TournamentStreamDiscordValidationError(
      `Tournament stream resource not found: ${resourceId}`,
    );
  }

  if (record.resource.resourceType !== 'stream') {
    throw new TournamentStreamDiscordValidationError(
      `Tournament resource is not a stream: ${resourceId}`,
    );
  }

  if (!record.resource.approved) {
    throw new TournamentStreamDiscordValidationError(
      `Tournament stream resource is not approved yet: ${resourceId}`,
    );
  }

  const tournamentUrl = buildTournamentStreamTournamentUrl(config.appBaseUrl, record.tournament.id);
  const payload = buildTournamentStreamDiscordPayload({
    tournament: record.tournament,
    resource: record.resource,
    tournamentUrl,
    config,
  });

  return {
    tournament: record.tournament,
    resource: record.resource,
    tournamentUrl,
    payload,
  };
}

export function buildTournamentStreamDiscordPayload({
  tournament,
  resource,
  tournamentUrl,
  config,
}: {
  tournament: TournamentStreamDiscordTournament;
  resource: TournamentStreamDiscordResource;
  tournamentUrl: string;
  config: TournamentStreamsDiscordConfig;
}): DiscordCreateMessagePayload {
  if (!config.roleId) {
    throw new Error('DISCORD_TOURNAMENT_STREAMS_ROLE_ID is required to build Discord payload.');
  }

  const title = truncateDiscordText(
    getTournamentDiscordDisplayName(tournament),
    DISCORD_EMBED_TITLE_LIMIT,
  );
  const thumbnailUrl = getYoutubeThumbnailUrl(resource.resourceUrl);
  const embed: DiscordEmbed = {
    title,
    url: resource.resourceUrl,
    description: [`[Watch stream](${resource.resourceUrl})`, `[Open tournament](${tournamentUrl})`]
      .filter(Boolean)
      .join('\n'),
  };
  if (thumbnailUrl) {
    embed.image = { url: thumbnailUrl };
  }

  return {
    content: `<@&${config.roleId}>`,
    embeds: [embed],
    allowed_mentions: {
      roles: [config.roleId],
    },
  };
}

export async function sendTournamentStreamDiscordMessage({
  resourceId,
  force = false,
  dryRun = false,
  config,
  fetchFn,
}: SendTournamentStreamDiscordMessageOptions): Promise<TournamentStreamDiscordResult> {
  const resolvedConfig =
    config ?? getTournamentStreamsDiscordConfig({ requireConfigured: !dryRun });
  const identity = getTournamentStreamDiscordNotificationIdentity(resourceId);
  const messageData = await loadTournamentStreamDiscordMessageData({
    resourceId,
    config: resolvedConfig,
  });

  if (dryRun) {
    return {
      status: 'dry-run',
      resourceId,
      tournamentId: messageData.tournament.id,
      payload: messageData.payload,
      tournamentUrl: messageData.tournamentUrl,
    };
  }

  if (!resolvedConfig.channelId) {
    throw new Error('DISCORD_TOURNAMENT_STREAMS_CHANNEL_ID is required to send Discord messages.');
  }

  const claim = await claimNotificationForSend({
    ...identity,
    discordChannelId: resolvedConfig.channelId,
    payload: messageData.payload,
    force,
  });

  if (!claim.claimed) {
    return {
      status: 'skipped',
      resourceId,
      tournamentId: messageData.tournament.id,
      reason: claim.reason,
      notification: claim.notification,
    };
  }

  try {
    const discordMessage = await sendDiscordChannelMessage({
      channelId: resolvedConfig.channelId,
      payload: messageData.payload,
      config: resolvedConfig,
      fetchFn,
    });

    const notification = await markNotificationSuccess({
      notificationType: identity.notificationType,
      scopeKey: identity.scopeKey,
      discordMessageId: discordMessage.id,
      payload: messageData.payload,
      sentAt: discordMessage.timestamp ?? undefined,
    });

    return {
      status: 'sent',
      resourceId,
      tournamentId: messageData.tournament.id,
      discordMessageId: discordMessage.id,
      channelId: resolvedConfig.channelId,
      payload: messageData.payload,
      tournamentUrl: messageData.tournamentUrl,
      notification: notification ?? claim.notification,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const notification = await markNotificationFailed({
      notificationType: identity.notificationType,
      scopeKey: identity.scopeKey,
      error: message,
      payload: messageData.payload,
    });

    return {
      status: 'failed',
      resourceId,
      tournamentId: messageData.tournament.id,
      error: message,
      payload: messageData.payload,
      tournamentUrl: messageData.tournamentUrl,
      notification: notification ?? claim.notification,
    };
  }
}

function logTournamentStreamDiscordResult(result: TournamentStreamDiscordResult) {
  if (result.status === 'sent') {
    console.log(
      `[discord tournament streams] Sent notification for resource ${result.resourceId}: ${result.discordMessageId}.`,
    );
    return;
  }

  if (result.status === 'skipped') {
    console.log(
      `[discord tournament streams] Skipped notification for resource ${result.resourceId}: ${result.reason}`,
    );
    return;
  }

  if (result.status === 'failed') {
    console.error(
      `[discord tournament streams] Failed notification for resource ${result.resourceId}: ${result.error}`,
    );
  }
}

export function shouldRunTournamentStreamsDiscordAfterApproval(
  config: TournamentStreamsDiscordConfig = getTournamentStreamsDiscordConfig(),
) {
  return config.enabled;
}

export async function runTournamentStreamDiscordAfterApproval(
  resourceId: string,
): Promise<TournamentStreamDiscordAfterApprovalResult> {
  try {
    const config = getTournamentStreamsDiscordConfig();

    if (!shouldRunTournamentStreamsDiscordAfterApproval(config)) {
      return {
        status: 'skipped',
        resourceId,
        reason:
          'DISCORD_TOURNAMENT_STREAMS_CHANNEL_ID and DISCORD_TOURNAMENT_STREAMS_ROLE_ID are not configured.',
      };
    }

    const result = await sendTournamentStreamDiscordMessage({
      resourceId,
      config,
    });

    logTournamentStreamDiscordResult(result);

    return result;
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(
      `[discord tournament streams] Failed notification for resource ${resourceId}:`,
      error,
    );

    return {
      status: 'failed',
      resourceId,
      error: message,
    };
  }
}
