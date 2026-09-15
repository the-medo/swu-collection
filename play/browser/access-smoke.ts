/** Synthetic accounts only. Run against the already-running development worktree. */
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Select the running worktree database');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 2, onnotice: () => {} }),
  browser = await chromium.launch();
const id = `crossfire-access-browser-${randomUUID()}`,
  token = randomUUID(),
  sessionId = randomUUID();
try {
  await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${id},'Access fixture',${id + '@invalid.local'},false,now(),now(),'Access fixture','USD','user')`;
  await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${sessionId},${token},now()+interval '1 hour',${id},now(),now())`;
  const context = await browser.newContext({ viewport: { width: 1450, height: 1000 } });
  const anonymous = await browser.newContext();
  for (const target of [context, anonymous]) {
    await target.route('https://cdn.amplitude.com/**', route =>
      route.fulfill({ contentType: 'text/javascript', body: 'window.amplitude = { init() {} };' }),
    );
    await target.route('https://api.fontshare.com/**', route =>
      route.fulfill({ contentType: 'text/css', body: '' }),
    );
  }

  await expect
    .poll(async () => (await anonymous.request.get(`${origin}/api/crossfire/invitations`)).status())
    .toBe(401);
  const anonPage = await anonymous.newPage();
  await anonPage.goto(`${origin}/crossfire`);
  await expect(anonPage.getByText('You must be logged in to view this page.')).toBeVisible();
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const cookie = (await serializeSignedCookie(name, token, process.env.BETTER_AUTH_SECRET!)).split(
    ';',
  )[0]!;
  await context.addCookies([
    {
      name,
      value: cookie.slice(cookie.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage(),
    errors: string[] = [];
  page.on('pageerror', e => {
    errors.push(e.message);
    console.log('Page error:', e.message);
  });
  page.setDefaultTimeout(20000);
  let invitationRequests = 0;
  page.on('request', req => {
    if (
      req.url().includes('/api/crossfire/invitations') ||
      req.url().includes('/api/ws/invitations/crossfire')
    )
      invitationRequests++;
  });
  for (const role of ['user', 'moderator', 'admin', 'admin,moderator']) {
    await sql`UPDATE "user" SET role=${role} WHERE id=${id}`;
    for (const path of [
      '/crossfire',
      `/crossfire/${randomUUID()}`,
      `/crossfire/replay/${randomUUID()}`,
      `/crossfire/reports/${randomUUID()}`,
    ]) {
      console.log(`Checking ${role} ${path}`);
      await page.goto(origin + path);
      await expect(page.getByRole('heading', { name: 'Crossfire access required' })).toBeVisible({
        timeout: 20000,
      });
      await expect(page.locator('a[href="/crossfire"]')).toHaveCount(0);
    }
    expect((await context.request.get(`${origin}/api/crossfire/history`)).status()).toBe(403);
    expect(
      (
        await context.request.get(`${origin}/api/ws/invitations/crossfire`, {
          headers: { Origin: origin },
        })
      ).status(),
    ).toBe(403);
  }
  expect(invitationRequests).toBe(0);
  for (const role of ['user,crossfire', 'admin,crossfire', 'moderator,crossfire']) {
    await sql`UPDATE "user" SET role=${role} WHERE id=${id}`;
    await page.goto(`${origin}/crossfire`);
    await expect(page.getByRole('heading', { name: 'Choose your deck' })).toBeVisible();
    await expect(page.locator('a[href="/crossfire"]')).toBeVisible();
    expect((await context.request.get(`${origin}/api/crossfire/invitations`)).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Choose your deck' })).toBeVisible();
  }
  await sql`UPDATE "user" SET role='moderator' WHERE id=${id}`;
  // The invitation heartbeat refetches the session and unmounts the protected subtree.
  await expect(page.getByRole('heading', { name: 'Crossfire access required' })).toBeVisible({
    timeout: 30000,
  });
  await context.clearCookies();
  await page.reload();
  await expect(page.getByText('You must be logged in to view this page.')).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Crossfire roles: API denial, every direct page, combined roles, refresh, live revocation and sign-out passed',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM session WHERE id=${sessionId}`;
  await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
