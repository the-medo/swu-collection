// ARTICLE_EDIT_LINK_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/article-edit-link.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.ARTICLE_EDIT_LINK_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw new Error('Run explicitly against an isolated development worktree.');

const db = postgres(database.toString(), { max: 2 });
const users = ['owner', 'member', 'author'].map(role => ({
  id: `article-edit-${role}-${randomUUID()}`,
  token: randomUUID(),
}));
const [owner, member, author] = users;
const creatorId = randomUUID(),
  personalId = randomUUID(),
  creatorArticleId = randomUUID();
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
const screenshots = new URL('../../.swubase/article-edit-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const api = `${origin}/api/creator-hub`;
async function signIn(user?: typeof owner) {
  await context.clearCookies();
  if (!user) return;
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(name, user.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await context.addCookies([
    {
      name,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
}
const edit = page.getByRole('link', { name: 'Edit article', exact: true });
async function openArticle(id: string) {
  await page.goto(`${origin}/content/${id}`);
  await expect(page.getByRole('heading', { name: 'Published article', exact: true })).toBeVisible();
}
async function openDraft(id: string, publisher: string) {
  await expect(edit).toBeVisible();
  await edit.click();
  await expect(page).toHaveURL(new RegExp(`/creator-studio\\?.*creationId=${id}`));
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unpublished draft title');
  await expect(page.getByLabel('Publish as', { exact: true })).toHaveValue(publisher);
}
try {
  for (const user of users) {
    await db`INSERT INTO "user" (id, name, email, email_verified, display_name, currency, created_at, updated_at)
      VALUES (${user.id}, 'Article editor', ${user.id + '@invalid.local'}, false, ${'Editor ' + user.id.slice(-8)}, 'USD', now(), now())`;
    await db`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
      VALUES (${randomUUID()}, ${user.token}, now() + interval '1 hour', ${user.id}, now(), now())`;
  }
  const profile = creatorProfileSchema.parse({
    slug: `article-edit-${creatorId}`,
    name: 'Article publisher',
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  });
  await db`INSERT INTO creator_profile (id, owner_id, slug, profile)
    VALUES (${creatorId}, ${owner.id}, ${profile.slug}, ${db.json(profile)})`;
  await db`INSERT INTO creator_member (creator_id, user_id) VALUES (${creatorId}, ${member.id})`;
  const published = creationDocumentSchema.parse({
    title: 'Published article',
    medium: 'article',
    body: emptyPostDocument(),
    tags: [],
    references: [],
    chapters: [],
  });
  const draft = { ...published, title: 'Unpublished draft title' };
  for (const id of [personalId, creatorArticleId]) {
    const personal = id === personalId;
    await db`INSERT INTO creation (id, creator_id, owner_user_id, author_id, ownership_revision,
      draft, published, revision, published_revision, published_at, public_updated_at)
      VALUES (${id}, ${personal ? null : creatorId}, ${personal ? owner.id : null},
        ${personal ? owner.id : author.id}, ${personal ? 1 : 2}, ${db.json(draft)},
        ${db.json(published)}, 2, 1, now(), now())`;
  }

  await signIn(owner);
  await openArticle(personalId);
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (
      !(await page.locator('html').evaluate((el, value) => el.classList.contains(value), theme))
    ) {
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(edit).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page
        .locator('[data-creator-layout]')
        .screenshot({ path: `${screenshots}/owner-${width}-${theme}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDraft(personalId, '');
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(draft.title);
  await page.goBack();
  await expect(edit).toBeVisible();
  await openArticle(creatorArticleId);
  await openDraft(creatorArticleId, creatorId);

  await signIn(member);
  await openArticle(creatorArticleId);
  await openDraft(creatorArticleId, creatorId);
  await openArticle(personalId);
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toBeVisible();
  expect((await page.request.get(`${api}/creations/${personalId}/draft`)).status()).toBe(403);
  await expect(edit).toHaveCount(0);

  // Retained authorship after transfer must not grant access to the creator's draft.
  await signIn(author);
  const membershipLoaded = page.waitForResponse(response => response.url() === `${api}/mine`);
  await openArticle(creatorArticleId);
  await membershipLoaded;
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toBeVisible();
  expect((await page.request.get(`${api}/creations/${creatorArticleId}/draft`)).status()).toBe(403);
  await expect(edit).toHaveCount(0);
  await openArticle(personalId);
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toBeVisible();
  await expect(edit).toHaveCount(0);

  await signIn();
  for (const id of [personalId, creatorArticleId]) {
    await openArticle(id);
    expect((await page.request.get(`${api}/creations/${id}/draft`)).status()).toBe(401);
    await expect(edit).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  console.log(
    'Article edit links: personal owner, creator owner/editor, retained author, unrelated user, anonymous, draft navigation and responsive themes passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
  for (const user of users) await db`DELETE FROM "user" WHERE id = ${user.id}`;
  await db.end();
}
