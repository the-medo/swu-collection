// CREATOR_DELETION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-deletion.browser.ts
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
  process.env.CREATOR_DELETION_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw new Error('Use an explicitly enabled isolated worktree.');
const sql = postgres(database.toString(), { max: 2 });
const userId = `delete-browser-${crypto.randomUUID()}`,
  token = crypto.randomUUID();
const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const profiles = ids.map((id, i) =>
  creatorProfileSchema.parse({
    slug: `delete-${id}`,
    name: ['Keep My Articles Press', 'Delete All Press', 'Empty Press'][i],
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  }),
);
const doc = (title: string, medium: 'article' | 'video' = 'article') =>
  creationDocumentSchema.parse({
    title,
    medium,
    language: 'en',
    tags: [],
    references: [],
    chapters: [],
    ...(medium === 'video' ? { sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk' } : {}),
    body: {
      version: 1,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Content to preserve.', styles: {} }],
          children: [],
        },
      ],
    },
  });
const insert = async (
  creatorId: string,
  title: string,
  published = false,
  medium: 'article' | 'video' = 'article',
) => {
  const id = crypto.randomUUID(),
    document = doc(title, medium);
  await sql`INSERT INTO creation (id, creator_id, author_id, draft, published, published_revision, published_at)
    VALUES (${id}, ${creatorId}, ${userId}, ${sql.json(document)}, ${published ? sql.json(document) : null}, ${published ? 1 : null}, ${published ? '2026-01-01T12:00:00Z' : null})`;
  return id;
};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage(),
  staleEditor = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
for (const current of [page, staleEditor])
  current.on('pageerror', error => errors.push(error.message));
page.on('dialog', async dialog => {
  errors.push(`Unexpected dialog: ${dialog.message()}`);
  await dialog.dismiss();
});
const output = '.swubase/creator-deletion';
await mkdir(output, { recursive: true });
try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, created_at, updated_at, currency)
    VALUES (${userId}, 'Deletion fixture', 'Deletion fixture', ${userId + '@invalid.local'}, false, now(), now(), 'USD')`;
  await sql`INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, ${userId}, now() + interval '1 hour', now(), now())`;
  for (const [i, id] of ids.entries())
    await sql`INSERT INTO creator_profile (id, slug, owner_id, profile) VALUES (${id}, ${profiles[i].slug}, ${userId}, ${sql.json(profiles[i])})`;
  const article = await insert(ids[0], 'Keep published story', true);
  await insert(ids[0], 'Keep private draft');
  await insert(ids[0], 'Remove video listing', true, 'video');
  const allArticle = await insert(ids[1], 'Delete this article too');
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
  await staleEditor.goto(`${origin}/creator-studio?creatorId=${ids[0]}&creationId=${article}`);
  await expect(staleEditor.getByLabel('Title', { exact: true })).toHaveValue(
    'Keep published story',
  );
  await page.goto(`${origin}/creator-studio?creatorId=${ids[0]}`);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Creator or brand name', { exact: true }).fill('Unsaved profile name');
  let failSummary = true;
  await page.route(`${origin}/api/creator-hub/creators/${ids[0]}/deletion`, route =>
    failSummary
      ? route.fulfill({ status: 503, json: { message: 'Summary temporarily unavailable.' } })
      : route.continue(),
  );
  const openDelete = page.getByRole('button', { name: 'Delete creator profile', exact: true });
  await openDelete.click();
  const dialog = page.getByRole('alertdialog');
  const confirm = dialog.getByRole('button', { name: 'Delete profile permanently', exact: true });
  const address = dialog.getByRole('textbox', { name: 'Creator profile address', exact: true });
  await expect(dialog.getByRole('alert')).toContainText('Summary temporarily unavailable');
  await expect(confirm).toBeDisabled();
  failSummary = false;
  await dialog.getByRole('button', { name: 'Retry summary', exact: true }).click();
  await expect(dialog.getByRole('checkbox')).toBeChecked();
  await expect(dialog.getByText(/1 publication will be permanently deleted/)).toBeVisible();
  await expect(confirm).toBeDisabled();
  await address.fill('wrong-address');
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(openDelete).toBeFocused();
  expect((await sql`SELECT id FROM creator_profile WHERE id = ${ids[0]}`).length).toBe(1);
  await openDelete.click();
  await expect(address).toHaveValue('');
  await expect(dialog.getByRole('checkbox')).toBeChecked();
  // Content changing after review forces a fresh confirmation, without losing articles.
  await insert(ids[0], 'Arrived while reviewing');
  await address.fill(profiles[0].slug);
  await confirm.click();
  await expect(dialog.getByRole('alert')).toContainText('changed');
  await expect(address).toHaveValue('');
  await expect(dialog.getByText(/Keep my 3 articles in Personal/)).toBeVisible();
  await address.fill(profiles[0].slug);
  await page.screenshot({ path: `${output}/keep-articles-desktop.png` });
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await expect(page.getByText('Creator profile deleted', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Publish as', { exact: true })).toHaveValue('');
  await expect(page.getByRole('option', { name: profiles[0].name, exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Keep private draft', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Arrived while reviewing', exact: true }),
  ).toBeVisible();
  const publicArticle = await page.request.get(`${origin}/api/creator-hub/creations/${article}`);
  expect(publicArticle.status()).toBe(200);
  expect((await publicArticle.json()).data.creatorId).toBeNull();
  await staleEditor.getByLabel('Title', { exact: true }).fill('Edits from the old creator tab');
  await staleEditor.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(staleEditor.getByRole('alert')).toContainText('publishing identity changed');
  staleEditor.once('dialog', async confirmation => {
    expect(confirmation.message()).toBe(
      'Replace your unsaved changes with the latest saved draft?',
    );
    await confirmation.accept();
  });
  await staleEditor.getByRole('button', { name: 'Load saved draft', exact: true }).click();
  await expect(staleEditor.getByLabel('Title', { exact: true })).toHaveValue(
    'Keep published story',
  );
  // The other owned profile supports an explicit delete-everything choice on mobile.
  await expect(page.getByText('Creator profile deleted', { exact: true })).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByLabel('Publish as', { exact: true }).selectOption(ids[1]);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await openDelete.click();
  await dialog.getByRole('checkbox').uncheck();
  await expect(dialog.getByText(/1 publication will be permanently deleted/)).toBeVisible();
  await address.fill(profiles[1].slug);
  await page.screenshot({ path: `${output}/delete-all-mobile.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Another tab has already reviewed this profile with the opposite keep choice.
  await staleEditor.goto(`${origin}/creator-studio?creatorId=${ids[1]}`);
  await staleEditor.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await staleEditor.getByRole('button', { name: 'Delete creator profile', exact: true }).click();
  const staleDialog = staleEditor.getByRole('alertdialog');
  await expect(staleDialog.getByRole('checkbox')).toBeChecked();
  await staleDialog.getByRole('textbox', { name: 'Creator profile address', exact: true }).fill(
    profiles[1].slug,
  );
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  expect(
    (await page.request.get(`${origin}/api/creator-hub/creations/${allArticle}/draft`)).status(),
  ).toBe(404);
  expect((await sql`SELECT id FROM "user" WHERE id = ${userId}`).length).toBe(1);
  await staleDialog.getByRole('button', { name: 'Delete profile permanently', exact: true }).click();
  await expect(staleDialog.getByRole('status')).toContainText('no longer exists');
  await expect(staleEditor.getByText('Creator profile deleted', { exact: true })).toHaveCount(0);
  await staleDialog.getByRole('button', { name: 'Return to studio', exact: true }).click();
  await expect(staleEditor.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await expect(staleEditor.getByText('Creator profile no longer exists', { exact: true })).toBeVisible();
  await expect(staleEditor.getByRole('option', { name: profiles[1].name, exact: true })).toHaveCount(0);
  // An empty profile has no misleading preservation checkbox. If another tab
  // deletes it, the stale dialog provides a useful exit and clears the studio cache.
  await page.getByLabel('Publish as', { exact: true }).selectOption(ids[2]);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await openDelete.click();
  await expect(
    dialog.getByText('There are no articles you authored that can be moved to Personal.'),
  ).toBeVisible();
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await sql`DELETE FROM creator_profile WHERE id = ${ids[2]}`;
  await openDelete.click();
  await expect(dialog.getByRole('status')).toContainText('no longer exists');
  await dialog.getByRole('button', { name: 'Return to studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Empty Press', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'Creator deletion: cancel/focus, typed confirmation, stale-summary review, personal preservation, stale-editor recovery, stale deletion/preview recovery, delete-all, desktop/mobile and account retention passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM creator_profile WHERE id IN (${ids[0]}, ${ids[1]}, ${ids[2]})`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
