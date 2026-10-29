// CREATOR_STUDIO_SECTIONS_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-studio-sections.browser.ts
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
  process.env.CREATOR_STUDIO_SECTIONS_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Use an explicitly enabled local worktree.');
const db = postgres(database.toString(), { max: 2 });
const owner = `studio-sections-${crypto.randomUUID()}`,
  token = crypto.randomUUID();
const creatorId = crypto.randomUUID(),
  name = 'Studio sections fixture';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const shots = '.swubase/studio-sections';
await mkdir(shots, { recursive: true });
try {
  await db`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${owner}, ${name}, ${owner}, ${owner + '@invalid.local'}, false, 'USD', now(), now())`;
  await db`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${owner}, now(), now())`;
  const profile = creatorProfileSchema.parse({
    name,
    slug: owner,
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  });
  await db`INSERT INTO creator_profile (id, slug, owner_id, profile) VALUES (${creatorId}, ${profile.slug}, ${owner}, ${db.json(profile)})`;
  const ids: Record<string, string> = {};
  for (const medium of ['article', 'video', 'audio', 'external'] as const) {
    const document = creationDocumentSchema.parse({
      title: `Fixture ${medium}`,
      medium,
      body: emptyPostDocument(),
      language: 'en',
      tags: [],
      references: [],
      chapters: [],
      sourceUrl: medium === 'article' ? '' : 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    ids[medium] = crypto.randomUUID();
    await db`INSERT INTO creation (id, creator_id, author_id, draft) VALUES (${ids[medium]}, ${creatorId}, ${owner}, ${db.json(document)})`;
  }
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
  const nav = page.getByRole('navigation', { name: 'Studio sections' });
  const library = page.locator('[data-studio-results]');
  await page.goto(`${origin}/creator-studio?creatorId=${creatorId}`);
  await expect(page.getByRole('heading', { name: 'Creator studio', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open articles', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open videos', exact: true })).toBeVisible();
  await expect(library.getByRole('heading')).toHaveCount(4);
  await page.screenshot({ path: `${shots}/overview-desktop.png`, fullPage: true });
  await nav.getByRole('link', { name: 'Articles', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/creator-studio/articles\\?creatorId=${creatorId}`));
  await expect(nav.getByRole('link', { name: 'Articles', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(library.getByRole('heading')).toHaveText(['Fixture article']);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await page.getByLabel('Publication status').selectOption('draft');
  await page.getByLabel('Search your creations').fill('Fixture article');
  await page.getByRole('button', { name: 'Search creations', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Publication status')).toHaveValue('draft');
  await expect(page.getByLabel('Search your creations')).toHaveValue('Fixture article');
  await nav.getByRole('link', { name: 'Videos', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/creator-studio/videos\\?creatorId=${creatorId}$`));
  await expect(library.getByRole('heading')).toHaveText(['Fixture video']);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'YouTube connection', exact: true })).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Connections & editors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'YouTube connection', exact: true })).toHaveCount(
    1,
  );
  await expect(page.getByRole('heading', { name: 'Editors', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connections & editors', exact: true }).click();
  await page.screenshot({ path: `${shots}/videos-desktop.png`, fullPage: true });
  await library.getByRole('link', { name: 'Fixture video', exact: true }).click();
  await expect(page).toHaveURL(/\/creator-studio\/videos\?.*creationId=/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Fixture video');
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Fixture video');
  const savePath = `**/api/creator-hub/creations/${ids.video}`;
  await page.route(savePath, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Save failure fixture' }),
    }),
  );
  await page.getByLabel('Summary', { exact: true }).fill('An unsaved summary');
  let preventedLeave = false;
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('Leave with unsaved changes?');
    preventedLeave = true;
    await dialog.dismiss();
  });
  await nav.getByRole('link', { name: 'Articles', exact: true }).click();
  await expect.poll(() => preventedLeave).toBe(true);
  await expect(page).toHaveURL(/\/creator-studio\/videos\?.*creationId=/);
  await expect(page.getByLabel('Summary', { exact: true })).toHaveValue('An unsaved summary');
  await page.getByLabel('Summary', { exact: true }).fill('');
  await page.unroute(savePath);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(library.getByRole('heading')).toHaveText(['Fixture video']);
  await page.goBack();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Fixture video');
  await page.goForward();
  await expect(library.getByRole('heading')).toHaveText(['Fixture video']);
  await page.getByLabel('Publish as', { exact: true }).selectOption('');
  await expect(
    page.getByRole('heading', { name: 'Choose a creator profile for your videos', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share a video', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Articles', exact: true }).click();
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Personal studio draft');
  await page
    .locator('.bn-editor[contenteditable=true]')
    .first()
    .fill('Practice resource choices before a match.');
  await expect(page).toHaveURL(/\/creator-studio\/articles\?.*creationId=/);
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Personal studio draft');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(library.getByRole('heading')).toHaveText(['Personal studio draft']);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      localStorage.setItem('vite-ui-theme', value);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    await expect(nav.getByRole('link', { name: 'Videos', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `${shots}/articles-mobile-${theme}.png`, fullPage: true });
  }
  await page.goto(`${origin}/creator-studio?creatorId=${creatorId}&creationId=${ids.video}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Fixture video');
  await page.goto(`${origin}/creator-studio?creatorId=${creatorId}&youtube=connected`);
  await expect(page).toHaveURL(/\/creator-studio\/videos\?.*youtube=connected/);
  await expect(page.getByRole('heading', { name: 'YouTube connection', exact: true })).toHaveCount(
    1,
  );
  await page.goto(
    `${origin}/creator-studio?creatorId=${creatorId}&youtube=failed&youtubeError=channel_mismatch`,
  );
  await expect(page).toHaveURL(/\/creator-studio\/videos\?.*youtube=failed/);
  await expect(page.getByRole('alert')).toContainText('That YouTube channel does not belong');
  const visitor = await browser.newPage();
  await visitor.goto(`${origin}/creator-studio/videos?creatorId=${creatorId}`);
  await expect(
    visitor.getByText('You must be logged in to view this page.', { exact: true }),
  ).toBeVisible();
  await expect(visitor.locator('[data-studio-results]')).toHaveCount(0);
  await visitor.close();
  expect(errors).toEqual([]);
  console.log(
    'Studio sections passed: overview, article/video filtering, YouTube controls, personal publishing, draft save/reload, back/forward, legacy URLs, anonymous access, mobile and both themes.',
  );
} catch (error) {
  await page.screenshot({ path: `${shots}/failure.png`, fullPage: true });
  console.log('Failed at:', page.url());
  throw error;
} finally {
  await browser.close();
  await db`DELETE FROM creator_profile WHERE id = ${creatorId}`;
  await db`DELETE FROM "user" WHERE id = ${owner}`;
  await db.end();
}
