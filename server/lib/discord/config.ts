import type { DiscordConfig, TournamentResultsDiscordConfig } from './types.ts';

const DEFAULT_DISCORD_API_BASE_URL = 'https://discord.com/api/v10';

type DiscordConfigOptions = {
  requireBotToken?: boolean;
};

type TournamentResultsDiscordConfigOptions = {
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

function assertPresent(value: string | undefined, envName: string): asserts value is string {
  if (!value) {
    throw new Error(`${envName} is required for Discord tournament results notifications.`);
  }
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
  const appBaseUrl = readStringEnv('DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL');

  if (shouldRequireConfig) {
    assertPresent(channelId, 'DISCORD_TOURNAMENT_RESULTS_CHANNEL_ID');
    assertPresent(roleId, 'DISCORD_TOURNAMENT_RESULTS_ROLE_ID');
    assertPresent(appBaseUrl, 'DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL');

    if (!appBaseUrl && !isLocalEnvironment()) {
      throw new Error(
        'DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL or an existing public app URL env is required outside local development.',
      );
    }
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
