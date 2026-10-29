// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-ux.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import { mkdir } from 'node:fs/promises';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_HUB_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw new Error('Use an explicitly enabled isolated worktree.');
const sql = postgres(database.toString(), { max: 2 });
const userId = `ux-browser-${crypto.randomUUID()}`,
  token = crypto.randomUUID();
const creatorId = crypto.randomUUID(),
  slug = `ux-${creatorId}`,
  name = `UX Journey ${creatorId}`;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = '.swubase/creator-ux-screenshots';
await mkdir(screenshots, { recursive: true });
const profile = creatorProfileSchema.parse({
  slug,
  name,
  bio: emptyPostDocument(),
  languages: ['en'],
  specialties: [],
  links: [],
});
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, ${name}, ${userId + '@invalid.local'}, false, now(), now(), ${name}, 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  await sql`INSERT INTO creator_profile (id, slug, owner_id, profile) VALUES (${creatorId}, ${slug}, ${userId}, ${sql.json(profile)})`;
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
  for (let i = 0; i < 26; i++) {
    const document = creationDocumentSchema.parse({
      title: `${name} lesson ${i}`,
      medium: 'article',
      language: 'en',
      body: {
        version: 1,
        blocks: [
          {
            id: crypto.randomUUID(),
            type: 'paragraph',
            props: {},
            content: [
              { type: 'text', text: 'Practice resource decisions with this guide.', styles: {} },
            ],
            children: [],
          },
        ],
      },
      tags: [],
      references: [],
      chapters: [],
    });
    const creationId = crypto.randomUUID();
    await sql`INSERT INTO creation (id, creator_id, author_id, draft, published, published_revision, published_at)
      VALUES (${creationId}, ${creatorId}, ${userId}, ${sql.json(document)}, ${sql.json(document)}, 1, now())`;
    await sql`INSERT INTO creation_tag (creation_id, tag_id) VALUES (${creationId}, ${'medium:article'})`;
  }
  const directoryUrl = `${origin}/creators?q=${encodeURIComponent(name)}&language=en`;
  await page.goto(directoryUrl);
  await expect(page.getByLabel('Find a creator')).toHaveValue(name);
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page.getByLabel('Find a creator')).toHaveValue(name);
  await page.reload();
  await expect(page.getByLabel('Find a creator')).toHaveValue(name);
  await page.getByLabel('Find a creator').fill(`UX ${creatorId}`);
  await page
    .getByLabel('Find a creator')
    .evaluate((element: HTMLInputElement) => element.setSelectionRange(3, 3));
  await page.getByLabel('Find a creator').pressSequentially('Journey ', { delay: 10 });
  await expect(page.getByLabel('Find a creator')).toHaveValue(name);
  await page.getByRole('button', { name: 'Search creators', exact: true }).click();
  await page.getByRole('link', { name, exact: true }).click();
  await page.getByRole('link', { name: /^Articles \(/ }).click();
  await page.locator('[aria-label="Creator publications"] article h3 a').first().click();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/creators/${slug}/articles`));
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page.getByLabel('Find a creator')).toHaveValue(name);

  await page.goto(`${origin}/content?creatorId=${creatorId}&language=en&page=2`);
  await page.locator('[aria-label="Discover content"] article h3 a').first().click();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/language=en/);
  await page
    .locator('[aria-label="Discover content"] article')
    .first()
    .getByRole('link', { name, exact: true })
    .click();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const first = (await sql`SELECT id FROM creation WHERE creator_id = ${creatorId} LIMIT 1`)[0].id;
  await page.goto(
    `${origin}/content/${first}?returnTo=${encodeURIComponent('https://example.com/')}`,
  );
  await expect(page.getByRole('link', { name: '← Discover content', exact: true })).toHaveAttribute(
    'href',
    '/content',
  );

  await page.goto(`${origin}/creator-studio`);
  let releaseSave!: () => void;
  const responseGate = new Promise<void>(resolve => {
    releaseSave = resolve;
  });
  let savedOnServer = false;
  await page.route('**/api/creator-hub/creations', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    savedOnServer = true;
    await responseGate;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A journey through resource choices');
  await page
    .locator('.bn-editor[contenteditable=true]')
    .first()
    .fill('Practice choosing resources before the match.');
  await expect.poll(() => savedOnServer).toBe(true);
  await page
    .getByLabel('Summary', { exact: true })
    .fill('Typed while the first save was in flight.');
  releaseSave();
  await expect(page).toHaveURL(/creationId=/);
  await expect(page.getByLabel('Summary', { exact: true })).toHaveValue(
    'Typed while the first save was in flight.',
  );
  const draftId = new URL(page.url()).searchParams.get('creationId')!;
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'A journey through resource choices',
  );
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Published$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View publication', exact: true })).toHaveAttribute(
    'href',
    `/content/${draftId}`,
  );
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${origin}/content/${draftId}`,
  );
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeHidden();
  await page.getByLabel('Summary', { exact: true }).fill('A private revision.');
  await expect(
    page.getByRole('status').filter({ hasText: 'Draft saved · Unpublished changes' }),
  ).toBeVisible();
  const publicCopy = await (
    await page.request.get(`${origin}/api/creator-hub/creations/${draftId}`)
  ).json();
  expect(publicCopy.data.document.summary).not.toBe('A private revision.');
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: 'Draft saved · Unpublished changes' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Publish update', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Published$/ })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/published-desktop.png` });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Publication status').selectOption('changes');
  await expect(page.getByText('No creations match these filters.', { exact: true })).toBeVisible();
  await page.getByLabel('Publication status').selectOption('published');
  await expect(
    page.getByRole('link', { name: 'A journey through resource choices', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Search your creations').fill('no such article');
  await page.getByRole('button', { name: 'Search creations', exact: true }).click();
  await expect(page.getByText('No creations match these filters.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Search your creations')).toHaveValue('no such article');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'A journey through resource choices', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshots}/studio-mobile.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(
    `${origin}/creator-studio?creatorId=${creatorId}&youtube=claimed&transferredDecks=2`,
  );
  const claimBanner = page.getByRole('heading', { name: `You now own ${name}`, exact: true });
  await expect(claimBanner).toBeVisible();
  await page.getByRole('link', { name: new RegExp(`${name} lesson`) }).first().click();
  await expect(page).toHaveURL(/creationId=/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(new RegExp(`${name} lesson`));
  await expect(claimBanner).toBeHidden();
  expect(new URL(page.url()).searchParams.has('youtube')).toBe(false);
  expect(new URL(page.url()).searchParams.has('transferredDecks')).toBe(false);
  expect(errors).toEqual([]);
  console.log(
    'Creator UX journeys passed: directory/profile/discovery returns, invalid return URLs, draft refresh, publication states, copy link, private changes and studio filtering.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Failed at', page.url(), await page.locator('main').innerText());
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM creation WHERE author_id = ${userId}`;
  await sql`DELETE FROM creator_profile WHERE id = ${creatorId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
