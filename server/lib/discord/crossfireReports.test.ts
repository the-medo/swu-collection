import { expect, test } from 'bun:test';
import { buildCrossfireReportPost } from './crossfireReports.ts';
import { getCrossfireReportsDiscordConfig } from './config.ts';

test('forum post has a bounded name and note, private app link and no parsed mentions', () => {
  const report = {
    id: '1ec5c1a8-cd19-4576-997f-48c0154a4585',
    label: 'A'.repeat(200),
    description: '@everyone '.repeat(500),
  };
  const post = buildCrossfireReportPost(report, 'https://app.example');
  expect(post.name.length).toBe(100);
  const payload = post.message;
  expect(payload.allowed_mentions).toEqual({
    parse: [],
    users: [],
    roles: [],
    replied_user: false,
  });
  expect(payload.embeds?.[0]?.title?.length).toBe(120);
  expect(payload.embeds?.[0]?.description?.length).toBe(3000);
  expect(payload.embeds?.[0]?.url).toBe(`https://app.example/crossfire/reports/${report.id}`);
  // The forum endpoint does not support Create Message's nonce fields.
  expect(payload).not.toHaveProperty('nonce');
  expect(payload).not.toHaveProperty('enforce_nonce');
  expect(buildCrossfireReportPost({ ...report, label: '  ' }, 'https://app.example').name).toBe(
    'Game problem',
  );
});

test('reports require a separately enabled and explicitly configured channel and origin', () => {
  const keys = [
    'DISCORD_CROSSFIRE_REPORTS_ENABLED',
    'DISCORD_CROSSFIRE_REPORTS_CHANNEL_ID',
    'DISCORD_CROSSFIRE_REPORTS_APP_BASE_URL',
    'DISCORD_BOT_TOKEN',
  ];
  const before = keys.map(k => process.env[k]);
  try {
    keys.forEach(k => delete process.env[k]);
    expect(getCrossfireReportsDiscordConfig().enabled).toBe(false);
    process.env.DISCORD_CROSSFIRE_REPORTS_ENABLED = 'true';
    expect(() => getCrossfireReportsDiscordConfig()).toThrow('DISCORD_BOT_TOKEN');
    process.env.DISCORD_BOT_TOKEN = 'synthetic-token';
    expect(() => getCrossfireReportsDiscordConfig()).toThrow('CHANNEL_ID');
    process.env.DISCORD_CROSSFIRE_REPORTS_CHANNEL_ID = '123456789012345678';
    expect(() => getCrossfireReportsDiscordConfig()).toThrow('APP_BASE_URL');
    process.env.DISCORD_CROSSFIRE_REPORTS_APP_BASE_URL = 'https://app.example';
    expect(getCrossfireReportsDiscordConfig().enabled).toBe(true);
    process.env.DISCORD_CROSSFIRE_REPORTS_APP_BASE_URL = 'https://user:pass@app.example';
    expect(() => getCrossfireReportsDiscordConfig()).toThrow('APP_BASE_URL');
  } finally {
    keys.forEach((k, i) => {
      if (before[i] === undefined) delete process.env[k];
      else process.env[k] = before[i];
    });
  }
});
