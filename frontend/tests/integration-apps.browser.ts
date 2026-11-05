// Real local API/browser acceptance. Creates and removes only synthetic users/apps.
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

if (process.env.INTEGRATION_APPS_BROWSER_TEST !== '1')
  throw new Error('Opt in with INTEGRATION_APPS_BROWSER_TEST=1.');
const dbUrl = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  dbUrl.hostname !== '127.0.0.1' ||
  !dbUrl.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw new Error('Use a running isolated development worktree.');
const sql = postgres(dbUrl.href, { max: 1 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
const page = await context.newPage();
const userId = `app-browser-${crypto.randomUUID()}`;
const sessionToken = crypto.randomUUID();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(20_000);
await page.addLocatorHandler(
  page.getByRole('button', { name: 'Dismiss', exact: true }),
  async () => {
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  },
);
try {
  await sql`insert into "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at) values (${userId}, 'App Browser Tester', ${userId}, ${userId + '@invalid.local'}, true, 'USD', 'user', now(), now())`;
  await sql`insert into session (id, token, user_id, expires_at, created_at, updated_at) values (${crypto.randomUUID()}, ${sessionToken}, ${userId}, now() + interval '1 hour', now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, sessionToken, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await context.addCookies([
    {
      name: cookieName,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  await page.goto(origin + '/settings?page=apps');
  await expect(page.getByText('You haven’t registered any apps yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Register app', exact: true }).click();
  await expect(page.getByText('Server — uses a client secret', { exact: true })).toBeVisible();
  await expect(page.locator('#app-client-type')).toHaveCount(0);
  await page.getByLabel('App name', { exact: true }).fill('Offline game client');
  await page.getByLabel('Description', { exact: true }).fill('A local team practice app.');
  await page.getByLabel('Callback URLs', { exact: true }).fill('https://client.invalid/callback');
  await page.getByRole('button', { name: 'Create app', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Save your client secret now' })).toBeVisible();
  const clientId = await page.getByLabel('Client ID', { exact: true }).inputValue();
  const clientSecret = await page.getByLabel('Client secret', { exact: true }).inputValue();
  expect(clientSecret).toMatch(/^swu_secret_/);
  await page.getByRole('button', { name: 'Dismiss credentials', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Offline game client', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Client secret', { exact: true })).toHaveCount(0);
  await mkdir('.swubase/integration-apps', { recursive: true });
  await page.screenshot({ path: '.swubase/integration-apps/apps-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('heading', { name: 'Offline game client', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.swubase/integration-apps/apps-mobile.png' });
  await page.evaluate(() => document.documentElement.classList.toggle('dark'));
  await page.screenshot({ path: '.swubase/integration-apps/apps-theme.png' });
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'https://client.invalid/callback',
    scope: 'profile:read game-results:write',
    state: 'browser-state-value-123456',
  });
  await page.route('https://client.invalid/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<p>Fixture callback</p>' }),
  );
  await page.goto(origin + '/settings/link/app?' + query);
  const consentHeaders = await context.request.get(origin + '/settings/link/app');
  expect(consentHeaders.headers()['x-frame-options']).toBe('DENY');
  expect(consentHeaders.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  const backendConsent = await context.request.get(
    process.env.VITE_BACKEND_URL! + '/settings/link/app',
  );
  expect(backendConsent.headers()['x-frame-options']).toBe('DENY');
  expect(backendConsent.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  await expect(page.getByRole('button', { name: 'Allow access' })).toBeVisible();
  await page.getByRole('button', { name: 'Allow access' }).click();
  await page.waitForURL(/client\.invalid\/callback/);
  const callback = new URL(page.url());
  expect(callback.searchParams.get('state')).toBe('browser-state-value-123456');
  const exchange = await context.request.post(origin + '/api/integration-apps/token', {
    data: {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: callback.searchParams.get('code'),
      redirect_uri: 'https://client.invalid/callback',
    },
  });
  expect(exchange.status()).toBe(200);
  const tokens = await exchange.json();
  const profile = await context.request.get(origin + '/api/integration-apps/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  expect((await profile.json()).data.id).toBe(userId);
  await page.goto(origin + '/settings?page=apps');
  await page.getByRole('button', { name: 'Edit app', exact: true }).click();
  await expect(page.getByText(/Saving without changes keeps their connections/)).toBeVisible();
  const [savedRegistration] = await Promise.all([
    page.waitForResponse(
      response =>
        response.request().method() === 'PUT' &&
        response.url() === `${origin}/api/integration-apps/apps/${clientId}`,
    ),
    page.getByRole('button', { name: 'Save app', exact: true }).click(),
  ]);
  expect(savedRegistration.status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Save app', exact: true })).toHaveCount(0);
  expect(
    (
      await context.request.get(origin + '/api/integration-apps/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
    ).status(),
  ).toBe(200);
  await page.goto(origin + '/settings?page=integrations');
  await expect(
    page.getByRole('heading', { name: 'Offline game client', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect app', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Disconnect app', exact: true })
    .click();
  await expect(page.getByText('You haven’t connected any third-party apps.')).toBeVisible();
  expect(
    (
      await context.request.get(origin + '/api/integration-apps/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
    ).status(),
  ).toBe(401);
  await page.goto(origin + '/settings/link/app?' + query);
  await page.getByRole('button', { name: 'Deny', exact: true }).click();
  await page.waitForURL(/client\.invalid\/callback/);
  expect(new URL(page.url()).searchParams.get('error')).toBe('access_denied');
  await context.clearCookies();
  await page.goto(origin + '/settings?page=apps');
  await expect(page.getByText('You must be logged in to view this page.')).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'App browser checks passed: registration, one-time secret, refresh, responsive layout, consent, unchanged save, denial, revocation and signed-out access.',
  );
} finally {
  await browser.close();
  await sql`delete from "user" where id = ${userId}`;
  await sql.end();
}
