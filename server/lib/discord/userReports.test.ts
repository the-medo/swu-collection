import { expect, test } from 'bun:test';
import { getUserReportsDiscordConfig } from './config.ts';
import {
  buildUserReportDiscordPost,
  getUserReportDiscordIdentity,
  runUserReportDiscordAfterSave,
  type UserReportDiscordData,
} from './userReports.ts';
import type { DiscordNotification } from '../../db/schema/discord_notification.ts';

const config = {
  enabled: true,
  channelId: '1556212120612511795',
  roleId: '1350878582532214784',
  appBaseUrl: 'https://swubase.com',
  apiBaseUrl: 'https://discord.invalid/api/v10',
  botToken: 'test-token',
};
const data: UserReportDiscordData = {
  report: {
    id: crypto.randomUUID(),
    reporterUserId: 'reporter',
    reportedUserId: 'reported',
    reporterIdAtSubmission: 'reporter',
    reportedIdAtSubmission: 'reported',
    reporterDisplayName: 'Reporter',
    reportedDisplayName: 'Reported player',
    description: 'Harassment, with @everyone and <@&123> in the evidence.',
    clientReportId: crypto.randomUUID(),
    source: 'conversation',
    status: 'open',
    revision: 0,
    resolvedAt: null,
    createdAt: new Date('2026-10-04T09:00:00Z'),
  },
  history: {
    reporter: { sent: 4, received: 2, openReceived: 1 },
    reported: { sent: 3, received: 5, openReceived: 2 },
  },
  reporter: { id: 'reporter', displayName: 'Reporter' },
  reported: { id: 'reported', displayName: 'Reported player' },
};
function fixture() {
  const requests: { url: string; body: unknown }[] = [];
  const success: unknown[] = [],
    failed: unknown[] = [];
  let claimed = false;
  let messageId: string | null = null;
  let failSuccess = false;
  let claims = 0;
  const log = {
    claim: async () => {
      claims++;
      if (claimed) return { claimed: false as const, reason: 'Already sent' };
      claimed = true;
      const notification: DiscordNotification = {
        id: crypto.randomUUID(),
        ...getUserReportDiscordIdentity(data.report.id),
        scopeId: data.report.id,
        discordChannelId: config.channelId,
        discordMessageId: messageId,
        status: 'sending',
        error: null,
        payload: null,
        sentAt: null,
        createdAt: '',
        updatedAt: '',
      };
      return { claimed: true as const, notification, forced: false };
    },
    success: async (input: { discordMessageId: string }) => {
      if (failSuccess) {
        failSuccess = false;
        throw new Error('Private database details');
      }
      success.push(input);
      return undefined;
    },
    failed: async (input: { discordMessageId?: string }) => {
      failed.push(input);
      messageId = input.discordMessageId ?? null;
      claimed = false;
      return undefined;
    },
  };
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({
      id: 'thread',
      parent_id: config.channelId,
      type: 11,
      message: { id: 'starter', channel_id: 'thread' },
    });
  }) as typeof fetch;
  return {
    log,
    fetchFn,
    requests,
    success,
    failed,
    claims: () => claims,
    failSuccess: () => {
      failSuccess = true;
    },
  };
}
test('private forum payload includes reason, both users, stable report identity, and only the configured role ping', () => {
  const payload = buildUserReportDiscordPost(data, config);
  expect(payload.message.content).toBe(`<@&${config.roleId}> New user report`);
  expect(payload.message.allowed_mentions).toEqual({
    parse: [],
    roles: [config.roleId],
    users: [],
    replied_user: false,
  });
  const embed = payload.message.embeds![0]!;
  expect(embed.url).toBe(`https://swubase.com/admin?page=user-reports&reportId=${data.report.id}`);
  expect(embed.fields![0]!.value).toContain('reportUserId=reported');
  expect(embed.fields![1]!.value).toContain('reportUserId=reporter');
  expect(embed.fields![0]!.value).toContain('3 sent · 5 received (2 open)');
  expect(embed.fields![1]!.value).toContain('4 sent · 2 received (1 open)');
  expect(embed.description).toContain(`[Review report](${embed.url})`);
  expect(embed.fields![1]!.value).toContain('/users/reporter');
  expect(embed.description).not.toContain('@everyone');
  expect(embed.description).not.toContain('<@&');
  expect(embed.footer!.text).toContain(data.report.id);
  expect(
    buildUserReportDiscordPost(
      { ...data, reported: { id: 'reported', displayName: 'dark_vader\n@everyone' } },
      config,
    ).name,
  ).toBe('User report · dark_vader ＠everyone');
  expect(getUserReportDiscordIdentity(data.report.id).scopeKey).toBe(
    `user-report:${data.report.id}`,
  );
  const huge = buildUserReportDiscordPost(
    {
      ...data,
      report: { ...data.report, description: '@*'.repeat(1000) },
      reporter: { id: '漢'.repeat(200), displayName: '*'.repeat(2000) },
      reported: { id: '漢'.repeat(200), displayName: '*'.repeat(2000) },
    },
    config,
  );
  const e = huge.message.embeds![0]!;
  expect(huge.name.length).toBeLessThanOrEqual(100);
  expect(e.description!.length).toBeLessThanOrEqual(4096);
  for (const f of e.fields!) expect(f.value.length).toBeLessThanOrEqual(1024);
  expect(
    [e.title, e.description, e.footer?.text, ...e.fields!.flatMap(f => [f.name, f.value])].join('')
      .length,
  ).toBeLessThanOrEqual(6000);
});
test('dry runs and disabled delivery do not claim or contact Discord', async () => {
  const f = fixture();
  expect(
    await runUserReportDiscordAfterSave(data, {
      ...f,
      config: { ...config, enabled: false },
      dryRun: true,
    }),
  ).toEqual({
    status: 'dry-run',
    identity: getUserReportDiscordIdentity(data.report.id),
    payload: buildUserReportDiscordPost(data, config),
  });
  expect(
    (await runUserReportDiscordAfterSave(data, { ...f, config: { ...config, enabled: false } }))
      .status,
  ).toBe('skipped');
  expect(f.claims()).toBe(0);
  expect(f.requests).toHaveLength(0);
});
test('creates one forum thread without announcement crossposting and suppresses duplicates', async () => {
  const f = fixture();
  expect(await runUserReportDiscordAfterSave(data, { ...f, config })).toEqual({
    status: 'sent',
    discordMessageId: 'starter',
    channelId: config.channelId,
  });
  expect(f.requests).toEqual([
    {
      url: `${config.apiBaseUrl}/channels/${config.channelId}/threads`,
      body: buildUserReportDiscordPost(data, config),
    },
  ]);
  expect((await runUserReportDiscordAfterSave(data, { ...f, config })).status).toBe('skipped');
  expect(f.requests).toHaveLength(1);
});
test('keeps accepted message ID if recording success fails and redacts upstream failures', async () => {
  const f = fixture();
  f.failSuccess();
  expect((await runUserReportDiscordAfterSave(data, { ...f, config })).status).toBe('failed');
  expect(f.failed[0]).toMatchObject({ error: 'delivery-unconfirmed', discordMessageId: 'starter' });
  expect((await runUserReportDiscordAfterSave(data, { ...f, config })).status).toBe('sent');
  expect(f.requests).toHaveLength(1);
  const bad = fixture();
  const result = await runUserReportDiscordAfterSave(data, {
    ...bad,
    config,
    fetchFn: (async () =>
      new Response('private report and token', { status: 403 })) as typeof fetch,
  });
  expect(result).toEqual({ status: 'failed', error: 'discord-403' });
  expect(JSON.stringify(bad.failed)).not.toContain('private report and token');
});
test('configuration is explicitly enabled, uses the resource-submission role, and never falls back to another channel', () => {
  const previous = { ...process.env };
  try {
    for (const name of Object.keys(process.env))
      if (name.startsWith('DISCORD_')) delete process.env[name];
    process.env.DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID = config.roleId;
    process.env.DISCORD_RESOURCE_SUBMISSIONS_CHANNEL_ID = '1555341906811027546';
    expect(getUserReportsDiscordConfig()).toMatchObject({
      enabled: false,
      channelId: undefined,
      roleId: config.roleId,
    });
    process.env.DISCORD_USER_REPORTS_ENABLED = 'true';
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    expect(() => getUserReportsDiscordConfig()).toThrow('DISCORD_USER_REPORTS_CHANNEL_ID');
    process.env.DISCORD_USER_REPORTS_CHANNEL_ID = config.channelId;
    process.env.DISCORD_APP_BASE_URL = config.appBaseUrl;
    expect(getUserReportsDiscordConfig()).toMatchObject({
      enabled: true,
      channelId: config.channelId,
      roleId: config.roleId,
    });
    delete process.env.DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID;
    expect(() => getUserReportsDiscordConfig()).toThrow('DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID');
  } finally {
    process.env = previous;
  }
});
