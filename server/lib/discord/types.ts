import type { TournamentScreenshotTarget } from '../../../types/Screenshotter.ts';
import type { DiscordNotification } from '../../db/schema/discord_notification.ts';
import type { TournamentWeekendResource } from '../../db/schema/tournament_weekend.ts';

export const discordNotificationTypes = {
  tournamentResults: 'tournament-results',
  tournamentStream: 'tournament-stream',
} as const;

export type DiscordNotificationType =
  (typeof discordNotificationTypes)[keyof typeof discordNotificationTypes];

export type DiscordNotificationStatus = 'pending' | 'sending' | 'success' | 'failed';

export type DiscordConfig = {
  apiBaseUrl: string;
  botToken?: string;
};

export type TournamentResultsDiscordConfig = DiscordConfig & {
  enabled: boolean;
  channelId?: string;
  roleId?: string;
  appBaseUrl: string;
  allowTextOnly: boolean;
};

export type TournamentStreamsDiscordConfig = DiscordConfig & {
  enabled: boolean;
  channelId?: string;
  roleId?: string;
  appBaseUrl: string;
};

export type DiscordAllowedMentions = {
  parse?: Array<'roles' | 'users' | 'everyone'>;
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
};

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
};

export type DiscordCreateMessagePayload = {
  content?: string;
  embeds?: DiscordEmbed[];
  allowed_mentions?: DiscordAllowedMentions;
};

export type DiscordNotificationPayload = DiscordCreateMessagePayload | Record<string, unknown>;

export type DiscordMessageResponse = {
  id: string;
  channel_id: string;
  content?: string;
  timestamp?: string;
};

export type TournamentResultsScreenshot = {
  target: TournamentScreenshotTarget;
  url: string;
  r2Key: string;
  width: number | null;
  height: number | null;
  generatedAt: string;
};

export type TournamentResultsDiscordTournament = {
  id: string;
  name: string;
  location: string;
  attendance: number;
  imported: boolean;
};

export type TournamentResultsDiscordMessageData = {
  tournament: TournamentResultsDiscordTournament;
  tournamentUrl: string;
  screenshots: TournamentResultsScreenshot[];
  payload: DiscordCreateMessagePayload;
};

export type SendTournamentResultsDiscordMessageOptions = {
  tournamentId: string;
  force?: boolean;
  dryRun?: boolean;
  config?: TournamentResultsDiscordConfig;
  fetchFn?: typeof fetch;
};

export type TournamentResultsDiscordResult =
  | {
      status: 'skipped';
      tournamentId: string;
      reason: string;
      notification?: DiscordNotification;
    }
  | {
      status: 'dry-run';
      tournamentId: string;
      payload: DiscordCreateMessagePayload;
      tournamentUrl: string;
      screenshots: TournamentResultsScreenshot[];
    }
  | {
      status: 'sent';
      tournamentId: string;
      discordMessageId: string;
      channelId: string;
      payload: DiscordCreateMessagePayload;
      tournamentUrl: string;
      screenshots: TournamentResultsScreenshot[];
      notification?: DiscordNotification;
    }
  | {
      status: 'failed';
      tournamentId: string;
      error: string;
      payload?: DiscordCreateMessagePayload;
      tournamentUrl?: string;
      screenshots?: TournamentResultsScreenshot[];
      notification?: DiscordNotification;
    };

export type TournamentResultsDiscordAfterImportResult = TournamentResultsDiscordResult;

export type TournamentStreamDiscordTournament = {
  id: string;
  name: string;
  location: string;
};

export type TournamentStreamDiscordResource = Pick<
  TournamentWeekendResource,
  'id' | 'tournamentId' | 'resourceType' | 'resourceUrl' | 'title' | 'description' | 'approved'
>;

export type TournamentStreamDiscordMessageData = {
  tournament: TournamentStreamDiscordTournament;
  resource: TournamentStreamDiscordResource;
  tournamentUrl: string;
  payload: DiscordCreateMessagePayload;
};

export type SendTournamentStreamDiscordMessageOptions = {
  resourceId: string;
  force?: boolean;
  dryRun?: boolean;
  config?: TournamentStreamsDiscordConfig;
  fetchFn?: typeof fetch;
};

export type TournamentStreamDiscordResult =
  | {
      status: 'skipped';
      resourceId: string;
      tournamentId?: string;
      reason: string;
      notification?: DiscordNotification;
    }
  | {
      status: 'dry-run';
      resourceId: string;
      tournamentId: string;
      payload: DiscordCreateMessagePayload;
      tournamentUrl: string;
    }
  | {
      status: 'sent';
      resourceId: string;
      tournamentId: string;
      discordMessageId: string;
      channelId: string;
      payload: DiscordCreateMessagePayload;
      tournamentUrl: string;
      notification?: DiscordNotification;
    }
  | {
      status: 'failed';
      resourceId: string;
      tournamentId?: string;
      error: string;
      payload?: DiscordCreateMessagePayload;
      tournamentUrl?: string;
      notification?: DiscordNotification;
    };

export type TournamentStreamDiscordAfterApprovalResult = TournamentStreamDiscordResult;

export type DiscordNotificationIdentity = {
  notificationType: DiscordNotificationType | (string & {});
  scopeType: string;
  scopeId?: string | null;
  scopeKey: string;
};

export type DiscordNotificationClaimInput = DiscordNotificationIdentity & {
  discordChannelId: string;
  payload?: DiscordNotificationPayload | null;
  force?: boolean;
};

export type DiscordNotificationClaimResult =
  | {
      claimed: true;
      notification: DiscordNotification;
      forced: boolean;
    }
  | {
      claimed: false;
      notification?: DiscordNotification;
      reason: string;
    };
