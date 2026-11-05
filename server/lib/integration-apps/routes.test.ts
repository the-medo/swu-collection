import { expect, test } from 'bun:test';
import { createIntegrationAppsRoute } from '../../routes/integration-apps.ts';
import { IntegrationAppError, integrationAppService } from './service.ts';
import { createIntegrationRateLimiter } from './rateLimit.ts';

test('token attempts are bounded and credential-bearing errors never escape', async () => {
  const app = createIntegrationAppsRoute({
    ...integrationAppService,
    exchange: async () => {
      throw new IntegrationAppError('Invalid client credentials.', 401);
    },
  });
  const request = (clientId: string, refreshToken = 'fixture-refresh') =>
    app.request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: 'fixture-secret',
        refresh_token: refreshToken,
      }),
    });
  for (let i = 0; i < 120; i++) expect((await request('client1')).status).toBe(401);
  const limited = await request('client1');
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBe('60');
  expect(limited.headers.get('Cache-Control')).toContain('no-store');
  expect((await request('client2')).status).toBe(401);
  expect((await request('client1', 'different-private-credential')).status).toBe(401);

  const broken = createIntegrationAppsRoute({
    ...integrationAppService,
    exchange: async () => {
      throw new Error('DB query parameters contain confidential fixture values');
    },
  });
  const response = await broken.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: 'client',
      client_secret: 'fixture-secret',
      refresh_token: 'fixture-refresh',
    }),
  });
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('confidential fixture values');
});

test('random credential buckets never prevent a new legitimate caller and limits expire', () => {
  const limit = createIntegrationRateLimiter(3);
  for (let i = 0; i < 20; i++) limit(`random-${i}`, 1000);
  expect(() => limit('legitimate', 1000)).not.toThrow();
  for (let i = 1; i < 120; i++) limit('legitimate', 1000);
  expect(() => limit('legitimate', 1000)).toThrow('Too many requests');
  expect(() => limit('another-legitimate', 1000)).not.toThrow();
  expect(() => limit('legitimate', 61_001)).not.toThrow();
});

test.each(['authorization_code', 'refresh_token'] as const)(
  '%s attempts for players of the same app do not share the pre-authentication limit',
  async grantType => {
    const app = createIntegrationAppsRoute({
      ...integrationAppService,
      exchange: async () => {
        throw new IntegrationAppError('Invalid token.');
      },
    });
    const request = (credential: string) =>
      app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: grantType,
          client_id: 'shared-app',
          client_secret: 'shared-secret',
          ...(grantType === 'authorization_code'
            ? { code: credential, redirect_uri: 'https://app.example/callback' }
            : { refresh_token: credential }),
        }),
      });
    for (let i = 0; i < 120; i++) expect((await request('player-one')).status).toBe(400);
    expect((await request('player-one')).status).toBe(429);
    expect((await request('player-two')).status).toBe(400);
  },
);
