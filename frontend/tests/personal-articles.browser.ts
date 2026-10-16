// PERSONAL_ARTICLES_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/personal-articles.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.PERSONAL_ARTICLES_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable explicitly against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Use a development origin.');
const db = postgres(database.toString(), { max: 2 });
const suffix = randomUUID();
const userId = `personal-browser-${suffix}`,
  token = randomUUID(),
  claimedId = randomUUID();
const displayName = `Writer ${suffix.slice(0, 8)}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const anonymous = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage(),
  visitor = await anonymous.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
for (const current of [page, visitor]) {
  current.on('pageerror', error => errors.push(error.message));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
const screenshots = new URL('../../.swubase/article-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const coverUrl = 'https://images.swubase.com/article-layout-fixture.svg';
for (const current of [context, anonymous])
  await current.route(coverUrl, route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#486d5c"/><circle cx="1250" cy="180" r="250" fill="#ddbc71"/><path d="M0 600L550 40L1200 600Z" fill="#253c38"/></svg>',
    }),
  );
const api = `${origin}/api/creator-hub`;
const headers = { 'X-Requested-With': 'swubase' };
async function post(path: string, data: unknown) {
  const response = await page.request.post(`${api}${path}`, { headers, data });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}
try {
  await db`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, 'Private legal name', ${userId + '@invalid.local'}, false, now(), now(), ${displayName}, 'USD')`;
  await db`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
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
  await page.goto(`${origin}/creator-studio`);
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await expect(page.getByLabel('Publish as')).toHaveValue('');
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await expect(page.getByLabel('Medium', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Chapters', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Video description', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Pin on creator profile' })).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('A personal tournament story');
  await page
    .getByLabel('Summary', { exact: true })
    .fill('A weekend of close games, good company and lessons for the next event.');
  await page.getByRole('button', { name: 'Add cover image', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Article cover' })
    .getByLabel('Cover image', { exact: true })
    .fill(coverUrl);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const editor = page.getByRole('article', { name: 'Article editor' });
  await expect(editor.locator('header img')).toHaveAttribute('src', coverUrl);
  await page.getByRole('button', { name: 'Change cover image', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove cover', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add cover image', exact: true })).toBeFocused();
  await expect(editor.locator('header img')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await page.getByLabel('Cover image', { exact: true }).fill(coverUrl);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByText('Start with a template', { exact: true }).click();
  await page.getByRole('button', { name: 'Tournament report template', exact: true }).click();
  await expect(editor.locator('[contenteditable=true]')).toContainText('Event and preparation');
  const connection = page.getByRole('region', { name: 'Connect to SWUBASE', exact: true });
  expect((await connection.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await editor.boundingBox())!.y + (await editor.boundingBox())!.height,
  );
  await page.getByText('Start with a template', { exact: true }).click();
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (
      !(await page.locator('html').evaluate((el, value) => el.classList.contains(value), theme))
    ) {
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page
        .getByLabel('Title', { exact: true })
        .fill(
          'A personal tournament story: everything I learned about preparing, playing close games and making better decisions at my first major event',
        );
      await expect
        .poll(() =>
          page
            .getByLabel('Title', { exact: true })
            .evaluate(el => el.scrollHeight - el.clientHeight),
        )
        .toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByLabel('Title', { exact: true }).fill('A personal tournament story');
      await page.getByLabel('Title', { exact: true }).blur();
      await expect(editor.locator('.bn-container')).toHaveAttribute('data-color-scheme', theme);
      await editor.locator('.bn-block-content').first().hover();
      const blockMenu = page.locator('.bn-side-menu');
      await expect(blockMenu).toBeVisible();
      const menuBounds = (await blockMenu.boundingBox())!;
      const articleBounds = (await editor.boundingBox())!;
      expect(menuBounds.x).toBeGreaterThanOrEqual(articleBounds.x);
      expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(
        articleBounds.x + articleBounds.width,
      );
      await blockMenu.getByRole('button', { name: 'Open block menu', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.mouse.move(0, 0);
      // Capture the article itself without the floating publication toolbar over it.
      await editor.screenshot({
        path: `${screenshots}/inline-editor-${width}-${theme}.png`,
        style: '.sticky { position: static !important; }',
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Article preview' }).locator('header img'),
  ).toHaveAttribute('src', coverUrl);
  await expect(
    page.getByRole('heading', { name: 'A personal tournament story', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'A personal tournament story',
  );
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish update', exact: true })).toBeVisible();
  const article = (await (await page.request.get(`${api}/personal/articles`)).json()).data.items[0];
  const detail = (await (await page.request.get(`${api}/creations/${article.id}`)).json()).data;
  const privateArticle = await post('/creations', {
    creatorId: null,
    document: { ...detail.document, title: 'Private personal draft' },
  });
  await visitor.goto(`${origin}/content/${article.id}`);
  await expect(visitor.locator('article header img[src="' + coverUrl + '"]')).toHaveCount(1);
  await expect(visitor.locator('article img[src="' + coverUrl + '"]')).toHaveCount(1);
  await expect(
    visitor.getByRole('heading', { name: detail.document.title, exact: true }),
  ).toBeVisible();
  await expect(visitor.getByRole('link', { name: displayName, exact: true })).toBeVisible();
  expect(await visitor.locator('body').innerText()).not.toContain('Private legal name');
  await expect(
    visitor.getByRole('heading', { name: 'Event and preparation', exact: true }),
  ).toBeVisible();
  await visitor.locator('html').evaluate(el => {
    el.classList.remove('dark');
    el.classList.add('light');
  });
  await visitor.screenshot({ path: `${screenshots}/personal-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Create creator profile', exact: true }).click();
  await expect(page.getByLabel('Creator or brand name')).toHaveValue(displayName);
  await page.getByLabel('Creator or brand name').fill('The Personal Press');
  await page.getByLabel('Profile address').fill(`personal-${suffix}`);
  await expect(page.getByRole('checkbox', { name: /Move all 2 personal articles/ })).toBeChecked();
  await page.screenshot({ path: `${screenshots}/onboarding-desktop.png`, fullPage: true });
  const onboardingAttempts: unknown[] = [];
  await page.route(`${api}/creators/onboard`, async route => {
    onboardingAttempts.push(route.request().postDataJSON());
    if (onboardingAttempts.length === 1) {
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      await route.fulfill({
        status: 503,
        json: { message: 'The response was lost after saving.' },
      });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Create profile and move articles', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retry profile creation', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Profile address')).toBeDisabled();
  await expect(page.getByLabel('Creator or brand name')).toBeDisabled();
  await page.getByRole('button', { name: 'Retry profile creation', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Your creations', exact: true })).toBeVisible();
  expect(onboardingAttempts).toHaveLength(2);
  expect(onboardingAttempts[0]).toEqual(onboardingAttempts[1]);
  await page.unroute(`${api}/creators/onboard`);
  const profiles = (await (await page.request.get(`${api}/mine`)).json()).data;
  expect(profiles).toHaveLength(1);
  const creator = profiles[0];
  await expect(page.getByLabel('Publish as')).toHaveValue(creator.id);
  await expect(
    page.getByRole('heading', { name: 'Private personal draft', exact: true }),
  ).toBeVisible();
  expect((await visitor.request.get(`${api}/creations/${privateArticle.id}`)).status()).toBe(404);
  await visitor.reload();
  await expect(
    visitor.getByRole('link', { name: 'The Personal Press', exact: true }),
  ).toBeVisible();
  await expect(visitor.getByText('Written by')).toBeVisible();
  await page.getByLabel('Publish as').selectOption('');
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Still writing personally');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const existingProfile = (await (await page.request.get(`${api}/creators/${creator.slug}`)).json())
    .data;
  await db`INSERT INTO creator_profile (id, slug, profile) VALUES (${claimedId}, ${`claimed-${suffix}`}, ${db.json({ ...existingProfile, slug: `claimed-${suffix}`, name: 'Claimed Press' })})`;
  // Simulate the existing staff assignment; no automatic personal transfer occurs.
  await db`UPDATE creator_profile SET owner_id = ${userId} WHERE id = ${claimedId}`;
  await page.reload();
  await page.getByLabel('Publish as').selectOption(claimedId);
  await expect(
    page.getByRole('button', { name: 'Move all personal articles', exact: true }),
  ).toBeVisible();
  const transferRequests: string[] = [];
  await page.route(`${api}/creators/${claimedId}/transfer-articles`, async route => {
    transferRequests.push(route.request().postDataJSON().requestId);
    const committed = await route.fetch();
    expect(committed.ok()).toBe(true);
    if (transferRequests.length === 1)
      await post('/creations', {
        creatorId: null,
        document: { ...detail.document, title: 'Written after the transfer cutoff' },
      });
    await route.fulfill({ response: committed });
  });
  await page.getByRole('button', { name: 'Move all personal articles', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Still writing personally', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Move all personal articles', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Move all personal articles', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Written after the transfer cutoff', exact: true }),
  ).toBeVisible();
  expect(transferRequests).toHaveLength(2);
  expect(transferRequests[0]).not.toBe(transferRequests[1]);
  await page.unroute(`${api}/creators/${claimedId}/transfer-articles`);
  await expect(
    page.getByRole('button', { name: 'Move all personal articles', exact: true }),
  ).toHaveCount(0);
  const race = await post('/creations', {
    creatorId: null,
    document: { ...detail.document, title: 'Another tab transfer' },
  });
  await page.goto(`${origin}/creator-studio?creationId=${race.id}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Another tab transfer');
  await post(`/creators/${claimedId}/transfer-articles`, { requestId: randomUUID() });
  await page.getByLabel('Title', { exact: true }).fill('Local edits survive transfer');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Save my version instead', exact: true }),
  ).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Save my version instead', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await expect(page.getByLabel('Publish as')).toHaveValue(claimedId);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Local edits survive transfer',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const loadRace = await post('/creations', {
    creatorId: null,
    document: { ...detail.document, title: 'Reload transferred draft' },
  });
  await page.goto(`${origin}/creator-studio?creationId=${loadRace.id}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Reload transferred draft');
  await post(`/creators/${claimedId}/transfer-articles`, { requestId: randomUUID() });
  await page.getByLabel('Title', { exact: true }).fill('Discard this local edit');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load saved draft', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Load saved draft', exact: true }).click();
  await expect(page.getByLabel('Publish as')).toHaveValue(claimedId);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Reload transferred draft');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  // Old article drafts may contain fields from the former shared media form.
  const sets = (
    await (await page.request.get(`${api}/subjects?type=set&q=&scope=authoring`)).json()
  ).data;
  const legacyDocument = {
    ...detail.document,
    title: 'An older article draft',
    videoDescription: 'An obsolete video description',
    chapters: [{ title: 'An obsolete chapter', startSeconds: 60 }],
    references: [{ type: 'set', id: sets[0].id, startSeconds: 60 }],
  };
  const legacy = await post('/creations', { creatorId: null, document: legacyDocument });
  await page.goto(`${origin}/creator-studio?creationId=${legacy.id}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(legacyDocument.title);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  const cleaned = (await (await page.request.get(`${api}/creations/${legacy.id}/draft`)).json())
    .data;
  expect(cleaned.document.chapters).toEqual([]);
  expect(cleaned.document.videoDescription).toBe('');
  expect(cleaned.document.references[0].startSeconds).toBeNull();
  const oldRevisions = (
    await (await page.request.get(`${api}/creations/${legacy.id}/revisions`)).json()
  ).data;
  expect(
    oldRevisions.find((row: { revision: number }) => row.revision === legacy.revision).document
      .chapters,
  ).toEqual(legacyDocument.chapters);
  await page.getByRole('button', { name: 'Revision history', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page
    .getByText(new RegExp(`^Revision ${legacy.revision} ·`))
    .locator('..')
    .getByRole('button', { name: 'Restore to draft' })
    .click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish update', exact: true })).toBeVisible();
  const publishedLegacy = (await (await page.request.get(`${api}/creations/${legacy.id}`)).json())
    .data;
  expect(publishedLegacy.document.chapters).toEqual([]);
  expect(publishedLegacy.document.references[0].startSeconds).toBeNull();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('html').evaluate(el => {
    el.classList.remove('light');
    el.classList.add('dark');
  });
  await page.screenshot({ path: `${screenshots}/creator-mobile-dark.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Publish as').selectOption('');
  await expect(page.getByRole('button', { name: 'Write an article', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Personal authoring, public attribution, onboarding transfer, claimed creator transfer, continued personal writing, and stale-editor recovery passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await db`DELETE FROM creator_profile WHERE id = ${claimedId}`;
  await db`DELETE FROM "user" WHERE id = ${userId}`;
  await db.end();
}
