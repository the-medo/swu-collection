import { afterAll, beforeAll, expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { serializeSignedCookie } from 'better-call';
import { Hono } from 'hono';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpApp } from './app.ts';
import { createMcpRepository } from './database.ts';
import { MCP_SCOPE } from '../shared/mcp/config.ts';
import { readFile } from 'node:fs/promises';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_')) {
    throw new Error('MCP integration tests require an isolated worktree database.');
  }
}

let sql: ReturnType<typeof postgres>;
let database: PostgresJsDatabase;
let authServer: ReturnType<typeof Bun.serve>;
let mcpServer: ReturnType<typeof Bun.serve>;
let issuer: string;
let resource: string;
let cookie: string;
let token: string;
let clientId: string;
let requestedScopes = MCP_SCOPE;
let signingAuth: typeof import('../server/auth/auth.ts').auth;
const userId = `mcp-test-${crypto.randomUUID()}`;
const sessionId = crypto.randomUUID();
const oldEnv: Record<string, string | undefined> = {};

async function authRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${issuer}${path}`, { ...options, redirect: 'manual' });
  return response;
}
function sessionHeaders() {
  return { Cookie: cookie, Origin: new URL(issuer).origin, 'Content-Type': 'application/json' };
}
async function tokenRequest(body: Record<string, string>) {
  return authRequest('/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
}
async function authorizationQuery(withSession: boolean) {
  const verifier =
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const challenge = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  ).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'http://127.0.0.1:8391/callback',
    scope: requestedScopes,
    resource,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'fixture-state',
  });
  const response = await authRequest(`/oauth2/authorize?${query}`, {
    headers: withSession ? { Cookie: cookie } : undefined,
  });
  expect(response.status).toBe(302);
  const location = new URL(response.headers.get('Location')!, issuer);
  return { location, verifier };
}

beforeAll(async () => {
  if (!enabled) return;
  sql = postgres(process.env.DATABASE_URL!, { max: 4 });
  database = drizzle({ client: sql });
  let authFetch: (request: Request) => Response | Promise<Response>;
  let mcpFetch: (request: Request) => Response | Promise<Response>;
  authServer = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: request => authFetch(request) });
  mcpServer = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: request => mcpFetch(request) });
  issuer = `${authServer.url.origin}/api/auth`;
  resource = `${mcpServer.url.origin}/mcp`;
  for (const [key, value] of Object.entries({
    BETTER_AUTH_URL: authServer.url.origin,
    MCP_RESOURCE_URL: resource,
    BETTER_AUTH_COOKIE_PREFIX: userId,
  })) {
    oldEnv[key] = process.env[key];
    process.env[key] = value;
  }
  const { auth } = await import('../server/auth/auth.ts');
  signingAuth = auth;
  const { mcpRoute } = await import('../server/routes/mcp.ts');
  const context = await auth.$context;
  const backend = new Hono();
  backend.get('/.well-known/oauth-authorization-server/api/auth', c =>
    oauthProviderAuthServerMetadata(auth)(c.req.raw),
  );
  backend.use('/api/mcp/*', async (c, next) => {
    const current = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set('user' as never, current?.user as never);
    return next();
  });
  backend.route('/api/mcp', mcpRoute);
  backend.all('/api/auth/*', c => auth.handler(c.req.raw));
  authFetch = request => backend.fetch(request);
  const mcpApp = createMcpApp(
    { resource, issuer, allowedOrigins: new Set([mcpServer.url.origin, authServer.url.origin]) },
    createMcpRepository(database, resource, 60),
  );
  mcpFetch = request => mcpApp.fetch(request);
  await sql`insert into "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at)
    values (${userId}, ${userId}, ${userId}, ${`${userId}@invalid.local`}, false, 'USD', 'user', now(), now())`;
  const sessionToken = crypto.randomUUID();
  await sql`insert into session (id, user_id, token, expires_at, created_at, updated_at)
    values (${sessionId}, ${userId}, ${sessionToken}, now() + interval '1 day', now(), now())`;
  cookie = (
    await serializeSignedCookie(context.authCookies.sessionToken.name, sessionToken, context.secret)
  ).split(';')[0]!;
  const registration = await authRequest('/oauth2/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'SWUBASE test agent',
      redirect_uris: ['http://127.0.0.1:8391/callback'],
      token_endpoint_auth_method: 'none',
      application_type: 'native',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  const registered = await registration.json();
  if (!registration.ok)
    throw new Error(
      `Registration failed: ${registered.error ?? registered.code}: ${registered.error_description ?? registered.message}`,
    );
  expect(registration.status).toBe(201);
  clientId = registered.client_id;
}, 20_000);

afterAll(async () => {
  if (!enabled) return;
  try {
    if (clientId) await sql`delete from oauth_client where client_id = ${clientId}`;
    await sql`delete from "user" where id = ${userId}`;
    await sql`delete from oauth_resource where identifier = ${resource}`;
  } finally {
    await authServer?.stop(true);
    await mcpServer?.stop(true);
    await sql?.end();
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test.skipIf(!enabled)(
  'OAuth discovery, login, signed consent, PKCE and refresh work with real SWUBASE auth',
  async () => {
    const metadata = await fetch(
      `${authServer.url.origin}/.well-known/oauth-authorization-server/api/auth`,
    );
    expect((await metadata.json()).issuer).toBe(issuer);
    const anonymous = await fetch(resource, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get('WWW-Authenticate')).toContain(
      '/.well-known/oauth-protected-resource/mcp',
    );
    requestedScopes = anonymous.headers.get('WWW-Authenticate')!.match(/\bscope="([^"]+)"/)![1]!;
    expect(requestedScopes.split(' ')).toEqual(['cards:read', 'offline_access']);
    const protectedMetadata = await fetch(
      `${mcpServer.url.origin}/.well-known/oauth-protected-resource/mcp`,
    );
    expect(await protectedMetadata.json()).toMatchObject({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [MCP_SCOPE],
    });
    expect((await authorizationQuery(false)).location.pathname).toBe('/mcp/login');
    const { location, verifier } = await authorizationQuery(true);
    expect(location.pathname).toBe('/mcp/consent');
    const contextUrl = `${authServer.url.origin}/api/mcp/authorization?${new URLSearchParams({ oauth_query: location.search.slice(1) })}`;
    expect((await fetch(contextUrl)).status).toBe(401);
    const details = await fetch(contextUrl, { headers: sessionHeaders() });
    expect(await details.json()).toMatchObject({
      data: {
        clientId,
        clientName: 'SWUBASE test agent',
        redirectTarget: 'Local application (127.0.0.1)',
      },
    });
    const forged = new URL(location);
    forged.searchParams.set('client_id', 'forged-client');
    expect(
      (
        await fetch(
          `${authServer.url.origin}/api/mcp/authorization?${new URLSearchParams({ oauth_query: forged.search.slice(1) })}`,
          { headers: sessionHeaders() },
        )
      ).status,
    ).toBe(400);
    const denied = await authRequest('/oauth2/consent', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify({ accept: false, oauth_query: location.search.slice(1) }),
    });
    expect(new URL((await denied.json()).url).searchParams.get('error')).toBe('access_denied');
    const consent = await authRequest('/oauth2/consent', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify({ accept: true, oauth_query: location.search.slice(1) }),
    });
    expect(consent.status).toBe(200);
    const redirect = new URL((await consent.json()).url);
    expect(redirect.origin).toBe('http://127.0.0.1:8391');
    expect(redirect.searchParams.get('state')).toBe('fixture-state');
    const code = redirect.searchParams.get('code')!;
    const exchange = await tokenRequest({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: 'http://127.0.0.1:8391/callback',
      code,
      code_verifier: verifier,
      resource,
    });
    expect(exchange.status).toBe(200);
    const tokens = await exchange.json();
    token = tokens.access_token;
    expect(tokens.refresh_token).toBeString();
    const refreshed = await tokenRequest({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: tokens.refresh_token,
      resource,
    });
    if (!refreshed.ok) {
      const failure = await refreshed.json();
      throw new Error(`Refresh failed: ${failure.error}: ${failure.error_description}`);
    }
    expect(refreshed.status).toBe(200);
    token = (await refreshed.json()).access_token;
    const replay = await tokenRequest({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: 'http://127.0.0.1:8391/callback',
      code,
      code_verifier: verifier,
      resource,
    });
    expect(replay.status).toBe(400);
  },
);

test.skipIf(!enabled)(
  'both MCP protocol eras list and call the tool, with bounded results and user/client usage',
  async () => {
    for (const mode of ['legacy', 'auto'] as const) {
      const client = new Client(
        { name: 'integration-test', version: '1.0' },
        { versionNegotiation: { mode } },
      );
      const transport = new StreamableHTTPClientTransport(new URL(resource), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      });
      try {
        await client.connect(transport);
        expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(['search_cards']);
        const result = await client.callTool({
          name: 'search_cards',
          arguments: { query: 'luke', limit: 2 },
        });
        expect(result.isError).not.toBe(true);
        expect(result.structuredContent).toMatchObject({
          cards: expect.arrayContaining([expect.any(Object), expect.any(Object)]),
        });
        const invalid = await client.callTool({ name: 'search_cards', arguments: { query: ' ' } });
        expect(invalid.isError).toBe(true);
      } finally {
        await client.close();
      }
    }
    const usage = await sql`select * from mcp_tool_usage where user_id = ${userId}`;
    expect(usage).toHaveLength(2);
    for (const row of usage) {
      expect(row.client_id).toBe(clientId);
      expect(row.outcome).toBe('success');
      expect(row.result_count).toBe(2);
      expect(row.duration_ms).toBeGreaterThanOrEqual(0);
    }
  },
);

test.skipIf(!enabled)(
  'JWT tampering, foreign origins, restrictions, revocation and expired sessions deny access',
  async () => {
    const post = (accessToken: string, origin?: string) =>
      fetch(resource, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
    expect((await post(token.slice(0, -8) + 'tampered')).status).toBe(401);
    expect((await post(token, 'https://untrusted.example')).status).toBe(403);
    const now = Math.floor(Date.now() / 1000);
    const valid = {
      sub: userId,
      sid: sessionId,
      azp: clientId,
      scope: MCP_SCOPE,
      iss: issuer,
      aud: resource,
      iat: now,
      exp: now + 300,
    };
    for (const changes of [
      { aud: 'https://other.example/mcp' },
      { iss: 'https://other.example/api/auth' },
      { exp: now - 10 },
      { sub: 'another-user' },
    ]) {
      const signed = await signingAuth.api.signJWT({ body: { payload: { ...valid, ...changes } } });
      expect((await post(signed.token)).status).toBe(401);
    }
    const missingScope = await signingAuth.api.signJWT({
      body: { payload: { ...valid, scope: 'offline_access' } },
    });
    const insufficient = await post(missingScope.token);
    expect(insufficient.status).toBe(403);
    expect(insufficient.headers.get('WWW-Authenticate')).toContain('insufficient_scope');
    await sql`update "user" set banned = true where id = ${userId}`;
    expect((await post(token)).status).toBe(403);
    await sql`update "user" set ban_expires = now() - interval '1 minute' where id = ${userId}`;
    expect((await post(token)).status).toBe(200);
    await sql`update "user" set ban_expires = now() + interval '1 minute' where id = ${userId}`;
    expect((await post(token)).status).toBe(403);
    await sql`update "user" set banned = false, ban_expires = null where id = ${userId}`;
    await sql`update oauth_client set disabled = true where client_id = ${clientId}`;
    expect((await post(token)).status).toBe(401);
    await sql`update oauth_client set disabled = false where client_id = ${clientId}`;
    await sql`update session set expires_at = now() - interval '1 minute' where id = ${sessionId}`;
    const reconnect = await post(token);
    expect(reconnect.status).toBe(401);
    expect(reconnect.headers.get('WWW-Authenticate')).toContain(
      `resource_metadata="${mcpServer.url.origin}/.well-known/oauth-protected-resource/mcp"`,
    );
    expect(reconnect.headers.get('WWW-Authenticate')).toContain(
      'scope="cards:read offline_access"',
    );
    expect(reconnect.headers.get('WWW-Authenticate')).toContain('error="invalid_token"');
    await sql`update session set expires_at = now() + interval '1 day' where id = ${sessionId}`;
    await sql`delete from oauth_consent where user_id = ${userId} and client_id = ${clientId}`;
    expect((await post(token)).status).toBe(401);
  },
);

test.skipIf(!enabled)(
  'usage admission enforces one per-user budget across concurrent clients',
  async () => {
    await sql`delete from mcp_tool_usage where user_id = ${userId}`;
    const repository = createMcpRepository(database, resource, 3);
    const admissions = await Promise.all(
      Array.from({ length: 10 }, (_, i) => repository.admit({ userId, clientId: `client-${i}` })),
    );
    expect(admissions.filter(Boolean)).toHaveLength(3);
    expect(
      (
        await sql`select count(*)::integer as calls from mcp_tool_usage where user_id = ${userId}`
      )[0]!.calls,
    ).toBe(3);
  },
);

test.skipIf(!enabled)(
  'the documented database grants allow metering and deny credential access',
  async () => {
    const role = `mcp_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const runtimeSql = postgres(process.env.DATABASE_URL!, { max: 1 });
    let roleCreated = false;
    try {
      await sql`create role ${sql(role)} nologin`;
      roleCreated = true;
      const databaseName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
      const grants = (await readFile(new URL('./deploy/grants.sql', import.meta.url), 'utf8'))
        .replaceAll('swubase_mcp', role)
        .replace(':"DBNAME"', `"${databaseName.replaceAll('"', '""')}"`);
      await sql.unsafe(grants).simple();
      await sql`insert into oauth_consent (id, client_id, user_id, scopes, resources, created_at, updated_at)
      values (${role}, ${clientId}, ${userId}, array['cards:read'], array[${resource}], now() - interval '1 second', now())`;
      await runtimeSql`set role ${runtimeSql(role)}`;
      const repository = createMcpRepository(drizzle({ client: runtimeSql }), resource, 60);
      const now = Math.floor(Date.now() / 1000);
      expect(
        await repository.authorize({
          sub: userId,
          azp: clientId,
          sid: sessionId,
          iat: now,
          exp: now + 300,
        }),
      ).toEqual({ userId, clientId });
      await repository.health();
      const id = await repository.admit({ userId, clientId });
      expect(id).toBeString();
      await repository.finish(id!, 'success', 1, 2);
      for (const query of [
        'select token from session',
        'select email from "user"',
        'select client_secret from oauth_client',
        'select private_key from jwks',
      ]) {
        await expect(runtimeSql.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
      }
    } finally {
      await runtimeSql`reset role`;
      await runtimeSql.end();
      if (roleCreated) {
        await sql`drop owned by ${sql(role)}`;
        await sql`drop role ${sql(role)}`;
      }
    }
  },
);
