import { expect } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { integrationAppCode, integrationAppConnection } from '../../db/schema/integration_app.ts';
import { game, integrationTest } from './test-fixture.ts';

integrationTest(
  'authorization-code exchange and refresh always require the app’s secret',
  async f => {
    const app = await f.register();
    f.signIn(f.player);
    const code = await f.approve(app.app.clientId);
    for (const clientSecret of [undefined, '', 'wrong-secret']) {
      expect(
        (
          await f.request('/token', 'POST', {
            grant_type: 'authorization_code',
            client_id: app.app.clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: f.authRequest(app.app.clientId).redirect_uri,
          })
        ).status,
      ).toBe(clientSecret === 'wrong-secret' ? 401 : 400);
    }
    const exchanged = await f.exchange(app.app.clientId, app.clientSecret, code);
    expect(exchanged.status).toBe(200);
    const token = await exchanged.json();
    for (const clientSecret of [undefined, '', 'wrong-secret']) {
      expect(
        (
          await f.request('/token', 'POST', {
            grant_type: 'refresh_token',
            client_id: app.app.clientId,
            client_secret: clientSecret,
            refresh_token: token.refresh_token,
          })
        ).status,
      ).toBe(clientSecret === 'wrong-secret' ? 401 : 400);
    }
    expect((await f.refresh(app, token)).status).toBe(200);
  },
);

integrationTest(
  'consent validates redirects and scopes, and denial returns state without a code',
  async f => {
    const app = await f.register();
    f.signIn(f.player);
    const input = f.authRequest(app.app.clientId);
    for (const invalid of [{ redirect_uri: 'https://evil.example/cb' }, { scope: 'admin' }]) {
      expect(
        (await f.request('/authorize', 'POST', { ...input, ...invalid, accept: true })).status,
      ).toBe(400);
    }
    const denied = await f.request('/authorize', 'POST', { ...input, accept: false });
    expect(denied.status).toBe(200);
    const callback = new URL((await denied.json()).data.redirectUrl);
    expect(callback.searchParams.get('error')).toBe('access_denied');
    expect(callback.searchParams.get('state')).toBe(input.state);
    expect(callback.searchParams.has('code')).toBe(false);
  },
);

integrationTest(
  'code exchange verifies client and callback, consumes atomically and stores only token hashes',
  async f => {
    const app = await f.register({
      redirectUris: ['https://app.example/callback', 'https://app.example/another-callback'],
    });
    const clientId = app.app.clientId;
    f.signIn(f.player);
    const code = await f.approve(clientId);
    expect((await f.exchange(clientId, 'wrong-secret', code)).status).toBe(401);
    expect(
      (
        await f.request('/token', 'POST', {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: app.clientSecret,
          code,
          redirect_uri: 'https://app.example/another-callback',
        })
      ).status,
    ).toBe(400);
    const raced = await Promise.all([
      f.exchange(clientId, app.clientSecret, code),
      f.exchange(clientId, app.clientSecret, code),
    ]);
    expect(raced.map(r => r.status).sort()).toEqual([200, 400]);
    const token = await raced.find(r => r.status === 200)!.json();
    expect((await f.exchange(clientId, app.clientSecret, code)).status).toBe(400);
    const rows = await db
      .select()
      .from(integrationAppConnection)
      .where(eq(integrationAppConnection.clientId, clientId));
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(token.access_token);
    expect(JSON.stringify(rows)).not.toContain(token.refresh_token);
    f.signIn(null);
    expect((await f.request('/me')).status).toBe(401);
    expect(
      (await (await f.request('/me', 'GET', undefined, token.access_token)).json()).data,
    ).toEqual({ id: f.player, displayName: f.player });
  },
);

integrationTest('concurrent refresh reuse revokes even the winning token pair', async f => {
  const app = await f.register();
  const token = await f.connect(app);
  const race = await Promise.all([f.refresh(app, token), f.refresh(app, token)]);
  expect(race.map(r => r.status).sort()).toEqual([200, 400]);
  expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
  const winner = await race.find(r => r.status === 200)!.json();
  expect((await f.request('/me', 'GET', undefined, winner.access_token)).status).toBe(401);
});

integrationTest('expired authorization, access and refresh credentials are rejected', async f => {
  const app = await f.register();
  const clientId = app.app.clientId;
  f.signIn(f.player);
  const expired = await f.approve(clientId);
  await db
    .update(integrationAppCode)
    .set({ expiresAt: new Date(0) })
    .where(eq(integrationAppCode.clientId, clientId));
  expect((await f.exchange(clientId, app.clientSecret, expired)).status).toBe(400);
  let token = await f.connect(app);
  await db
    .update(integrationAppConnection)
    .set({ accessExpiresAt: new Date(0) })
    .where(eq(integrationAppConnection.clientId, clientId));
  expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
  const refreshed = await f.refresh(app, token);
  expect(refreshed.status).toBe(200);
  token = await refreshed.json();
  await db
    .update(integrationAppConnection)
    .set({ refreshExpiresAt: new Date(0) })
    .where(eq(integrationAppConnection.clientId, clientId));
  expect((await f.refresh(app, token)).status).toBe(400);
});

integrationTest(
  'resource authorization enforces consent scopes and both player and owner restrictions',
  async f => {
    const app = await f.register();
    let token = await f.connect(app, 'profile:read');
    expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(403);
    token = await f.connect(app);
    await db.update(user).set({ banned: true }).where(eq(user.id, f.player));
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(403);
    await db.update(user).set({ banned: false }).where(eq(user.id, f.player));
    await db.update(user).set({ banned: true }).where(eq(user.id, f.owner));
    expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(403);
  },
);

integrationTest('apps cannot consume another app’s code or refresh token', async f => {
  const otherApp = await f.register();
  const app = await f.register();
  f.signIn(f.player);
  const code = await f.approve(app.app.clientId);
  expect((await f.exchange(otherApp.app.clientId, otherApp.clientSecret, code)).status).toBe(400);
  const exchanged = await f.exchange(app.app.clientId, app.clientSecret, code);
  expect(exchanged.status).toBe(200);
  const token = await exchanged.json();
  expect((await f.refresh(otherApp, token)).status).toBe(400);
  const refresh = await f.refresh(app, token);
  expect(refresh.status).toBe(200);
  const replacement = await refresh.json();
  expect((await f.refresh(app, token)).status).toBe(400);
  expect((await f.request('/me', 'GET', undefined, replacement.access_token)).status).toBe(401);
  const reconnected = await f.connect(app);
  expect((await f.refresh(app, token)).status).toBe(400);
  expect((await f.request('/me', 'GET', undefined, reconnected.access_token)).status).toBe(200);
});

integrationTest(
  'consumed refresh history is scoped to its app and fresh consent clears the old family',
  async f => {
    const otherApp = await f.register();
    const app = await f.register();
    const consumed = await f.connect(app);
    const refreshed = await f.refresh(app, consumed);
    expect(refreshed.status).toBe(200);
    const replacement = await refreshed.json();
    expect((await f.refresh(otherApp, consumed)).status).toBe(400);
    expect((await f.request('/me', 'GET', undefined, replacement.access_token)).status).toBe(200);
    // Reconsent updates the SAME connection while its consumed history still exists.
    const reconnected = await f.connect(app);
    expect((await f.refresh(app, consumed)).status).toBe(400);
    expect((await f.request('/me', 'GET', undefined, reconnected.access_token)).status).toBe(200);
  },
);
