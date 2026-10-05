// Run from the repository root against a running isolated worktree:
// SWUBASE_USER_REPORTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/scripts/auth-error-smoke.ts
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { serializeSignedCookie } from 'better-call';
import { auth } from '../../server/auth/auth';
const url = new URL(process.env.DATABASE_URL!);
if (
  process.env.SWUBASE_USER_REPORTS_DB_TEST !== '1' ||
  url.hostname !== '127.0.0.1' ||
  !url.pathname.startsWith('/swubase_')
)
  throw Error('Enable SWUBASE_USER_REPORTS_DB_TEST only against an isolated worktree database');
const sql = postgres(url.toString());
const origin = process.env.BETTER_AUTH_URL!;
const id = 'auth-error-browser-' + crypto.randomUUID();
const expiry = new Date(Date.now() + 180000);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: 'Europe/Paris',
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(
  page.getByRole('button', { name: 'Dismiss', exact: true }),
  async () => {
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  },
);
const authContext = await auth.$context;
const cookie = authContext.createAuthCookie('restriction_notice', {
  path: '/api/auth',
  maxAge: 900,
});
const signed = (
  await serializeSignedCookie(
    cookie.name,
    JSON.stringify({ userId: id, expiresAt: Date.now() + 900000 }),
    authContext.secret,
    cookie.attributes,
  )
).split(';')[0]!;
try {
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency,role,banned,ban_expires,ban_reason) VALUES (${id},'Suspension preview',${id + '@invalid.local'},true,now(),now(),${id},'USD','user',true,${expiry},'Private evidence not for display')`;
  await context.addCookies([
    {
      name: cookie.name,
      value: signed.slice(signed.indexOf('=') + 1),
      domain: new URL(origin).hostname,
      path: '/api/auth',
      httpOnly: true,
      secure: cookie.attributes.secure,
      sameSite: 'Lax',
    },
  ]);
  for (const error of ['banned', 'BANNED_USER']) {
    await page.goto(`${origin}/auth/error?error=${error}`);
    await expect(page.getByRole('heading', { name: 'Your account is suspended' })).toBeVisible();
    await expect(page.locator('time')).toHaveAttribute('datetime', expiry.toISOString());
    await expect(page.locator('body')).not.toContainText('Private evidence');
  }
  await page.screenshot({ path: '.swubase/auth-error-desktop.png', animations: 'disabled' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your account is suspended' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.screenshot({ path: '.swubase/auth-error-mobile.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '.swubase/auth-error-mobile-dark.png', animations: 'disabled' });
  await context.clearCookies();
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Last known status: suspended' })).toBeVisible();
  await expect(page.locator('time')).toHaveAttribute('datetime', expiry.toISOString());
  await context.addCookies([
    {
      name: cookie.name,
      value: signed.slice(signed.indexOf('=') + 1),
      domain: new URL(origin).hostname,
      path: '/api/auth',
      httpOnly: true,
      secure: cookie.attributes.secure,
      sameSite: 'Lax',
    },
  ]);
  const imminentExpiry = new Date(Date.now() + 2000);
  await sql`UPDATE "user" SET ban_expires=${imminentExpiry} WHERE id=${id}`;
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(page.locator('time')).toHaveAttribute('datetime', imminentExpiry.toISOString());
  await expect(page.getByRole('heading', { name: 'You can sign in again' })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  let loginBody: { provider?: string; callbackURL?: string; errorCallbackURL?: string } | undefined;
  await context.route('**/api/auth/sign-in/social', route => {
    loginBody = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ redirect: false }),
    });
  });
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click();
  await expect.poll(() => loginBody?.provider).toBe('google');
  expect(loginBody?.callbackURL).toBe('/');
  expect(loginBody?.errorCallbackURL).toBe('/auth/error');
  await page.keyboard.press('Escape');
  await sql`UPDATE "user" SET ban_expires=NULL WHERE id=${id}`;
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your account is banned' })).toBeVisible();
  await expect(
    page.getByText('This ban has no automatic end date.', { exact: false }),
  ).toBeVisible();
  await context.route('**/api/auth/account-restriction', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Fixture failure' }),
    }),
  );
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not check your account status.' }),
  ).toBeVisible();
  await context.unroute('**/api/auth/account-restriction');
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not check your account status.' }),
  ).toHaveCount(0);
  await context.clearCookies();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your account is restricted' })).toBeVisible();
  await page.goto(origin + '/auth/error?error=access_denied&error_description=UNTRUSTED_CONTENT');
  await expect(page.getByRole('heading', { name: 'Unable to sign in' })).toBeVisible();
  await expect(
    page.getByText('Sign-in was cancelled or permission was declined.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText('UNTRUSTED_CONTENT');
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(origin + '/');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Unable to sign in' })).toBeVisible();
  await page.goto(origin + '/api/auth/error?error=banned');
  await expect(page).toHaveURL(origin + '/auth/error?error=banned');
  await expect(page.getByRole('heading', { name: 'Your account is restricted' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: legacy/current restriction codes, live private endpoint, exact expiry, automatic expiry transition, retry login redirects home, indefinite ban, failed fetch/retry, missing proof, generic OAuth error, navigation, mobile/light/dark, stale notice expiry, legacy error redirect; no real accounts changed.',
  );
} finally {
  await sql`DELETE FROM "user" WHERE id=${id}`;
  await browser.close();
  await sql.end();
}
