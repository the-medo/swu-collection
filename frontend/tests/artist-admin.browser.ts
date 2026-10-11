// ARTIST_ADMIN_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artist-admin.browser.ts
/* global process, Buffer */
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir, readFile } from 'node:fs/promises';
import { artistExportSchema } from '../../shared/types/artistTransfer';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.ARTIST_ADMIN_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw Error('Enable only against an isolated development worktree.');
const sql = postgres(database.toString(), { max: 1 });
const suffix = crypto.randomUUID();
const users = [`artist-admin-${suffix}`, `artist-reader-${suffix}`];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const screenshots = new URL('../../.swubase/artist-admin/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const apiPath = '/api/admin/artists';
const cookieName = getCookies({
  baseURL: origin,
  advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
}).sessionToken.name;
async function signedCookie(user: string, role: string) {
  const token = crypto.randomUUID();
  await sql`INSERT INTO "user" (id,name,display_name,email,email_verified,country,currency,role,created_at,updated_at)
    VALUES (${user},${user},${user},${user + '@invalid.local'},false,'FR','USD',${role},now(),now())`;
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at)
    VALUES (${crypto.randomUUID()},${token},now()+interval '1 hour',${user},now(),now())`;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  return {
    name: cookieName,
    value: signed.slice(signed.indexOf('=') + 1),
    url: origin,
    httpOnly: true,
    secure: origin.startsWith('https:'),
    sameSite: 'Lax' as const,
  };
}
async function checkDenied(status: number) {
  for (const path of ['', '/snapshots', '/export'])
    expect((await context.request.get(origin + apiPath + path)).status()).toBe(status);
  for (const path of ['/publish', '/upload', '/preview', '/apply'])
    expect((await context.request.post(origin + apiPath + path, { data: {} })).status()).toBe(
      status,
    );
}
try {
  await checkDenied(401);
  await context.addCookies([await signedCookie(users[1], 'user')]);
  await checkDenied(403);
  await page.goto(origin + '/admin?page=artists');
  await expect(page).toHaveURL(origin + '/');
  await context.clearCookies();
  await context.addCookies([await signedCookie(users[0], 'admin')]);
  const realStatus = await context.request.get(origin + apiPath);
  expect(realStatus.ok()).toBe(true);
  expect(realStatus.headers()['cache-control']).toBe('no-store');
  const initialStatus = (await realStatus.json()).data;
  await page.goto(origin + '/admin?page=artists');
  await expect(page.getByRole('heading', { name: 'Artist showcase', exact: true })).toBeVisible();
  if (!initialStatus.storage.configured) {
    await expect(page.getByText('R2 storage is not configured')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish database to R2' })).toBeDisabled();
  }
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const downloaded = await downloading;
  const exported = artistExportSchema.parse(
    JSON.parse(await readFile((await downloaded.path())!, 'utf8')),
  );
  expect(exported.artists.length).toBe(initialStatus.database.profiles);
  await expect(page.getByRole('button', { name: 'Preview import' })).toBeDisabled();
  console.log('PASS: real admin/non-admin/anonymous access and database JSON download.');

  const snapshot = {
    key: 'artist-profiles/2026-10-11-release.json',
    uploadedAt: '2026-10-11T12:00:00Z',
    bytes: 42000,
  };
  const second = {
    ...snapshot,
    key: 'artist-profiles/2026-10-12-release.json',
    uploadedAt: '2026-10-12T12:00:00Z',
  };
  let applyCount = 0;
  let uploadCount = 0;
  let publishCount = 0;
  let previewCount = 0;
  let statusCount = 0;
  let applied = false;
  let configured = false;
  let hasSnapshots = false;
  await page.route(origin + apiPath + '**', async route => {
    const path = new URL(route.request().url()).pathname.slice(apiPath.length);
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '' || path === '/') {
      statusCount++;
      return json({
        data: {
          database: { profiles: applied ? 180 : 179, links: 199, aliases: 37 },
          storage: { configured, bucket: configured ? 'artist-snapshots-fixture' : null },
        },
      });
    }
    if (path === '/snapshots') return json({ data: { snapshots: hasSnapshots ? [snapshot] : [] } });
    if (path === '/publish') {
      publishCount++;
      return json({ data: second }, 201);
    }
    if (path === '/upload') {
      uploadCount++;
      expect(artistExportSchema.safeParse(route.request().postDataJSON()).success).toBe(true);
      return json({ data: second }, 201);
    }
    if (path === '/preview') {
      previewCount++;
      const input = route.request().postDataJSON();
      return json({
        data: {
          ...input,
          sha256: 'a'.repeat(64),
          expectedState: 'b'.repeat(64),
          exportedAt: snapshot.uploadedAt,
          summary: { profiles: 1, links: 1, aliases: 1 },
          changes: [{ key: 'fixture artist', action: 'create', links: 1 }],
          aliasChanges: [{ key: 'fixture credit', canonicalKey: 'fixture artist' }],
        },
      });
    }
    if (path === '/apply') {
      applyCount++;
      expect(route.request().postDataJSON()).toMatchObject({
        sha256: 'a'.repeat(64),
        expectedState: 'b'.repeat(64),
        source: { kind: 'r2', key: second.key },
      });
      if (applyCount === 1)
        return json(
          { message: 'Artist data changed since the preview. Preview the import again.' },
          409,
        );
      applied = true;
      return json({ data: { changes: [], aliasChanges: [] } });
    }
    throw new Error('Unexpected mocked route: ' + path);
  });
  await page.reload();
  await expect(page.getByText('R2 storage is not configured')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Snapshot', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Preview import' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Publish database to R2' })).toBeDisabled();
  configured = true;
  await page.reload();
  await expect(
    page.getByText('No R2 snapshots yet. Publish one from development first.'),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Snapshot', exact: true })).toBeDisabled();
  hasSnapshots = true;
  await page.getByRole('button', { name: 'Refresh snapshots' }).click();
  await page.getByRole('combobox', { name: 'Snapshot', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Bundled artist research' })).toHaveCount(0);
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Publish database to R2' }).click();
  await expect(page.getByRole('status')).toContainText('Snapshot uploaded');
  expect(publishCount).toBe(1);
  await expect(page.getByText(second.key, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByRole('button', { name: 'Apply import' })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Import mode' }).click();
  await page.getByRole('option', { name: 'Replace included profiles' }).click();
  await expect(page.getByRole('button', { name: 'Apply import' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview import' }).click();
  await page.getByText('Review changes', { exact: true }).click();
  await expect(page.getByText('fixture credit → fixture artist')).toBeVisible();
  await page.getByRole('button', { name: 'Apply import' }).click();
  await expect(page.getByRole('alert')).toContainText('Artist data changed');
  await expect(page.getByRole('button', { name: 'Apply import' })).toBeDisabled();
  await page.getByRole('button', { name: 'Preview import' }).click();
  await page.getByRole('button', { name: 'Apply import' }).click();
  await expect(page.getByRole('status')).toContainText('Artist data imported successfully');
  await expect(page.locator('dd').first()).toHaveText('180');
  expect(statusCount).toBeGreaterThan(1);
  expect(previewCount).toBe(3);
  expect(applyCount).toBe(2);
  await page.getByLabel('Artist JSON file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid artist snapshot');
  expect(uploadCount).toBe(0);
  await page.getByLabel('Artist JSON file').setInputFiles({
    name: 'artists.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.getByRole('status')).toContainText('Snapshot uploaded');
  expect(uploadCount).toBe(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByRole('button', { name: 'Apply import' })).toBeVisible();
  await page.screenshot({ path: screenshots + 'desktop.png', fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole('button', { name: 'Apply import' })).toBeVisible();
  }
  await page.screenshot({ path: screenshots + 'mobile.png', fullPage: true });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Artist showcase', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/light/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: screenshots + 'light-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    'PASS: publish/upload validation, source selection, merge/replace previews, stale preview rejection, apply, refreshed counts and responsive layout.',
  );
} catch (error) {
  await page.screenshot({ path: screenshots + 'failure.png', fullPage: true });
  console.error('Page:', page.url(), 'Runtime errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-2500));
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM "user" WHERE id IN (${users[0]},${users[1]})`;
  await sql.end();
}
