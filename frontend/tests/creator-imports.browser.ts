// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-imports.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

const target = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_HUB_BROWSER_TEST !== '1' ||
  target.hostname !== '127.0.0.1' ||
  !target.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Run explicitly against an isolated development worktree.');
const sql = postgres(target.toString(), { max: 2 });
const random = () => crypto.randomUUID().replaceAll('-', '');
const userId = `creator-import-browser-${random()}`,
  token = random();
const slug = `import-browser-${random()}`;
const channelIds = [0, 1].map(() => `UC${random().slice(0, 22)}`);
const videoId = random().slice(0, 11);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/creator-import-browser/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const payload = {
  kind: 'swubase-creator-import',
  schemaVersion: 1,
  creators: [
    {
      slug,
      name: 'Browser import creator',
      bio: 'A public profile.',
      languages: ['en'],
      specialties: [],
      links: channelIds.map((id, i) => ({
        label: `YouTube ${i + 1}`,
        url: `https://www.youtube.com/channel/${id}`,
        kind: 'social',
      })),
    },
  ],
  videos: [{ videoId, channelId: channelIds[0] }],
};
const upload = (body: unknown) =>
  page.getByLabel('Import file', { exact: true }).setInputFiles({
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(body)),
  });
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, display_name, currency, role, created_at, updated_at)
    VALUES (${userId}, 'Creator import browser', ${userId + '@invalid.local'}, false, ${userId}, 'USD', 'admin', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const cookie = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookie, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0];
  await context.addCookies([
    {
      name: cookie,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  await page.goto(`${origin}/admin?page=creator-imports`);
  await expect(page.getByRole('heading', { name: 'Creator imports', exact: true })).toBeVisible();
  const preview = page.getByRole('button', { name: 'Preview import', exact: true });
  const apply = page.getByRole('button', { name: 'Import profiles and queue videos', exact: true });
  await expect(preview).toBeDisabled();
  await upload({ wrong: 'format' });
  await expect(page.getByRole('alert')).toContainText('schemaVersion');
  await expect(preview).toBeDisabled();
  await upload(payload);
  await expect(preview).toBeEnabled();
  await preview.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Creators (1)', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Videos (1)', exact: true })).toBeVisible();
  expect(await sql`SELECT id FROM creator_profile WHERE slug = ${slug}`).toHaveLength(0);
  await expect(apply).toBeEnabled();
  for (const theme of ['light', 'dark'])
    for (const width of [1440, 390]) {
      await page.evaluate(
        dark => document.documentElement.classList.toggle('dark', dark),
        theme === 'dark',
      );
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({ path: `${screenshots}/${theme}-${width}.png`, fullPage: true });
    }
  await apply.click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Imported 1 creator profiles and queued 1 videos.' }),
  ).toBeVisible();
  const [saved] = await sql`SELECT id, owner_id FROM creator_profile WHERE slug = ${slug}`;
  expect(saved.owner_id).toBeNull();
  expect(
    await sql`SELECT channel_id FROM creator_channel WHERE creator_id = ${saved.id}`,
  ).toHaveLength(2);
  expect(
    await sql`SELECT video_id FROM creator_video_job WHERE video_id = ${videoId}`,
  ).toHaveLength(1);
  await sql`UPDATE creator_profile SET profile = jsonb_set(profile, '{name}', '"Edited import creator"'::jsonb) WHERE id = ${saved.id}`;
  await preview.click();
  await expect(
    page.getByText('Already exists; its profile and ownership will be preserved.'),
  ).toBeVisible();
  await expect(apply).toBeDisabled();
  await upload({ ...payload, creators: [{ ...payload.creators[0], slug: `${slug}-other` }] });
  await preview.click();
  await expect(
    page.getByText('A YouTube channel already belongs to another creator profile.'),
  ).toBeVisible();
  await expect(apply).toBeDisabled();
  await page.route('**/api/admin/creator-imports/preview', route =>
    route.fulfill({ status: 503, json: { message: 'Temporarily unavailable. Try again.' } }),
  );
  await preview.click();
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable. Try again.');
  await page.unroute('**/api/admin/creator-imports/preview');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Creator imports', exact: true })).toBeVisible();
  await expect(preview).toBeDisabled();
  expect(
    (await sql`SELECT profile->>'name' AS name FROM creator_profile WHERE id = ${saved.id}`)[0]
      .name,
  ).toBe('Edited import creator');
  expect(errors).toEqual([]);
  console.log(
    'Creator import browser passed: real admin upload/preview/import, queueing, duplicate/conflict/error states, keyboard access, four responsive/theme combinations and direct route reload.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM creator_profile WHERE slug IN (${slug}, ${slug + '-other'})`;
  await sql`DELETE FROM creator_youtube_channel WHERE channel_id IN ${sql(channelIds)}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
