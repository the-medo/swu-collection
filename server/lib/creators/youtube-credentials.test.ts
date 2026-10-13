import { expect, test } from 'bun:test';
import { exchangeYoutubeToken, YoutubeAccessRevoked } from './youtube-credentials.ts';

test('only definitive OAuth revocation requires reconnect; outages/configuration errors retain access', async () => {
  const original = globalThis.fetch;
  const keys = [
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'YOUTUBE_TOKEN_ENCRYPTION_KEY',
    'BETTER_AUTH_URL',
  ] as const;
  const env = keys.map(key => process.env[key]);
  Object.assign(process.env, {
    YOUTUBE_CLIENT_ID: 'fixture',
    YOUTUBE_CLIENT_SECRET: 'fixture',
    YOUTUBE_TOKEN_ENCRYPTION_KEY: 'aa'.repeat(32),
    BETTER_AUTH_URL: 'https://example.com',
  });
  try {
    for (const [status, error, revoked] of [
      [400, 'invalid_grant', true],
      [400, 'invalid_client', false],
      [429, 'quota', false],
      [500, 'invalid_grant', false],
    ] as const) {
      globalThis.fetch = (async () =>
        Response.json({ error }, { status })) as unknown as typeof fetch;
      let caught: unknown;
      try {
        await exchangeYoutubeToken({ grant_type: 'refresh_token', refresh_token: 'secret' });
      } catch (error) {
        caught = error;
      }
      expect(caught instanceof YoutubeAccessRevoked).toBe(revoked);
      expect(String(caught)).not.toContain('secret');
    }
    globalThis.fetch = (async () =>
      Response.json({
        access_token: 'new',
        expires_in: 3600,
        scope: 'openid',
      })) as unknown as typeof fetch;
    await expect(
      exchangeYoutubeToken({ grant_type: 'refresh_token', refresh_token: 'secret' }),
    ).rejects.toBeInstanceOf(YoutubeAccessRevoked);
    await expect(
      exchangeYoutubeToken({ grant_type: 'authorization_code', code: 'code' }),
    ).rejects.toMatchObject({ status: 403, message: 'YouTube read access was not granted.' });
  } finally {
    globalThis.fetch = original;
    keys.forEach((key, index) => {
      if (env[index] === undefined) delete process.env[key];
      else process.env[key] = env[index];
    });
  }
});
