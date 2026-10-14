// Run against a running isolated worktree with MCP enabled:
// SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/scripts/mcp-auth-smoke.ts
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { serializeSignedCookie } from 'better-call';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import {
  MCP_AUTH_SCOPES,
  MCP_DEFAULT_SCOPES,
  MCP_DECK_SCOPE,
  MCP_SCOPE,
} from '../../shared/mcp/config.ts';

const databaseUrl = new URL(process.env.DATABASE_URL!);
if (
  process.env.SWUBASE_MCP_DB_TEST !== '1' ||
  databaseUrl.hostname !== '127.0.0.1' ||
  !databaseUrl.pathname.startsWith('/swubase_') ||
  !process.env.MCP_RESOURCE_URL
)
  throw new Error('MCP browser checks require an isolated worktree with MCP enabled.');

const { auth } = await import('../../server/auth/auth.ts');
const { db } = await import('../../server/db/index.ts');
const authContext = await auth.$context;
const sql = postgres(databaseUrl.toString(), { max: 1 });
const origin = process.env.BETTER_AUTH_URL!;
const resource = process.env.MCP_RESOURCE_URL;
const id = `mcp-browser-${crypto.randomUUID()}`;
const redirectUri = 'http://127.0.0.1:8392/callback';
// Exercise a string that the router's default JSON parser would reinterpret.
const state = '{ "marker": "0001" }';
let clientId: string | undefined;
let callback: URL | undefined;
let pageErrors = 0;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.on('pageerror', () => pageErrors++);
await page.addLocatorHandler(
  page.getByRole('button', { name: 'Dismiss', exact: true }),
  async () => {
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  },
);
// Verify real social sign-in initiation without completing an external login.
await context.route('https://accounts.google.com/**', route =>
  route.fulfill({ contentType: 'text/html', body: 'Provider sign-in initiation captured.' }),
);
await context.route(`${redirectUri}*`, route => {
  callback = new URL(route.request().url());
  return route.fulfill({ contentType: 'text/html', body: 'Agent callback captured.' });
});

async function authorization(scopes: string | null = MCP_AUTH_SCOPES.join(' ')) {
  const verifier =
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const challenge = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  ).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    redirect_uri: redirectUri,
    resource,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'consent',
  });
  if (scopes !== null) query.set('scope', scopes);
  const response = await context.request.get(`${origin}/api/auth/oauth2/authorize?${query}`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
  return { location: new URL(response.headers().location!, origin), verifier };
}

async function checkBrowserSignature() {
  expect(
    await verifyOAuthQueryParams(new URL(page.url()).search.slice(1), authContext.secret),
  ).toBe(true);
}

try {
  await sql`insert into "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at)
    values (${id}, 'MCP browser fixture', ${id}, ${`${id}@invalid.local`}, true, 'USD', 'user', now(), now())`;
  const registration = await context.request.post(`${origin}/api/auth/oauth2/register`, {
    data: {
      client_name: 'MCP browser fixture',
      scope: MCP_DEFAULT_SCOPES.join(' '),
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
      application_type: 'native',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
  });
  expect(registration.status()).toBe(201);
  clientId = (await registration.json()).client_id;

  const login = await authorization();
  expect(login.location.pathname).toBe('/mcp/login');
  await page.goto(login.location.href);
  await expect(page.getByRole('heading', { name: 'Connect your agent to SWUBASE' })).toBeVisible();
  await checkBrowserSignature();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Connect your agent to SWUBASE' })).toBeVisible();
  await checkBrowserSignature();
  await page.getByRole('button', { name: 'Sign in to continue', exact: true }).click();
  const signInResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith('/api/auth/sign-in/social'),
  );
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click();
  const started = await signInResponse;
  expect(started.status()).toBe(200);
  expect(
    await verifyOAuthQueryParams(started.request().postDataJSON().oauth_query, authContext.secret),
  ).toBe(true);

  // A synthetic signed session represents the completed external provider login.
  const sessionToken = crypto.randomUUID();
  await sql`insert into session (id, user_id, token, expires_at, created_at, updated_at)
    values (${crypto.randomUUID()}, ${id}, ${sessionToken}, now() + interval '1 hour', now(), now())`;
  const signed = (
    await serializeSignedCookie(
      authContext.authCookies.sessionToken.name,
      sessionToken,
      authContext.secret,
    )
  ).split(';')[0]!;
  await context.addCookies([
    {
      name: authContext.authCookies.sessionToken.name,
      value: signed.slice(signed.indexOf('=') + 1),
      domain: new URL(origin).hostname,
      path: '/',
      httpOnly: true,
      secure: authContext.authCookies.sessionToken.attributes.secure,
      sameSite: 'Lax',
    },
  ]);
  const denied = await authorization(MCP_SCOPE + ' offline_access');
  expect(denied.location.pathname).toBe('/mcp/consent');
  await page.goto(denied.location.href);
  await expect(page.getByRole('button', { name: 'Allow access', exact: true })).toBeEnabled();
  await checkBrowserSignature();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Allow access', exact: true })).toBeEnabled();
  await checkBrowserSignature();
  await expect(page.getByText('Read your saved decks', { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Deny', exact: true }).click();
  await expect.poll(() => callback?.searchParams.get('error')).toBe('access_denied');
  expect(callback?.searchParams.get('state') === state).toBe(true);

  callback = undefined;
  const reduced = await authorization(null);
  await page.goto(reduced.location.href);
  await checkBrowserSignature();
  await expect(page.getByText('Read your saved decks', { exact: false })).toBeVisible();
  const cardOnly = page.getByRole('button', { name: 'Allow card access only', exact: true });
  await expect(cardOnly).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cardOnly.click();
  await expect.poll(() => Boolean(callback?.searchParams.get('code'))).toBe(true);
  const reducedToken = await fetch(`${origin}/api/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId!,
      code: callback!.searchParams.get('code')!,
      redirect_uri: redirectUri,
      code_verifier: reduced.verifier,
      resource,
    }),
  });
  expect(reducedToken.status).toBe(200);
  const reducedTokens = await reducedToken.json();
  expect(reducedTokens.scope.split(' ')).toEqual([...MCP_DEFAULT_SCOPES]);
  expect(typeof reducedTokens.refresh_token).toBe('string');
  expect(reducedTokens.scope).not.toContain(MCP_DECK_SCOPE);

  callback = undefined;
  const approved = await authorization();
  await page.goto(approved.location.href);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.getByRole('button', { name: 'Allow access', exact: true })).toBeEnabled();
  await checkBrowserSignature();
  await expect(page.getByText('Read your saved decks', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Allow access', exact: true }).click();
  await expect.poll(() => Boolean(callback?.searchParams.get('code'))).toBe(true);
  expect(callback?.searchParams.get('state') === state).toBe(true);
  // The agent exchanges its code without the browser's session cookies.
  const token = await fetch(`${origin}/api/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId!,
      code: callback!.searchParams.get('code')!,
      redirect_uri: redirectUri,
      code_verifier: approved.verifier,
      resource,
    }),
  });
  expect(token.status).toBe(200);
  const tokens = await token.json();
  expect(typeof tokens.access_token).toBe('string');
  expect(typeof tokens.refresh_token).toBe('string');
  expect(pageErrors).toBe(0);
  console.log(
    'MCP browser checks passed: signed login, reload, scoped and card-only consent, deny/approve and PKCE exchange.',
  );
} finally {
  await browser.close();
  if (clientId) await sql`delete from oauth_client where client_id = ${clientId}`;
  await sql`delete from "user" where id = ${id}`;
  await sql.end();
  await db.$client.end({ timeout: 5 });
}
