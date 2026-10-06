import { afterAll, beforeAll, expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import { deck } from '../server/db/schema/deck.ts';
import { deckCard } from '../server/db/schema/deck_card.ts';
import { cardPools, cardPoolCards } from '../server/db/schema/card_pool.ts';
import { cardPoolDeckCards } from '../server/db/schema/card_pool_deck.ts';
import { deckListInput } from './decks.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../server/db/schema/deck_folder.ts';
import { team } from '../server/db/schema/team.ts';
import { teamMember } from '../server/db/schema/team_member.ts';
import { serializeSignedCookie } from 'better-call';
import { Hono } from 'hono';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpApp } from './app.ts';
import { createMcpRepository } from './database.ts';
import {
  MCP_AUTH_SCOPES,
  MCP_DECK_SCOPE,
  MCP_DEFAULT_SCOPES,
  MCP_RESOURCE_SCOPES,
  MCP_SCOPE,
} from '../shared/mcp/config.ts';
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
const foreignUserId = `mcp-foreign-${crypto.randomUUID()}`;
const deckIds = {
  linkShared: crypto.randomUUID(),
  teamShared: crypto.randomUUID(),
  own: crypto.randomUUID(),
  limited: crypto.randomUUID(),
  literal: crypto.randomUUID(),
  huge: crypto.randomUUID(),
  private: crypto.randomUUID(),
  public: crypto.randomUUID(),
  unlisted: crypto.randomUUID(),
};
const folderIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const teamId = crypto.randomUUID();
const poolIds = [crypto.randomUUID(), crypto.randomUUID()];
const leader = 'qui-gon-jinn--student-of-the-living-force';
const base = 'echo-base';
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
async function authorizationQuery(withSession: boolean, resources = [resource]) {
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
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'fixture-state',
  });
  for (const value of resources) query.append('resource', value);
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
      scope: MCP_DEFAULT_SCOPES.join(' '),
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
  expect(registered.scope.split(' ')).toEqual([...MCP_AUTH_SCOPES]);
  clientId = registered.client_id;
  await sql`insert into "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at)
    values (${foreignUserId}, 'Other owner', ${foreignUserId}, ${`${foreignUserId}@invalid.local`}, false, 'USD', 'user', now(), now())`;
  await database.insert(cardPools).values(poolIds.map(id => ({ id, userId, set: 'twi' })));
  await database.insert(deck).values([
    {
      id: deckIds.own,
      userId,
      format: 1,
      name: 'Qui-Gon MCP fixture',
      public: 0,
      leaderCardId1: leader,
      baseCardId: base,
      description: 'My deck plan',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: deckIds.limited,
      userId,
      format: 3,
      name: 'Limited MCP fixture',
      public: 0,
      leaderCardId1: 'preview-selected-leader',
      baseCardId: base,
      cardPoolId: poolIds[0],
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      id: deckIds.literal,
      userId,
      format: 1,
      name: '%_literal MCP fixture',
      public: 0,
      leaderCardId2: leader,
      baseCardId: base,
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: deckIds.huge,
      userId,
      format: 1,
      name: 'Oversized MCP fixture',
      public: 0,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
    ...(['linkShared', 'teamShared'] as const).map(key => ({
      id: deckIds[key],
      userId: foreignUserId,
      format: 1,
      name: 'Shared private MCP fixture',
      public: 0,
    })),
    ...(['private', 'public', 'unlisted'] as const).map((visibility, i) => ({
      id: deckIds[visibility],
      userId: foreignUserId,
      format: 1,
      name: `Foreign ${visibility} MCP fixture`,
      public: i,
    })),
  ]);
  await database.insert(team).values({ id: teamId, name: 'MCP sharing fixture' });
  await database.insert(teamMember).values([
    { teamId, userId: foreignUserId, role: 'owner' },
    { teamId, userId },
  ]);
  await database.insert(deckFolder).values([
    { id: folderIds[0], userId: foreignUserId, name: 'Link share' },
    { id: folderIds[1], userId: foreignUserId, name: 'Team share' },
  ]);
  await database.insert(deckFolder).values({
    id: folderIds[2],
    userId: foreignUserId,
    name: 'Inherited link share',
    parentId: folderIds[0],
  });
  await database.insert(deckFolderShare).values([
    { folderId: folderIds[0]!, userId: foreignUserId, audience: 'link' },
    { folderId: folderIds[1]!, userId: foreignUserId, audience: 'team', teamId },
  ]);
  await database.insert(deckFolderDeck).values([
    { deckId: deckIds.linkShared, folderId: folderIds[2]! },
    { deckId: deckIds.teamShared, folderId: folderIds[1]! },
  ]);
  await database.insert(deckCard).values([
    {
      deckId: deckIds.own,
      cardId: 'coruscant-guard',
      board: 1,
      quantity: 3,
      note: 'PRIVATE CARD NOTE',
    },
    { deckId: deckIds.own, cardId: 'agent-kallus--seeking-the-rebels', board: 2, quantity: 1 },
    {
      deckId: deckIds.own,
      cardId: 'preview-card-not-in-official-catalog',
      board: 3,
      quantity: 2,
    },
    { deckId: deckIds.own, cardId: 'zero-count-card', board: 1, quantity: 0 },
    ...Array.from({ length: 501 }, (_, i) => ({
      deckId: deckIds.huge,
      cardId: `overflow-${i}`,
      board: 1,
      quantity: 1,
    })),
  ]);
  const poolCards = [
    'coruscant-guard',
    'coruscant-guard',
    'agent-kallus--seeking-the-rebels',
    'agent-kallus--seeking-the-rebels',
    'preview-selected-leader',
    base,
    'preview-unit-not-in-official-catalog',
    leader,
    'preview-unselected-base',
  ];
  await database
    .insert(cardPoolCards)
    .values([
      ...poolCards.map((cardId, i) => ({ cardPoolId: poolIds[0]!, cardPoolNumber: i + 1, cardId })),
      { cardPoolId: poolIds[1]!, cardPoolNumber: 1, cardId: 'another-pool-private-card' },
    ]);
  await database.insert(cardPoolDeckCards).values(
    poolCards.map((_, i) => ({
      deckId: deckIds.limited,
      cardPoolNumber: i + 1,
      location:
        i === 2 || i === 8 ? ('pool' as const) : i === 3 ? ('trash' as const) : ('deck' as const),
    })),
  );
}, 20_000);

afterAll(async () => {
  if (!enabled) return;
  try {
    await database.delete(deckFolder).where(inArray(deckFolder.id, folderIds));
    await database.delete(teamMember).where(eq(teamMember.teamId, teamId));
    await database.delete(team).where(eq(team.id, teamId));
    await database
      .delete(cardPoolDeckCards)
      .where(inArray(cardPoolDeckCards.deckId, Object.values(deckIds)));
    await database.delete(deckCard).where(inArray(deckCard.deckId, Object.values(deckIds)));
    await database.delete(deck).where(inArray(deck.id, Object.values(deckIds)));
    await database.delete(cardPoolCards).where(inArray(cardPoolCards.cardPoolId, poolIds));
    await database.delete(cardPools).where(inArray(cardPools.id, poolIds));
    await sql`delete from "user" where id = ${foreignUserId}`;
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
  'OAuth login, card-only consent, deck permission upgrade, PKCE and refresh work with real auth',
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
    expect(requestedScopes.split(' ')).toEqual([...MCP_DEFAULT_SCOPES]);
    const protectedMetadata = await fetch(
      `${mcpServer.url.origin}/.well-known/oauth-protected-resource/mcp`,
    );
    expect(await protectedMetadata.json()).toMatchObject({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [...MCP_RESOURCE_SCOPES],
    });
    expect((await authorizationQuery(false)).location.pathname).toBe('/mcp/login');
    const missingResource = await authorizationQuery(true, []);
    expect(
      (
        await fetch(
          `${authServer.url.origin}/api/mcp/authorization?${new URLSearchParams({ oauth_query: missingResource.location.search.slice(1) })}`,
          { headers: sessionHeaders() },
        )
      ).status,
    ).toBe(400);
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
    const callDeck = (accessToken: string) =>
      fetch(resource, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_deck', arguments: { deckId: deckIds.own } },
        }),
      });
    const stepUp = await callDeck(token);
    expect(stepUp.status).toBe(403);
    expect(stepUp.headers.get('WWW-Authenticate')).toContain('insufficient_scope');
    requestedScopes = stepUp.headers.get('WWW-Authenticate')!.match(/\bscope="([^"]+)"/)![1]!;
    expect(requestedScopes.split(' ')).toEqual([...MCP_AUTH_SCOPES]);
    const upgraded = await authorizationQuery(true);
    expect(upgraded.location.pathname).toBe('/mcp/consent');
    const approved = await authRequest('/oauth2/consent', {
      method: 'POST',
      headers: sessionHeaders(),
      body: JSON.stringify({ accept: true, oauth_query: upgraded.location.search.slice(1) }),
    });
    expect(approved.status).toBe(200);
    const callback = new URL((await approved.json()).url);
    const upgradedExchange = await tokenRequest({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: 'http://127.0.0.1:8391/callback',
      code: callback.searchParams.get('code')!,
      code_verifier: upgraded.verifier,
      resource,
    });
    expect(upgradedExchange.status).toBe(200);
    const upgradedTokens = await upgradedExchange.json();
    expect(upgradedTokens.refresh_token).toBeString();
    const upgradedRefresh = await tokenRequest({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: upgradedTokens.refresh_token,
      resource,
    });
    expect(upgradedRefresh.status).toBe(200);
    token = (await upgradedRefresh.json()).access_token;
    expect((await callDeck(token)).status).toBe(200);
    await sql`delete from mcp_tool_usage where user_id = ${userId}`;
  },
);

test.skipIf(!enabled)(
  'both MCP protocol eras call all four tools and meter their actual result counts',
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
        expect((await client.listTools()).tools.map(tool => tool.name)).toEqual([
          'search_cards',
          'get_cards',
          'list_my_decks',
          'get_deck',
        ]);
        const result = await client.callTool({
          name: 'search_cards',
          arguments: { query: 'luke', limit: 2 },
        });
        expect(result.isError).not.toBe(true);
        expect(result.structuredContent).toMatchObject({
          cards: expect.arrayContaining([expect.any(Object), expect.any(Object)]),
        });
        const filtered = await client.callTool({
          name: 'search_cards',
          arguments: {
            aspects: ['Command'],
            keywords: ['Ambush'],
            cardTypes: ['Unit'],
            cost: { max: 5 },
            limit: 2,
          },
        });
        expect(filtered.isError).not.toBe(true);
        expect(filtered.structuredContent).toMatchObject({
          cards: expect.arrayContaining([
            expect.objectContaining({ keywords: expect.arrayContaining(['Ambush']) }),
          ]),
        });
        const details = await client.callTool({
          name: 'get_cards',
          arguments: { cardIds: ['coruscant-guard', 'missing-preview'] },
        });
        expect(details.structuredContent).toMatchObject({
          cards: [expect.objectContaining({ cardId: 'coruscant-guard', text: expect.any(String) })],
          missingCardIds: ['missing-preview'],
        });
        const decks = await client.callTool({
          name: 'list_my_decks',
          arguments: { query: 'Qui-Gon', leaderCardId: leader, baseCardId: base, formatId: 1 },
        });
        expect(decks.structuredContent).toMatchObject({
          total: 1,
          decks: [
            expect.objectContaining({
              deckId: deckIds.own,
              visibility: 'private',
              leaders: [expect.objectContaining({ cardId: leader })],
            }),
          ],
        });
        const saved = await client.callTool({
          name: 'get_deck',
          arguments: { deckId: deckIds.own },
        });
        expect(saved.structuredContent).toMatchObject({
          deckId: deckIds.own,
          boards: {
            main: [expect.objectContaining({ cardId: 'coruscant-guard', quantity: 3 })],
            sideboard: [
              expect.objectContaining({ cardId: 'agent-kallus--seeking-the-rebels', quantity: 1 }),
            ],
            maybeboard: [
              expect.objectContaining({
                cardId: 'preview-card-not-in-official-catalog',
                quantity: 2,
                catalogAvailable: false,
              }),
            ],
          },
          missingCardIds: ['preview-card-not-in-official-catalog'],
        });
        expect(JSON.stringify(saved.structuredContent)).not.toContain('PRIVATE CARD NOTE');
        expect(JSON.stringify(saved.structuredContent)).not.toContain(userId);
        const invalid = await client.callTool({ name: 'search_cards', arguments: { query: ' ' } });
        expect(invalid.isError).toBe(true);
      } finally {
        await client.close();
      }
    }
    const usage = await sql`select * from mcp_tool_usage where user_id = ${userId}`;
    expect(usage).toHaveLength(10);
    for (const row of usage) {
      expect(row.client_id).toBe(clientId);
      expect(row.outcome).toBe('success');
      expect(row.result_count).toBe(row.tool === 'search_cards' ? 2 : 1);
      expect(row.duration_ms).toBeGreaterThanOrEqual(0);
    }
  },
);

test.skipIf(!enabled)(
  'deck tools enforce ownership, visibility, bounded results and card-pool identity',
  async () => {
    const client = new Client({ name: 'deck-test', version: '1.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(resource), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );
    try {
      const first = await client.callTool({ name: 'list_my_decks', arguments: { limit: 1 } });
      expect(first.structuredContent).toMatchObject({
        total: 4,
        offset: 0,
        decks: [expect.objectContaining({ deckId: deckIds.own })],
      });
      const second = await client.callTool({
        name: 'list_my_decks',
        arguments: { limit: 1, offset: 1 },
      });
      expect(second.structuredContent).toMatchObject({
        total: 4,
        decks: [expect.objectContaining({ deckId: deckIds.limited })],
      });
      const literal = await client.callTool({
        name: 'list_my_decks',
        arguments: { query: '%_', leaderCardId: leader },
      });
      expect(literal.structuredContent).toMatchObject({
        total: 1,
        decks: [expect.objectContaining({ deckId: deckIds.literal })],
      });
      const spoof = await client.callTool({
        name: 'list_my_decks',
        arguments: { userId: foreignUserId },
      });
      expect(spoof.isError).toBe(true);
      const denied = await client.callTool({
        name: 'get_deck',
        arguments: { deckId: deckIds.private },
      });
      const absent = await client.callTool({
        name: 'get_deck',
        arguments: { deckId: crypto.randomUUID() },
      });
      expect(denied.isError).toBe(true);
      expect(denied).toEqual(absent);
      for (const visibility of ['public', 'unlisted'] as const) {
        const allowed = await client.callTool({
          name: 'get_deck',
          arguments: { deckId: deckIds[visibility] },
        });
        expect(allowed.isError).not.toBe(true);
        expect(allowed.structuredContent).toMatchObject({
          deckId: deckIds[visibility],
          visibility,
        });
      }
      const limited = await client.callTool({
        name: 'get_deck',
        arguments: { deckId: deckIds.limited },
      });
      expect(limited.structuredContent).toMatchObject({
        kind: 'card_pool',
        boards: {
          main: [
            expect.objectContaining({ cardId: 'coruscant-guard', quantity: 2 }),
            expect.objectContaining({
              cardId: 'preview-unit-not-in-official-catalog',
              quantity: 1,
              catalogAvailable: false,
            }),
          ],
          sideboard: [
            expect.objectContaining({ cardId: 'agent-kallus--seeking-the-rebels', quantity: 2 }),
            expect.objectContaining({
              cardId: 'preview-unselected-base',
              quantity: 1,
              type: null,
              catalogAvailable: false,
            }),
          ],
          maybeboard: [],
        },
        missingCardIds: [
          'preview-selected-leader',
          'preview-unit-not-in-official-catalog',
          'preview-unselected-base',
        ],
      });
      expect(JSON.stringify(limited.structuredContent)).not.toContain('another-pool-private-card');
      const huge = await client.callTool({ name: 'get_deck', arguments: { deckId: deckIds.huge } });
      expect(huge.isError).toBe(true);
      expect(huge.content).toMatchObject([
        { text: 'This deck exceeds the supported content limit.' },
      ]);
      const failures =
        await sql`select outcome, result_count from mcp_tool_usage where user_id = ${userId} and outcome = 'error'`;
      expect(failures).toHaveLength(3);
      expect(failures.every(row => row.result_count === 0)).toBe(true);
    } finally {
      await client.close();
    }
  },
);

test.skipIf(!enabled)(
  'deck folder link/team access and revocation match the main app without disclosing folder metadata',
  async () => {
    const repository = createMcpRepository(database, resource, 60);
    for (const id of [deckIds.linkShared, deckIds.teamShared]) {
      expect(await repository.getDeck(userId, id)).toMatchObject({ deck: { id, public: 0 } });
    }
    expect(await repository.getDeck(foreignUserId + '-outsider', deckIds.teamShared)).toBeNull();
    await database.delete(deckFolderShare).where(eq(deckFolderShare.folderId, folderIds[0]!));
    await database
      .delete(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
    try {
      expect(await repository.getDeck(userId, deckIds.linkShared)).toBeNull();
      expect(await repository.getDeck(userId, deckIds.teamShared)).toBeNull();
    } finally {
      await database
        .insert(deckFolderShare)
        .values({ folderId: folderIds[0]!, userId: foreignUserId, audience: 'link' });
      await database.insert(teamMember).values({ teamId, userId });
    }
  },
);

test.skipIf(!enabled)(
  'deck reads require both token scope and live consent while card-only clients keep working',
  async () => {
    const now = Math.floor(Date.now() / 1000);
    const cardsOnly = await signingAuth.api.signJWT({
      body: {
        payload: {
          sub: userId,
          sid: sessionId,
          azp: clientId,
          scope: MCP_SCOPE,
          iss: issuer,
          aud: resource,
          iat: now,
          exp: now + 300,
        },
      },
    });
    const call = (accessToken: string, name: string, args: Record<string, unknown>) =>
      fetch(resource, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      });
    const before =
      await sql`select count(*)::integer as calls from mcp_tool_usage where user_id = ${userId}`;
    for (const name of ['list_my_decks', 'get_deck']) {
      const denied = await call(
        cardsOnly.token,
        name,
        name === 'get_deck' ? { deckId: deckIds.own } : {},
      );
      expect(denied.status).toBe(403);
      expect(denied.headers.get('WWW-Authenticate')).toContain('insufficient_scope');
      expect(denied.headers.get('WWW-Authenticate')).toContain(MCP_DECK_SCOPE);
      expect(denied.headers.get('WWW-Authenticate')).toContain('offline_access');
    }
    const after =
      await sql`select count(*)::integer as calls from mcp_tool_usage where user_id = ${userId}`;
    expect(after[0]!.calls).toBe(before[0]!.calls);
    expect(
      (await call(cardsOnly.token, 'get_cards', { cardIds: ['coruscant-guard'] })).status,
    ).toBe(200);
    await sql`update oauth_consent set scopes = array['cards:read'] where user_id = ${userId} and client_id = ${clientId}`;
    try {
      expect((await call(token, 'get_deck', { deckId: deckIds.own })).status).toBe(403);
      expect((await call(token, 'search_cards', { query: 'luke' })).status).toBe(200);
    } finally {
      await sql`update oauth_consent set scopes = ${sql.array([...MCP_AUTH_SCOPES])} where user_id = ${userId} and client_id = ${clientId}`;
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
      'scope="' + MCP_DEFAULT_SCOPES.join(' ') + '"',
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
      Array.from({ length: 10 }, (_, i) =>
        repository.admit({ userId, clientId: `client-${i}` }, i % 2 ? 'get_cards' : 'search_cards'),
      ),
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
          scope: MCP_SCOPE,
          iat: now,
          exp: now + 300,
        }),
      ).toEqual({ userId, clientId, scopes: [MCP_SCOPE] });
      const listed = await repository.listDecks(userId, deckListInput.parse({}));
      expect(listed.decks).toHaveLength(4);
      expect(await repository.getDeck(userId, deckIds.own)).toMatchObject({
        deck: { id: deckIds.own },
      });
      expect(await repository.getDeck(userId, deckIds.limited)).toMatchObject({
        deck: { id: deckIds.limited },
      });
      expect(await repository.getDeck(userId, deckIds.private)).toBeNull();
      expect(await repository.getDeck(userId, deckIds.linkShared)).toMatchObject({
        deck: { id: deckIds.linkShared },
      });
      expect(await repository.getDeck(userId, deckIds.teamShared)).toMatchObject({
        deck: { id: deckIds.teamShared },
      });
      await repository.health();
      const id = await repository.admit({ userId, clientId }, 'get_cards');
      expect(id).toBeString();
      await repository.finish(id!, 'success', 1, 2);
      for (const query of [
        'select token from session',
        'select email from "user"',
        'select client_secret from oauth_client',
        'select private_key from jwks',
        'select note from deck_card',
        'select name from deck_folder',
        'select role from team_member',
        "update deck set name = 'unauthorized'",
        'delete from deck_card',
        "update card_pool_deck_cards set location = 'trash'",
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
