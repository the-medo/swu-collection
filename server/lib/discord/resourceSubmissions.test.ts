import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { getResourceSubmissionsDiscordConfig } from './config.ts';
import * as log from './notificationLog.ts';
import {
  buildResourceSubmissionDiscordPost,
  getResourceSubmissionDiscordIdentity,
  runResourceSubmissionDiscordAfterSave,
  type ResourceSubmissionDiscordData,
} from './resourceSubmissions.ts';
import type { DiscordNotification } from '../../db/schema/discord_notification.ts';

const config = {
  enabled: true,
  apiBaseUrl: 'https://discord.example/api/v10',
  botToken: 'test-token',
  channelId: '1555341906811027546',
  roleId: '1350878582532214784',
  appBaseUrl: 'https://swubase.example',
};
const data: ResourceSubmissionDiscordData = {
  resource: {
    id: '12345678-1234-4123-8123-123456789012',
    tournamentId: '12345678-1234-4123-8123-123456789013',
    userId: 'submitter',
    resourceType: 'stream',
    resourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    title: 'Feature match stream',
    description: 'English commentary',
    approved: false,
    createdAt: '2026-10-02 12:30:00',
    updatedAt: '2026-10-02 12:30:00.123456',
  },
  tournament: {
    id: '12345678-1234-4123-8123-123456789013',
    name: 'Paris PQ',
    location: 'FR',
    date: new Date('2026-10-03T00:00:00Z'),
  },
  weekend: { id: 'weekend', name: 'October weekend', date: '2026-10-03' },
  submitter: { id: 'submitter', displayName: 'Player One' },
};
const notification: DiscordNotification = {
  id: 'notification',
  ...getResourceSubmissionDiscordIdentity(data.resource.id),
  scopeId: data.resource.id,
  discordChannelId: config.channelId,
  discordMessageId: null,
  status: 'sending',
  error: null,
  payload: null,
  sentAt: null,
  createdAt: data.resource.createdAt,
  updatedAt: data.resource.updatedAt,
};

const restorers: Array<() => void> = [];
afterEach(() => {
  restorers
    .splice(0)
    .reverse()
    .forEach(restore => restore());
});

function deliveryFixture() {
  const claim = spyOn(log, 'claimNotificationForSend').mockResolvedValue({
    claimed: true,
    notification,
    forced: false,
  });
  const success = spyOn(log, 'markNotificationSuccess').mockResolvedValue(undefined);
  const failed = spyOn(log, 'markNotificationFailed').mockResolvedValue(undefined);
  const consoleError = spyOn(console, 'error').mockImplementation(() => {});
  restorers.push(
    () => claim.mockRestore(),
    () => success.mockRestore(),
    () => failed.mockRestore(),
    () => consoleError.mockRestore(),
  );
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn = (async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json({
      id: 'thread',
      parent_id: config.channelId,
      type: 11,
      message: { id: 'starter', channel_id: 'thread' },
    });
  }) as typeof fetch;
  return { claim, success, failed, requests, fetchFn };
}

describe('resource submission forum post', () => {
  test('includes review context, links, submitter, notes, timestamp and video preview', () => {
    const post = buildResourceSubmissionDiscordPost(data, config);
    expect(post.name).toBe('YouTube · Paris PQ');
    expect(post.message.content).toBe(`<@&${config.roleId}> New resource submission`);
    expect(post.message.allowed_mentions).toEqual({
      parse: [],
      roles: [config.roleId],
      users: [],
      replied_user: false,
    });
    const embed = post.message.embeds![0]!;
    expect(embed.url).toBe(data.resource.resourceUrl);
    expect(embed.title).toBe('Feature match stream');
    expect(embed.description).toContain('English commentary');
    expect(embed.description).toContain(`/tournaments/${data.tournament.id}`);
    expect(embed.description).toContain('/admin?page=resource-submissions');
    expect(embed.fields).toContainEqual({
      name: 'Submitted by',
      value: 'Player One\nUser ID: submitter',
    });
    expect(embed.fields).toContainEqual({
      name: 'Status',
      value: 'Pending admin review',
      inline: true,
    });
    expect(embed.fields).toContainEqual({ name: 'Weekend', value: 'October weekend (2026-10-03)' });
    expect(embed.fields).toContainEqual({
      name: 'Submitted at (UTC)',
      value: '2026-10-02 12:30:00',
      inline: true,
    });
    expect(embed.image?.url).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
    expect(embed.footer?.text).toContain(data.resource.id);
  });

  test('Melee submissions have their ID and link without a video image', () => {
    const post = buildResourceSubmissionDiscordPost(
      {
        ...data,
        resource: {
          ...data.resource,
          resourceType: 'melee',
          resourceUrl: 'https://melee.gg/Tournament/View/123456',
          title: null,
          description: null,
          approved: true,
        },
      },
      config,
    );
    expect(post.name).toBe('Melee ID · Paris PQ');
    expect(post.message.embeds![0]!.image).toBeUndefined();
    expect(post.message.embeds![0]!.fields).toContainEqual({
      name: 'Melee ID',
      value: '123456',
      inline: true,
    });
    expect(post.message.embeds![0]!.fields).toContainEqual({
      name: 'Status',
      value: 'Already approved',
      inline: true,
    });
  });

  test('handles supported YouTube URL forms without fetching user-provided URLs', () => {
    for (const url of [
      'https://youtu.be/abcdefghijk',
      'https://www.youtube.com/live/abcdefghijk',
      'https://youtube.com/shorts/abcdefghijk',
      'https://youtube.com/embed/abcdefghijk',
    ]) {
      const post = buildResourceSubmissionDiscordPost(
        { ...data, resource: { ...data.resource, resourceUrl: url } },
        config,
      );
      expect(post.message.embeds![0]!.image?.url).toBe(
        'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
      );
    }
  });

  test('bounds Discord text and prevents user content from adding pings', () => {
    const hostile = '@everyone <@&999999999999999999> *_test_* '.repeat(200);
    const post = buildResourceSubmissionDiscordPost(
      {
        ...data,
        resource: { ...data.resource, title: hostile, description: hostile },
        tournament: { ...data.tournament, name: hostile, location: hostile },
        weekend: { ...data.weekend, name: hostile },
        submitter: { id: hostile, displayName: hostile },
      },
      config,
    );
    expect(post.name.length).toBeLessThanOrEqual(100);
    const embed = post.message.embeds![0]!;
    expect(embed.title!.length).toBeLessThanOrEqual(256);
    expect(embed.description!.length).toBeLessThanOrEqual(4096);
    for (const field of embed.fields!) expect(field.value.length).toBeLessThanOrEqual(1024);
    const text = [
      embed.title!,
      embed.description!,
      embed.footer!.text,
      ...embed.fields!.flatMap(f => [f.name, f.value]),
    ].join('');
    expect(text.length).toBeLessThanOrEqual(6000);
    expect(text).not.toContain('@everyone');
    expect(text).not.toContain('<@&');
  });
});

describe('resource submission delivery', () => {
  test('incomplete dry-run configuration gives an actionable error without a send', async () => {
    const f = deliveryFixture();
    for (const key of ['roleId', 'appBaseUrl'] as const) {
      const result = await runResourceSubmissionDiscordAfterSave(data, {
        config: { ...config, [key]: '' },
        dryRun: true,
        fetchFn: f.fetchFn,
      });
      expect(result).toMatchObject({
        status: 'failed',
        error: expect.stringContaining(
          key === 'roleId' ? 'DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID' : 'DISCORD_APP_BASE_URL',
        ),
      });
    }
    expect(f.claim).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
  });

  test('dry run includes stable identity without claiming or sending, even when disabled', async () => {
    const f = deliveryFixture();
    const result = await runResourceSubmissionDiscordAfterSave(data, {
      config: { ...config, enabled: false },
      dryRun: true,
      fetchFn: f.fetchFn,
    });
    expect(result).toEqual({
      status: 'dry-run',
      identity: getResourceSubmissionDiscordIdentity(data.resource.id),
      payload: buildResourceSubmissionDiscordPost(data, config),
    });
    expect(f.claim).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
  });

  test('disabled delivery does not claim or contact Discord', async () => {
    const f = deliveryFixture();
    expect(
      (
        await runResourceSubmissionDiscordAfterSave(data, {
          config: { ...config, enabled: false },
          fetchFn: f.fetchFn,
        })
      ).status,
    ).toBe('skipped');
    expect(f.claim).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
  });

  test('creates one forum thread, records its starter message and suppresses a duplicate', async () => {
    const f = deliveryFixture();
    expect(
      await runResourceSubmissionDiscordAfterSave(data, { config, fetchFn: f.fetchFn }),
    ).toEqual({ status: 'sent', discordMessageId: 'starter', channelId: config.channelId });
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.url).toBe(`${config.apiBaseUrl}/channels/${config.channelId}/threads`);
    expect(JSON.parse(String(f.requests[0]!.init!.body))).toEqual(
      buildResourceSubmissionDiscordPost(data, config),
    );
    expect(f.claim).toHaveBeenCalledWith({
      ...getResourceSubmissionDiscordIdentity(data.resource.id),
      discordChannelId: config.channelId,
      payload: buildResourceSubmissionDiscordPost(data, config),
    });
    expect(f.success).toHaveBeenCalledWith(
      expect.objectContaining({ discordMessageId: 'starter' }),
    );
    f.claim.mockResolvedValue({ claimed: false, reason: 'Already sent' });
    expect(
      (await runResourceSubmissionDiscordAfterSave(data, { config, fetchFn: f.fetchFn })).status,
    ).toBe('skipped');
    expect(f.requests).toHaveLength(1);
  });

  test('records permission/rate-limit failures without propagating them or saving response bodies', async () => {
    const f = deliveryFixture();
    for (const status of [403, 429]) {
      const result = await runResourceSubmissionDiscordAfterSave(data, {
        config,
        fetchFn: (async () =>
          new Response('private upstream body', { status })) as unknown as typeof fetch,
      });
      expect(result).toEqual({ status: 'failed', error: `discord-${status}` });
      expect(f.failed).toHaveBeenCalledWith(
        expect.objectContaining({ error: `discord-${status}` }),
      );
      expect(f.success).not.toHaveBeenCalled();
    }
  });

  test('preserves the accepted message ID when persistence fails and reuses it on retry', async () => {
    const f = deliveryFixture();
    f.success.mockRejectedValueOnce(new Error('Database unavailable'));
    expect(
      (await runResourceSubmissionDiscordAfterSave(data, { config, fetchFn: f.fetchFn })).status,
    ).toBe('failed');
    expect(f.failed).toHaveBeenCalledWith(expect.objectContaining({ discordMessageId: 'starter' }));
    f.claim.mockResolvedValue({
      claimed: true,
      forced: false,
      notification: { ...notification, discordMessageId: 'starter' },
    });
    expect(
      (await runResourceSubmissionDiscordAfterSave(data, { config, fetchFn: f.fetchFn })).status,
    ).toBe('sent');
    expect(f.requests).toHaveLength(1);
  });

  test('claim failures and failure-log outages remain best effort', async () => {
    const f = deliveryFixture();
    f.claim.mockRejectedValueOnce(new Error('Database unavailable'));
    expect(
      (await runResourceSubmissionDiscordAfterSave(data, { config, fetchFn: f.fetchFn })).status,
    ).toBe('failed');
    f.failed.mockRejectedValueOnce(new Error('Database unavailable'));
    expect(
      (
        await runResourceSubmissionDiscordAfterSave(data, {
          config,
          fetchFn: (async () => {
            throw new Error('Network unavailable');
          }) as unknown as typeof fetch,
        })
      ).status,
    ).toBe('failed');
  });
});

test('configuration requires explicit enablement, channel and role and never falls back to public channels', () => {
  const original = { ...process.env };
  restorers.push(() => {
    process.env = original;
  });
  for (const key of Object.keys(process.env))
    if (key.startsWith('DISCORD_')) delete process.env[key];
  process.env.DISCORD_TOURNAMENT_STREAMS_CHANNEL_ID = config.channelId;
  process.env.DISCORD_TOURNAMENT_STREAMS_ROLE_ID = config.roleId;
  expect(getResourceSubmissionsDiscordConfig()).toMatchObject({
    enabled: false,
    channelId: undefined,
    roleId: undefined,
  });
  process.env.DISCORD_RESOURCE_SUBMISSIONS_ENABLED = 'true';
  expect(() => getResourceSubmissionsDiscordConfig()).toThrow('DISCORD_BOT_TOKEN');
  process.env.DISCORD_BOT_TOKEN = config.botToken;
  expect(() => getResourceSubmissionsDiscordConfig()).toThrow(
    'DISCORD_RESOURCE_SUBMISSIONS_CHANNEL_ID',
  );
  process.env.DISCORD_RESOURCE_SUBMISSIONS_CHANNEL_ID = config.channelId;
  expect(() => getResourceSubmissionsDiscordConfig()).toThrow(
    'DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID',
  );
  process.env.DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID = config.roleId;
  process.env.DISCORD_APP_BASE_URL = config.appBaseUrl;
  expect(getResourceSubmissionsDiscordConfig()).toMatchObject({
    enabled: true,
    channelId: config.channelId,
    roleId: config.roleId,
    appBaseUrl: config.appBaseUrl,
  });
  process.env.DISCORD_APP_BASE_URL = 'ftp://swubase.example';
  expect(() => getResourceSubmissionsDiscordConfig()).toThrow('HTTP(S) app origin');
});
