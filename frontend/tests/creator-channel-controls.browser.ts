// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-channel-controls.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_HUB_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Run explicitly against an isolated development worktree.');
const sql = postgres(database.toString(), { max: 2 });
const random = () => crypto.randomUUID().replaceAll('-', '');
const creatorId = crypto.randomUUID(),
  creationId = crypto.randomUUID();
const userId = `channel-controls-browser-${random()}`,
  token = crypto.randomUUID();
const channelIds = [0, 1].map(() => `UC${random().slice(0, 22)}`);
const title = 'Channel controls browser video';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [],
  fetched: string[] = [];
const screenshots = new URL('../../.swubase/channel-controls-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
page.setDefaultTimeout(20_000);
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, display_name, currency, role, created_at, updated_at)
    VALUES (${userId}, 'Channel controls browser', ${userId + '@invalid.local'}, false, ${userId}, 'USD', 'user', now(), now())`;
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
  const profile = creatorProfileSchema.parse({
    slug: `channel-browser-${creatorId}`,
    name: 'Channel controls browser',
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  });
  await sql`INSERT INTO creator_profile (id, slug, owner_id, profile) VALUES (${creatorId}, ${profile.slug}, ${userId}, ${sql.json(profile)})`;
  for (const [i, channelId] of channelIds.entries()) {
    await sql`INSERT INTO creator_youtube_channel (channel_id, title) VALUES (${channelId}, ${i ? 'Second channel' : 'Main channel'})`;
    await sql`INSERT INTO creator_channel (creator_id, channel_id, origin) VALUES (${creatorId}, ${channelId}, 'oauth')`;
    await sql`INSERT INTO creator_youtube (creator_id, channel_id, access_token, expires_at) VALUES (${creatorId}, ${channelId}, 'browser-fixture', now())`;
  }
  const document = creationDocumentSchema.parse({
    title,
    medium: 'video',
    body: emptyPostDocument(),
    sourceUrl: `https://www.youtube.com/watch?v=${random().slice(0, 11)}`,
    tags: [],
    references: [],
    chapters: [],
  });
  await sql`INSERT INTO creation (id, creator_id, source_video_id, draft) VALUES (${creationId}, ${creatorId}, ${new URL(document.sourceUrl).searchParams.get('v')}, ${sql.json(document)})`;
  // HTTP/UI contract tests use no live YouTube or Gemini requests. Backend integration tests exercise discovery.
  await page.route(`**/api/creator-hub/creators/${creatorId}/youtube`, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.fetchingConfigured = true;
    await route.fulfill({ response, json: body });
  });
  await page.route(`**/api/creator-hub/creators/${creatorId}/youtube/fetch`, async route => {
    const { channelId } = route.request().postDataJSON();
    fetched.push(channelId);
    await sql`UPDATE creator_youtube_channel SET last_manual_fetch_at = now() WHERE channel_id = ${channelId}`;
    if (channelId === channelIds[1])
      await route.fulfill({
        status: 503,
        json: { message: 'YouTube is temporarily unavailable. Try again in five minutes.' },
      });
    else await route.fulfill({ json: { data: { enqueued: 2, incomplete: false } } });
  });
  const studioUrl = `${origin}/creator-studio?creatorId=${creatorId}&youtube=connected&youtubeChannelId=${channelIds[0]}`;
  await page.goto(studioUrl);
  const primary = page.getByRole('switch', { name: 'Auto-import from Main channel', exact: true });
  const secondary = page.getByRole('switch', {
    name: 'Auto-import from Second channel',
    exact: true,
  });
  await expect(primary).toBeChecked();
  await expect(secondary).toBeChecked();
  await primary.focus();
  await page.keyboard.press('Space');
  await expect(primary).not.toBeChecked();
  await expect
    .poll(
      async () =>
        (
          await sql`SELECT auto_import_enabled FROM creator_youtube_channel WHERE channel_id = ${channelIds[0]}`
        )[0].auto_import_enabled,
    )
    .toBe(false);
  await expect(secondary).toBeChecked();
  const mainFetch = page.getByRole('button', { name: 'Fetch new videos from Main channel' });
  const secondFetch = page.getByRole('button', { name: 'Fetch new videos from Second channel' });
  await expect(mainFetch).toBeEnabled();
  await mainFetch.click();
  await expect(
    page.getByText('2 videos queued. They will appear after background processing.'),
  ).toBeVisible();
  await expect(mainFetch).toBeDisabled();
  await expect(secondFetch).toBeEnabled();
  await secondFetch.click();
  await expect(
    page.getByText('YouTube is temporarily unavailable. Try again in five minutes.'),
  ).toBeVisible();
  await expect(secondFetch).toBeDisabled();
  expect(fetched).toEqual(channelIds);
  await page.reload();
  await expect(primary).not.toBeChecked();
  await expect(mainFetch).toBeDisabled();
  await expect(secondary).toBeChecked();
  const sidebar = page.locator('[data-sidebar="sidebar"]');
  for (const href of ['/content', '/creators', '/creator-studio'])
    await expect(sidebar.locator(`a[href="${href}"]`)).toHaveCount(0);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      theme => document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    );
    await page.setViewportSize({ width: theme === 'light' ? 1440 : 390, height: 1000 });
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `${screenshots}/${theme}.png` });
  }
  await page.goto(`${origin}/creator-studio?creatorId=${creatorId}&creationId=${creationId}`);
  await expect(
    page.getByText(
      'Edits saved here are marked as manual changes, so future YouTube updates can preserve them.',
    ),
  ).toBeVisible();
  await expect(page.locator('.bn-editor')).toBeVisible();
  // Opening the editor must not trigger autosave or claim any imported fields.
  await page.waitForTimeout(2_500);
  expect(
    (await sql`SELECT revision, manually_edited_fields FROM creation WHERE id = ${creationId}`)[0],
  ).toMatchObject({ revision: 1, manually_edited_fields: [] });
  await page.getByLabel('Title', { exact: true }).fill('My edited SWU title');
  await expect
    .poll(
      async () =>
        (await sql`SELECT manually_edited_fields FROM creation WHERE id = ${creationId}`)[0]
          .manually_edited_fields,
    )
    .toEqual(['title']);
  await expect(page.getByText(/Protected fields:.*title/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My edited SWU title');
  expect(errors).toEqual([]);
  console.log(
    'Channel controls browser checks passed: ownership UI, independent channels, keyboard toggle, fetch feedback/errors, persisted cooldown, responsive themes, hidden navigation and manual edit flags.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM creator_profile WHERE id = ${creatorId}`;
  await sql`DELETE FROM creator_youtube_channel WHERE channel_id IN ${sql(channelIds)}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
