import { expect } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import {
  integrationApp,
  integrationAppCode,
  integrationAppConnection,
  integrationAppRefreshUse,
} from '../../db/schema/integration_app.ts';
import { gameResult } from '../../db/schema/game_result.ts';
import { game, integrationTest, registration } from './test-fixture.ts';

integrationTest(
  'registrations require a session, CSRF protection and ownership; secrets are shown once',
  async f => {
    expect((await f.request('/apps')).status).toBe(401);
    expect((await f.request('/apps', 'POST', registration)).status).toBe(401);
    f.signIn(f.owner);
    expect((await f.request('/apps', 'POST', registration, undefined, false)).status).toBe(403);
    expect(
      (await f.request('/apps', 'POST', { ...registration, clientType: 'public' })).status,
    ).toBe(400);
    expect((await (await f.request('/apps')).json()).data).toHaveLength(0);
    expect((await f.request('/apps', 'POST', { ...registration, scopes: ['admin'] })).status).toBe(
      400,
    );
    const app = await f.register();
    const clientId = app.app.clientId;
    expect(app.app).not.toHaveProperty('clientType');
    expect(app.clientSecret).toStartWith('swu_secret_');
    const [stored] = await db
      .select()
      .from(integrationApp)
      .where(eq(integrationApp.clientId, clientId));
    expect(stored!.secretHash).not.toBe(app.clientSecret);
    const listing = await (await f.request('/apps')).text();
    expect(listing).not.toContain(app.clientSecret!);
    expect(listing).not.toContain(stored!.secretHash!);
    f.signIn(f.player);
    expect((await (await f.request('/apps')).json()).data).toHaveLength(0);
    for (const [path, method, body] of [
      [`/apps/${clientId}`, 'PUT', registration],
      [`/apps/${clientId}`, 'DELETE', undefined],
      [`/apps/${clientId}/rotate-secret`, 'POST', undefined],
      [`/apps/${clientId}/status`, 'PUT', { disabled: true }],
    ] as const)
      expect((await f.request(path, method, body)).status).toBe(404);
  },
);

integrationTest('concurrent registrations cannot exceed the per-owner quota', async f => {
  for (let i = 0; i < 9; i++) await f.register({ name: `Quota app ${i}` });
  const lastSlot = await Promise.all([
    f.request('/apps', 'POST', registration),
    f.request('/apps', 'POST', registration),
  ]);
  expect(lastSlot.map(response => response.status).sort()).toEqual([201, 409]);
  expect((await (await f.request('/apps')).json()).data).toHaveLength(10);
});

integrationTest(
  'unchanged and reordered registrations preserve tokens, pending consent and refresh history',
  async f => {
    const app = await f.register({
      redirectUris: [...registration.redirectUris, 'https://app.example/other'],
    });
    const clientId = app.app.clientId;
    const original = await f.connect(app);
    const refresh = await f.refresh(app, original);
    expect(refresh.status).toBe(200);
    const token = await refresh.json();
    const pending = await f.approve(clientId);
    const [stored] = await db
      .select()
      .from(integrationApp)
      .where(eq(integrationApp.clientId, clientId));
    const [connection] = await db
      .select()
      .from(integrationAppConnection)
      .where(eq(integrationAppConnection.clientId, clientId));
    const history = await db
      .select()
      .from(integrationAppRefreshUse)
      .where(eq(integrationAppRefreshUse.connectionId, connection!.id));
    expect(history).toHaveLength(1);
    f.signIn(f.owner);
    const unchangedInput = { ...registration, redirectUris: app.app.redirectUris };
    for (const input of [
      unchangedInput,
      {
        ...unchangedInput,
        name: ` ${app.app.name} `,
        description: ` ${app.app.description} `,
        redirectUris: [...app.app.redirectUris].reverse(),
        scopes: [...app.app.scopes].reverse(),
      },
    ]) {
      const saved = await f.request(`/apps/${clientId}`, 'PUT', input);
      expect(saved.status).toBe(200);
      expect((await saved.json()).data).toEqual(app.app);
      expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(200);
    }
    expect(
      await db.select().from(integrationApp).where(eq(integrationApp.clientId, clientId)),
    ).toEqual([stored!]);
    expect(
      await db
        .select()
        .from(integrationAppConnection)
        .where(eq(integrationAppConnection.clientId, clientId)),
    ).toEqual([connection!]);
    expect(
      await db
        .select()
        .from(integrationAppRefreshUse)
        .where(eq(integrationAppRefreshUse.connectionId, connection!.id)),
    ).toEqual(history);
    expect((await f.refresh(app, token)).status).toBe(200);
    expect((await f.exchange(clientId, app.clientSecret, pending)).status).toBe(200);
  },
);

for (const [field, change] of Object.entries({
  name: { name: 'Renamed app' },
  description: { description: 'Changed purpose' },
  redirectUris: { redirectUris: ['https://app.example/changed'] },
  scopes: { scopes: ['profile:read'] },
})) {
  integrationTest(`changing ${field} still revokes connections and pending codes`, async f => {
    const app = await f.register();
    const clientId = app.app.clientId;
    const token = await f.connect(app);
    const pending = await f.approve(clientId);
    f.signIn(f.owner);
    expect(
      (await f.request(`/apps/${clientId}`, 'PUT', { ...registration, ...change })).status,
    ).toBe(200);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    expect((await f.refresh(app, token)).status).toBe(400);
    expect((await f.exchange(clientId, app.clientSecret, pending)).status).toBe(400);
    expect(
      await db.select().from(integrationAppCode).where(eq(integrationAppCode.clientId, clientId)),
    ).toHaveLength(0);
    if (field === 'scopes') {
      f.signIn(f.player);
      expect(
        (await f.request('/authorize', 'POST', { ...f.authRequest(clientId), accept: true }))
          .status,
      ).toBe(400);
      await f.connect(app, 'profile:read');
    }
  });
}

integrationTest(
  'secret rotation invalidates existing connections and the previous secret',
  async f => {
    const app = await f.register();
    const token = await f.connect(app);
    f.signIn(f.owner);
    const response = await f.request(`/apps/${app.app.clientId}/rotate-secret`, 'POST');
    expect(response.status).toBe(200);
    const rotated = (await response.json()).data;
    expect(rotated.clientSecret).not.toBe(app.clientSecret);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    f.signIn(f.player);
    const code = await f.approve(app.app.clientId);
    expect((await f.exchange(app.app.clientId, app.clientSecret, code)).status).toBe(401);
    expect((await f.exchange(app.app.clientId, rotated.clientSecret, code)).status).toBe(200);
  },
);

integrationTest(
  'disable, re-enable and deletion revoke access while retaining imported results',
  async f => {
    const app = await f.register();
    let token = await f.connect(app);
    const saved = (
      await (await f.request('/game-results', 'POST', game, token.access_token)).json()
    ).data;
    f.signIn(f.owner);
    expect(
      (await f.request(`/apps/${app.app.clientId}/status`, 'PUT', { disabled: true })).status,
    ).toBe(200);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    expect(
      (await f.request('/authorize', 'POST', { ...f.authRequest(app.app.clientId), accept: true }))
        .status,
    ).toBe(404);
    expect(
      (await f.request(`/apps/${app.app.clientId}/status`, 'PUT', { disabled: false })).status,
    ).toBe(200);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    token = await f.connect(app);
    f.signIn(f.owner);
    expect((await f.request(`/apps/${app.app.clientId}`, 'DELETE')).status).toBe(200);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    expect(await db.select().from(gameResult).where(eq(gameResult.id, saved.id))).toHaveLength(1);
  },
);

integrationTest(
  'disconnect is isolated to the player and cancels pending consent and in-flight refreshes',
  async f => {
    const app = await f.register();
    const token = await f.connect(app);
    const pending = await f.approve(app.app.clientId);
    const otherToken = await f.connect(app, undefined, f.otherPlayer);
    f.signIn(f.player);
    expect((await f.request(`/connections/${app.app.clientId}`, 'DELETE')).status).toBe(200);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(401);
    expect((await f.exchange(app.app.clientId, app.clientSecret, pending)).status).toBe(400);
    expect((await f.request('/me', 'GET', undefined, otherToken.access_token)).status).toBe(200);
    f.signIn(f.otherPlayer);
    const [refresh, disconnect] = await Promise.all([
      f.refresh(app, otherToken),
      f.request(`/connections/${app.app.clientId}`, 'DELETE'),
    ]);
    expect(disconnect.status).toBe(200);
    expect((await f.request('/me', 'GET', undefined, otherToken.access_token)).status).toBe(401);
    if (refresh.status === 200) {
      expect(
        (await f.request('/me', 'GET', undefined, (await refresh.json()).access_token)).status,
      ).toBe(401);
    } else expect(refresh.status).toBe(400);
  },
);
