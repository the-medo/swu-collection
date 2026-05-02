import type {
  DiscordConfig,
  TournamentResultsDiscordConfig,
  TournamentStreamsDiscordConfig,
} from './types.ts';

const DEFAULT_DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const DEFAULT_LOCAL_APP_BASE_URL = 'http://localhost:5173';
const DISCORD_APP_BASE_URL_ENV_LABEL =
  'DISCORD_APP_BASE_URL, DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL, BETTER_AUTH_URL, or VITE_BETTER_AUTH_URL';

type DiscordConfigOptions = {
  requireBotToken?: boolean;
};

type TournamentResultsDiscordConfigOptions = {
  requireConfigured?: boolean;
};

type TournamentStreamsDiscordConfigOptions = {
  requireConfigured?: boolean;
};

function isLocalEnvironment() {
  return process.env.ENVIRONMENT === 'local' || process.env.NODE_ENV !== 'production';
}

function readStringEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readBooleanEnv(name: string) {
  const value = readStringEnv(name)?.toLowerCase();
  if (!value) return undefined;

  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;

  throw new Error(`${name} must be a boolean value.`);
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function assertPresent(
  value: string | undefined,
  envName: string,
  feature = 'Discord notifications',
): asserts value is string {
  if (!value) {
    throw new Error(`${envName} is required for ${feature}.`);
  }
}

function readDiscordAppBaseUrl() {
  return (
    readStringEnv('DISCORD_APP_BASE_URL') ??
    readStringEnv('DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL') ??
    readStringEnv('BETTER_AUTH_URL') ??
    readStringEnv('VITE_BETTER_AUTH_URL') ??
    (isLocalEnvironment() ? DEFAULT_LOCAL_APP_BASE_URL : undefined)
  );
}

export function normalizeDiscordBaseUrl(url: string) {
  return normalizeBaseUrl(url);
}

export function joinDiscordAppUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function getDiscordConfig(options: DiscordConfigOptions = {}): DiscordConfig {
  const botToken = readStringEnv('DISCORD_BOT_TOKEN');

  if (options.requireBotToken) {
    assertPresent(botToken, 'DISCORD_BOT_TOKEN');
  }

  return {
    apiBaseUrl: normalizeBaseUrl(
      readStringEnv('DISCORD_API_BASE_URL') ?? DEFAULT_DISCORD_API_BASE_URL,
    ),
    botToken,
  };
}

export function getTournamentResultsDiscordConfig(
  options: TournamentResultsDiscordConfigOptions = {},
): TournamentResultsDiscordConfig {
  const enabled = readBooleanEnv('DISCORD_TOURNAMENT_RESULTS_ENABLED') ?? false;
  const shouldRequireConfig = enabled || options.requireConfigured === true;
  const discordConfig = getDiscordConfig({ requireBotToken: shouldRequireConfig });
  const channelId = readStringEnv('DISCORD_TOURNAMENT_RESULTS_CHANNEL_ID');
  const roleId = readStringEnv('DISCORD_TOURNAMENT_RESULTS_ROLE_ID');
  const appBaseUrl = readDiscordAppBaseUrl();

  if (shouldRequireConfig) {
    assertPresent(
      channelId,
      'DISCORD_TOURNAMENT_RESULTS_CHANNEL_ID',
      'Discord tournament results notifications',
    );
    assertPresent(
      roleId,
      'DISCORD_TOURNAMENT_RESULTS_ROLE_ID',
      'Discord tournament results notifications',
    );
    assertPresent(
      appBaseUrl,
      DISCORD_APP_BASE_URL_ENV_LABEL,
      'Discord tournament results notifications',
    );
  }

  return {
    ...discordConfig,
    enabled,
    channelId,
    roleId,
    appBaseUrl: normalizeBaseUrl(appBaseUrl ?? ''),
    allowTextOnly: readBooleanEnv('DISCORD_TOURNAMENT_RESULTS_ALLOW_TEXT_ONLY') ?? true,
  };
}

export function getTournamentStreamsDiscordConfig(
  options: TournamentStreamsDiscordConfigOptions = {},
): TournamentStreamsDiscordConfig {
  const channelId = readStringEnv('DISCORD_TOURNAMENT_STREAMS_CHANNEL_ID');
  const roleId = readStringEnv('DISCORD_TOURNAMENT_STREAMS_ROLE_ID');
  const isConfigured = Boolean(channelId && roleId);
  const shouldRequireConfig = isConfigured || options.requireConfigured === true;
  const discordConfig = getDiscordConfig({ requireBotToken: shouldRequireConfig });
  const appBaseUrl = readDiscordAppBaseUrl();

  if (shouldRequireConfig) {
    assertPresent(
      channelId,
      'DISCORD_TOURNAMENT_STREAMS_CHANNEL_ID',
      'Discord tournament stream notifications',
    );
    assertPresent(
      roleId,
      'DISCORD_TOURNAMENT_STREAMS_ROLE_ID',
      'Discord tournament stream notifications',
    );
    assertPresent(
      appBaseUrl,
      DISCORD_APP_BASE_URL_ENV_LABEL,
      'Discord tournament stream notifications',
    );
  }

  return {
    ...discordConfig,
    enabled: isConfigured,
    channelId,
    roleId,
    appBaseUrl: normalizeBaseUrl(appBaseUrl ?? ''),
  };
}
