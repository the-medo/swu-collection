import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import type {
  IntegrationAppCredentials,
  IntegrationAppInput,
  IntegrationGameResultInput,
} from '../../../shared/types/integrationApp.ts';
import { createIntegrationAppsRoute } from '../../routes/integration-apps.ts';
import type { integrationAppService } from './service.ts';

export const registration: IntegrationAppInput = {
  name: 'Fixture app',
  description: 'Offline game client',
  redirectUris: ['https://app.example/callback'],
  scopes: ['profile:read', 'game-results:write'],
};

export const game: IntegrationGameResultInput = {
  gameId: 'external-game',
  matchId: 'external-match',
  playedAt: '2026-01-02T14:00:00+02:00',
  baseCardKey: 'capital-city',
  leaderCardId: 'unknown-test-leader',
  gameNumber: 1,
  isWinner: true,
};

type Tokens = Awaited<ReturnType<typeof integrationAppService.exchange>>;

function createFixture() {
  const owner = crypto.randomUUID();
  const player = crypto.randomUUID();
  const otherPlayer = crypto.randomUUID();
  const users = [owner, player, otherPlayer];
  let account: string | null = null;
  // Each case gets independent accounts, route middleware and rate-limit state.
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        account ? ({ id: account } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route('/api/integration-apps', createIntegrationAppsRoute());
  const signIn = (id: string | null) => {
    account = id;
  };
  const request = (path: string, method = 'GET', body?: unknown, access?: string, csrf = true) =>
    app.request('/api/integration-apps' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const authRequest = (clientId: string, scope = 'profile:read game-results:write') => ({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: registration.redirectUris[0]!,
    scope,
    state: 'random-state-long-enough',
  });
  const approve = async (clientId: string, scope?: string) => {
    const response = await request('/authorize', 'POST', {
      ...authRequest(clientId, scope),
      accept: true,
    });
    expect(response.status).toBe(200);
    const redirect = new URL((await response.json()).data.redirectUrl);
    expect(redirect.searchParams.get('state')).toBe('random-state-long-enough');
    return redirect.searchParams.get('code')!;
  };
  const exchange = (clientId: string, clientSecret: string, code: string) =>
    request('/token', 'POST', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: registration.redirectUris[0],
    });
  const register = async (
    overrides: Partial<IntegrationAppInput> = {},
  ): Promise<IntegrationAppCredentials> => {
    signIn(owner);
    const response = await request('/apps', 'POST', { ...registration, ...overrides });
    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    return (await response.json()).data;
  };
  const connect = async (
    app: IntegrationAppCredentials,
    scope?: string,
    userId = player,
  ): Promise<Tokens> => {
    signIn(userId);
    const response = await exchange(
      app.app.clientId,
      app.clientSecret,
      await approve(app.app.clientId, scope),
    );
    expect(response.status).toBe(200);
    return response.json();
  };
  const refresh = (app: IntegrationAppCredentials, token: Pick<Tokens, 'refresh_token'>) =>
    request('/token', 'POST', {
      grant_type: 'refresh_token',
      client_id: app.app.clientId,
      client_secret: app.clientSecret,
      refresh_token: token.refresh_token,
    });
  return {
    users,
    owner,
    player,
    otherPlayer,
    signIn,
    request,
    authRequest,
    approve,
    exchange,
    register,
    connect,
    refresh,
  };
}

export function integrationTest(
  name: string,
  run: (fixture: ReturnType<typeof createFixture>) => Promise<void>,
) {
  test.skipIf(process.env.INTEGRATION_APPS_DB_TEST !== '1')(
    name,
    async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
        throw new Error('Use an isolated worktree database.');
      const fixture = createFixture();
      try {
        await db.insert(user).values(
          fixture.users.map(id => ({
            id,
            name: 'App test',
            displayName: id,
            email: `${id}@invalid.local`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            currency: 'USD',
          })),
        );
        await run(fixture);
      } finally {
        await db.delete(deck).where(inArray(deck.userId, fixture.users));
        await db.delete(user).where(inArray(user.id, fixture.users));
      }
    },
    30_000,
  );
}
