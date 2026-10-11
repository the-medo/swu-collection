// CARD_RULES_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-rules-discussion.browser.ts
import { chromium, expect as baseExpect, type BrowserContext } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import cards from '../../server/db/json/card-list.json';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_RULES_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against an isolated development worktree.');

const expect = baseExpect.configure({ timeout: 20_000 });
const sql = postgres(database.toString(), { max: 2 });
const occupiedCards = new Set(
  (await sql`SELECT card_id FROM card_discussion`).map(row => row.card_id),
);
const card = !occupiedCards.has('tie-bomber')
  ? cards['tie-bomber']
  : Object.values(cards).find(
      card => !occupiedCards.has(card.cardId) && Object.keys(card.variants).length > 1,
    );
if (!card) throw new Error('No unused card is available for this fixture.');
const cardId = card.cardId;
const variantId =
  cardId === 'tie-bomber' ? 'tie-bomber-237-jump-to-lightspeed' : Object.keys(card.variants)[0]!;
const userId = `card-rules-browser-${randomUUID()}`;
const binding = () => sql`SELECT discussion_id FROM card_discussion WHERE card_id = ${cardId}`;
if ((await binding()).length)
  throw new Error('Use a card without an existing discussion for this fixture.');
const browser = await chromium.launch();
const reader = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
for (const context of [reader, anonymous])
  await context.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
const page = await reader.newPage();
const visitor = await anonymous.newPage();
const errors: string[] = [];
for (const target of [page, visitor]) {
  target.on('pageerror', error => errors.push(error.message));
  target.setDefaultTimeout(20_000);
}
const screenshots = new URL('../../.swubase/card-rules-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
async function authenticate(context: BrowserContext) {
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (await serializeSignedCookie(name, token, process.env.BETTER_AUTH_SECRET!)).split(
    ';',
  )[0]!;
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
const url = `${origin}/cards/detail/${cardId}?cardVariantId=${variantId}`;
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role) VALUES (${userId}, 'Card rules reader', ${userId + '@invalid.local'}, false, now(), now(), 'Card rules reader', 'USD', 'user')`;
  await authenticate(reader);
  let discussionReads = 0;
  let commentReads = 0;
  page.on('request', request => {
    if (request.url().includes(`/cards/${cardId}/discussion`)) discussionReads++;
    if (/\/api\/discussions\/[^/]+\/comments/.test(request.url())) commentReads++;
  });
  await page.goto(url);
  await expect(page.getByRole('tab', { name: 'Card Details', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect.poll(() => discussionReads).toBeGreaterThan(0);
  expect(commentReads).toBe(0);
  await expect(page.getByRole('tab', { name: 'Rules & Discussion', exact: true })).toBeVisible();
  expect(await binding()).toHaveLength(0);
  await page.getByRole('tab', { name: 'Rules & Discussion', exact: true }).click();
  await expect(page.getByText('No comments yet.', { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('cardVariantId')).toBe(variantId);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Rules & Discussion' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await visitor.goto(`${url}&cardTab=rules-discussion`);
  await expect(
    visitor.getByRole('button', { name: 'Sign in to comment', exact: true }),
  ).toBeVisible();
  expect(await binding()).toHaveLength(0);
  await page.getByRole('button', { name: 'Write a comment' }).click();
  const form = page.getByRole('group', { name: 'Edit comment', exact: true });
  const editor = form.locator('[contenteditable=true]').first();
  await expect(editor).toBeVisible();
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await binding()).toHaveLength(0);
  await page.getByRole('button', { name: 'Write a comment' }).click();
  await editor.fill('How does this card interact with shields?');
  // Reject one post without losing the first draft or creating a discussion.
  await page.route(
    `**/api/cards/${cardId}/discussion/comments`,
    route => route.fulfill({ status: 500, json: { error: 'Please try again.' } }),
    { times: 1 },
  );
  await form.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Please try again.');
  await expect(editor).toContainText('How does this card interact with shields?');
  expect(await binding()).toHaveLength(0);
  await form.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Comments (1)', exact: true })).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (1)', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('How does this card interact with shields?', { exact: true }),
  ).toBeVisible();
  expect(await binding()).toHaveLength(1);
  const discussionId = (await binding())[0]!.discussion_id;
  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await editor.fill('A follow-up rules question.');
  await form.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (2)', exact: true }),
  ).toBeVisible();
  const replies =
    await sql`SELECT id FROM discussion_comment WHERE discussion_id = ${discussionId} AND parent_id IS NOT NULL`;
  await visitor.goto(`${url}&cardTab=rules-discussion&cardComment=${replies[0]!.id}`);
  await expect(visitor.locator(`[data-comment-id="${replies[0]!.id}"]`)).toBeFocused();
  await expect(visitor.getByRole('button', { name: 'Edit comment', exact: true })).toHaveCount(0);
  await expect(visitor.getByText('A follow-up rules question.', { exact: true })).toBeVisible();
  await visitor.getByRole('tab', { name: 'Card Details', exact: true }).click();
  expect(new URL(visitor.url()).searchParams.has('cardComment')).toBe(false);
  await page.screenshot({ path: `${screenshots}/desktop.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (2)', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  const secondVariant = Object.keys(card.variants).find(id => id !== variantId)!;
  await page.goto(
    `${origin}/cards/detail/${cardId}?cardVariantId=${secondVariant}&cardTab=rules-discussion`,
  );
  await expect(page.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  expect(await binding()).toHaveLength(1);
  // A fresh card-detail view shows the count before loading any comment bodies.
  const readsBeforeDetails = commentReads;
  await page.goto(url);
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (2)', exact: true }),
  ).toBeVisible();
  expect(commentReads).toBe(readsBeforeDetails);
  // Card dialogs use the same tab and discussion while preserving page search state.
  await page.goto(`${url}&modalCardId=${cardId}&modalCardTab=rules-discussion`);
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Comments (2)', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('tab', { name: 'Rules & Discussion (2)', exact: true }),
  ).toBeVisible();
  await page.goto(`${url}&cardTab=rules-discussion`);
  await expect(page.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'Card rules and discussion' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('tab', { name: 'Rules & Discussion' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: `${screenshots}/mobile.png`, fullPage: true });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Card rules and discussion' }).scrollIntoViewIfNeeded();
  await expect(
    page.getByText('How does this card interact with shields?', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('A follow-up rules question.', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/mobile-light.png`, fullPage: true });
  // Deletion uses the shared metadata cache and keeps the tab count in sync.
  page.on('dialog', dialog => dialog.accept());
  await page
    .locator(`[data-comment-id="${replies[0]!.id}"]`)
    .getByRole('button', { name: 'Delete comment', exact: true })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (1)', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete comment', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Rules & Discussion (0)', exact: true }),
  ).toBeVisible();
  expect(await binding()).toHaveLength(1);
  expect(errors).toEqual([]);
  console.log(
    'PASS: lazy/cancelled creation, failed-post retry, first comment, replies, direct links, variants, dialog, navigation, comment counts after posting/deletion and mobile layout.',
  );
} finally {
  const rows = await binding();
  for (const row of rows) await sql`DELETE FROM discussion WHERE id = ${row.discussion_id}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await browser.close();
  await sql.end();
}
