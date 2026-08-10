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

type CrosspostDiscordChannelMessageInput = {
  channelId: string;
  messageId: string;
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

export class DiscordCrosspostError extends Error {
  channelId: string;
  messageId: string;
  status?: number;
  body?: string;

  constructor(error: unknown, channelId: string, messageId: string) {
    super(error instanceof Error ? error.message : String(error));
    this.name = 'DiscordCrosspostError';
    this.channelId = channelId;
    this.messageId = messageId;

    if (error instanceof DiscordApiError) {
      this.status = error.status;
      this.body = error.body;
    }
  }
}

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getErrorMessage(operation: string, status: number, body: string) {
  const trimmedBody = body.trim();
  return trimmedBody
    ? `Discord ${operation} failed: ${status} ${trimmedBody}`
    : `Discord ${operation} failed: ${status}`;
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
    throw new DiscordApiError(
      getErrorMessage('message send', response.status, body),
      response.status,
      body,
    );
  }

  const message = (await response.json()) as DiscordMessageResponse;

  try {
    await crosspostDiscordChannelMessage({
      channelId,
      messageId: message.id,
      config,
      fetchFn,
    });
  } catch (error) {
    throw new DiscordCrosspostError(error, channelId, message.id);
  }

  return message;
}

export async function crosspostDiscordChannelMessage({
  channelId,
  messageId,
  config = getDiscordConfig({ requireBotToken: true }),
  fetchFn = fetch,
}: CrosspostDiscordChannelMessageInput): Promise<DiscordMessageResponse> {
  if (!config.botToken) {
    throw new Error('DISCORD_BOT_TOKEN is required for Discord API requests.');
  }

  const response = await fetchFn(
    `${normalizeDiscordBaseUrl(config.apiBaseUrl)}/channels/${channelId}/messages/${messageId}/crosspost`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${config.botToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new DiscordApiError(
      getErrorMessage('message crosspost', response.status, body),
      response.status,
      body,
    );
  }

  return (await response.json()) as DiscordMessageResponse;
}
