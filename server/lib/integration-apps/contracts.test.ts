import { describe, expect, test } from 'bun:test';
import {
  integrationAppSchema,
  integrationAuthorizeSchema,
  integrationGameResultSchema,
  integrationRedirectUriSchema,
} from '../../../shared/types/integrationApp.ts';
import { isSensitiveAuthUrl } from '../../../shared/auth.ts';
import { integrationResultId, matchesIntegrationSecret, hashIntegrationSecret } from './crypto.ts';

describe('integration app contracts', () => {
  test('callbacks require HTTPS or exact loopback HTTP URLs', () => {
    for (const value of [
      'https://app.example/callback',
      'http://127.0.0.1:4567/callback',
      'http://[::1]:4567/callback',
    ])
      expect(integrationRedirectUriSchema.safeParse(value).success).toBe(true);
    for (const value of [
      'http://app.example/callback',
      'javascript:alert(1)',
      'https://user:pass@app.example',
      'https://app.example/callback#fragment',
      'http://127.0.0.1.evil.example/callback',
      'http://localhost.evil.example/callback',
    ])
      expect(integrationRedirectUriSchema.safeParse(value).success).toBe(false);
  });
  test('unknown and duplicate scopes are rejected', () => {
    const input = { name: 'Test', redirectUris: ['https://app.example/cb'] };
    expect(integrationAppSchema.safeParse({ ...input, scopes: ['admin'] }).success).toBe(false);
    expect(
      integrationAppSchema.safeParse({ ...input, scopes: ['profile:read', 'profile:read'] })
        .success,
    ).toBe(false);
    expect(integrationAuthorizeSchema.safeParse({ response_type: 'token' }).success).toBe(false);
  });
  test('client secret verification rejects an incorrect secret', () => {
    expect(matchesIntegrationSecret('secret', hashIntegrationSecret('secret'))).toBe(true);
    expect(matchesIntegrationSecret('other', hashIntegrationSecret('secret'))).toBe(false);
  });
  test('identities cannot collide across apps or object kinds', () => {
    const id = integrationResultId('app1', 'game', 'same');
    expect(id).not.toBe(integrationResultId('app2', 'game', 'same'));
    expect(id).not.toBe(integrationResultId('app1', 'match', 'same'));
  });
  test('game payloads cannot carry another user, source, tokens or arbitrary metrics', () => {
    const game = { gameId: 'one', playedAt: '2026-01-01T00:00:00Z', isWinner: null };
    expect(integrationGameResultSchema.safeParse(game).success).toBe(true);
    for (const key of ['userId', 'gameSource', 'accessToken', 'otherData', 'cardMetrics'])
      expect(integrationGameResultSchema.safeParse({ ...game, [key]: 'secret' }).success).toBe(
        false,
      );
  });
  test('telemetry excludes registration, token and consent URLs', () => {
    for (const url of [
      '/api/integration-apps/apps',
      '/api/integration-apps/token',
      '/settings/link/app?state=sensitive',
      '/auth/sign-in',
    ])
      expect(isSensitiveAuthUrl(url)).toBe(true);
    expect(isSensitiveAuthUrl('/decks')).toBe(false);
  });
});
