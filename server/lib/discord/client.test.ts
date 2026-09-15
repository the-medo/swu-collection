import { describe, expect, test } from 'bun:test';
import {
  DiscordCrosspostError,
  sendDiscordChannelMessage,
  sendDiscordForumPost,
} from './client.ts';

const config = {
  apiBaseUrl: 'https://discord.example/api/v10',
  botToken: 'test-token',
};

describe('sendDiscordForumPost', () => {
  const payload = {
    name: 'Unexpected damage',
    message: { content: 'Report', allowed_mentions: { parse: [] } },
  };
  test('creates one post with a starter message and validates the returned thread', async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    const fetchFn = (async (url, init) => {
      requests.push({ url: String(url), init });
      return Response.json({
        id: 'thread',
        parent_id: 'forum',
        type: 11,
        message: { id: 'first', channel_id: 'thread' },
      });
    }) as typeof fetch;
    const post = await sendDiscordForumPost({ channelId: 'forum', payload, config, fetchFn });
    expect(post.message.id).toBe('first');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://discord.example/api/v10/channels/forum/threads',
      init: { method: 'POST', headers: { Authorization: 'Bot test-token' } },
    });
    expect(JSON.parse(String(requests[0]!.init!.body))).toEqual(payload);
    expect(requests[0]!.init!.signal).toBeInstanceOf(AbortSignal);
  });
  test('preserves API status for retry handling and rejects mismatched responses', async () => {
    await expect(
      sendDiscordForumPost({
        channelId: 'forum',
        payload,
        config,
        fetchFn: (async () => Response.json({ retry_after: 120 }, { status: 429 })) as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 429 });
    for (const response of [
      {
        id: 'thread',
        parent_id: 'other',
        type: 11,
        message: { id: 'first', channel_id: 'thread' },
      },
      { id: 'thread', parent_id: 'forum', type: 11, message: { id: 'first', channel_id: 'other' } },
      { id: 'thread', parent_id: 'forum', type: 11 },
    ])
      await expect(
        sendDiscordForumPost({
          channelId: 'forum',
          payload,
          config,
          fetchFn: (async () => Response.json(response)) as typeof fetch,
        }),
      ).rejects.toThrow('Invalid Discord forum post response');
  });
});

describe('sendDiscordChannelMessage', () => {
  test('sends private text-channel notifications without publishing', async () => {
    let calls = 0;
    const fetchFn = (async () => {
      calls++;
      return Response.json({ id: 'm', channel_id: 'c' });
    }) as unknown as typeof fetch;
    await sendDiscordChannelMessage({
      channelId: 'c',
      payload: { content: 'Report', allowed_mentions: { parse: [] } },
      publish: false,
      config,
      fetchFn,
    });
    expect(calls).toBe(1);
  });
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
      publish: true,
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
        publish: true,
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
        publish: true,
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
