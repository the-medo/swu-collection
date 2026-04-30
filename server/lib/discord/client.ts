import { getDiscordConfig, normalizeDiscordBaseUrl } from './config.ts';
import type {
  DiscordConfig,
  DiscordCreateMessagePayload,
  DiscordMessageResponse,
} from './types.ts';

type SendDiscordChannelMessageInput = {
  channelId: string;
  payload: DiscordCreateMessagePayload;
  config?: DiscordConfig;
  fetchFn?: typeof fetch;
};

export class DiscordApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'DiscordApiError';
    this.status = status;
    this.body = body;
  }
}

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getErrorMessage(status: number, body: string) {
  const trimmedBody = body.trim();
  return trimmedBody
    ? `Discord message failed: ${status} ${trimmedBody}`
    : `Discord message failed: ${status}`;
}

export async function sendDiscordChannelMessage({
  channelId,
  payload,
  config = getDiscordConfig({ requireBotToken: true }),
  fetchFn = fetch,
}: SendDiscordChannelMessageInput): Promise<DiscordMessageResponse> {
  if (!config.botToken) {
    throw new Error('DISCORD_BOT_TOKEN is required for Discord API requests.');
  }

  const response = await fetchFn(
    `${normalizeDiscordBaseUrl(config.apiBaseUrl)}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new DiscordApiError(getErrorMessage(response.status, body), response.status, body);
  }

  return (await response.json()) as DiscordMessageResponse;
}
