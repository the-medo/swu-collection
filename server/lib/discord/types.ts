import type { TournamentScreenshotTarget } from '../../../types/Screenshotter.ts';
import type { DiscordNotification } from '../../db/schema/discord_notification.ts';

export const discordNotificationTypes = {
  tournamentResults: 'tournament-results',
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
  attendance: number;
  imported: boolean;
};

export type TournamentResultsDiscordMessageData = {
  tournament: TournamentResultsDiscordTournament;
  tournamentUrl: string;
  screenshots: TournamentResultsScreenshot[];
  payload: DiscordCreateMessagePayload;
};

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
