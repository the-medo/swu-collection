import { describe, expect, test } from 'bun:test';
import { DiscordCrosspostError, sendDiscordChannelMessage } from './client.ts';

const config = {
  apiBaseUrl: 'https://discord.example/api/v10',
  botToken: 'test-token',
};

describe('sendDiscordChannelMessage', () => {
  test('crossposts a successfully created message', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });

      return Response.json({
        id: 'message-456',
        channel_id: 'channel-123',
        timestamp: '2026-08-09T10:00:00.000Z',
      });
    }) as unknown as typeof fetch;

    const message = await sendDiscordChannelMessage({
      channelId: 'channel-123',
      payload: { content: 'Tournament results are in!' },
      config,
      fetchFn,
    });

    expect(message.id).toBe('message-456');
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      url: 'https://discord.example/api/v10/channels/channel-123/messages',
      init: {
        method: 'POST',
        headers: {
          Authorization: 'Bot test-token',
          'Content-Type': 'application/json',
        },
      },
    });
    expect(requests[1]).toMatchObject({
      url: 'https://discord.example/api/v10/channels/channel-123/messages/message-456/crosspost',
      init: {
        method: 'POST',
        headers: {
          Authorization: 'Bot test-token',
        },
      },
    });
  });

  test('reports a failed crosspost', async () => {
    let requestCount = 0;
    const fetchFn = (async () => {
      requestCount += 1;

      return requestCount === 1
        ? Response.json({ id: 'message-456', channel_id: 'channel-123' })
        : new Response('Missing Permissions', { status: 403 });
    }) as unknown as typeof fetch;

    await expect(
      sendDiscordChannelMessage({
        channelId: 'channel-123',
        payload: { content: 'Tournament results are in!' },
        config,
        fetchFn,
      }),
    ).rejects.toMatchObject({
      name: 'DiscordCrosspostError',
      status: 403,
      messageId: 'message-456',
      message: 'Discord message crosspost failed: 403 Missing Permissions',
    });
  });

  test('preserves the message id when crossposting has a network failure', async () => {
    let requestCount = 0;
    const fetchFn = (async () => {
      requestCount += 1;

      if (requestCount === 1) {
        return Response.json({ id: 'message-456', channel_id: 'channel-123' });
      }

      throw new TypeError('Network timeout');
    }) as unknown as typeof fetch;

    await expect(
      sendDiscordChannelMessage({
        channelId: 'channel-123',
        payload: { content: 'Tournament results are in!' },
        config,
        fetchFn,
      }),
    ).rejects.toMatchObject({
      name: 'DiscordCrosspostError',
      messageId: 'message-456',
      message: 'Network timeout',
    });
  });
});
