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
const id = `crossfire-access-admin-browser-${randomUUID()}`,
  token = randomUUID(),
  sessionId = randomUUID();
try {
  await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${id},'Access fixture',${id + '@invalid.local'},false,now(),now(),'Access fixture','USD','admin')`;
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
  });
  page.setDefaultTimeout(20000);

  expect((await anonymous.request.get(`${origin}/api/admin/crossfire-access`)).status()).toBe(401);
  await page.goto(`${origin}/admin?page=crossfire-access`);
  await expect(page.getByRole('heading', { name: 'Crossfire access', exact: true })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search users' });
  await search.fill(id);
  await page
    .getByRole('button', { name: 'Grant Crossfire access for Access fixture', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Revoke Crossfire access for Access fixture', exact: true }),
  ).toBeVisible();
  expect((await sql`SELECT role FROM "user" WHERE id=${id}`)[0]!.role).toBe('admin,crossfire');
  await expect(page.locator('a[href="/crossfire"]')).toBeVisible();
  for (const permissions of [{ user: ['set-role'] }, { crossfire: ['access'] }]) {
    const permission = await context.request.post(`${origin}/api/auth/admin/has-permission`, {
      headers: { Origin: origin },
      data: { userId: id, permissions },
    });
    expect(permission.status()).toBe(200);
    expect(await permission.json()).toMatchObject({ success: true });
  }
  await page.setViewportSize({ width: 430, height: 900 });
  await search.fill(id);
  await page
    .getByRole('button', { name: 'Revoke Crossfire access for Access fixture', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Grant Crossfire access for Access fixture', exact: true }),
  ).toBeVisible();
  expect((await sql`SELECT role FROM "user" WHERE id=${id}`)[0]!.role).toBe('admin');
  // Better Auth's native array API also accepts the newly registered role.
  const native = await context.request.post(`${origin}/api/auth/admin/set-role`, {
    headers: { Origin: origin },
    data: { userId: id, role: ['admin', 'crossfire'] },
  });
  expect(native.status()).toBe(200);
  expect((await sql`SELECT role FROM "user" WHERE id=${id}`)[0]!.role).toBe('admin,crossfire');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Crossfire access', exact: true })).toBeVisible();
  await search.fill('no-such-' + id);
  await expect(page.getByText('No matching users.')).toBeVisible();
  for (const role of ['user', 'moderator,crossfire', 'organizer,crossfire', 'crossfire']) {
    await sql`UPDATE "user" SET role=${role} WHERE id=${id}`;
    expect((await context.request.get(`${origin}/api/admin/crossfire-access`)).status()).toBe(403);
    expect(
      (
        await context.request.patch(`${origin}/api/admin/crossfire-access/${id}`, {
          headers: { Origin: origin },
          data: { enabled: true },
        })
      ).status(),
    ).toBe(403);
  }
  await page.reload();
  await expect(page).toHaveURL(origin + '/');
  expect(errors).toEqual([]);
  console.log(
    'Crossfire access admin: self-grant/revoke, preserved admin role, native Better Auth multi-role API, responsive UI, search and forbidden users passed',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM session WHERE id=${sessionId}`;
  await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
