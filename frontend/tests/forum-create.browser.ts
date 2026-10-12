// FORUM_CREATE_BROWSER_TEST=1 bun --env-file=.env.worktree frontend/tests/forum-create.browser.ts
// Uses temporary users and topics in the isolated worktree database; cleans them up.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.FORUM_CREATE_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable only against an isolated worktree.');
const sql = postgres(database.toString(), { max: 1 });
const author = `forum-browser-${crypto.randomUUID()}`;
const token = crypto.randomUUID();
let discussionId: string | undefined;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const guestContext = await browser.newContext();
for (const c of [context, guestContext])
  await c.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
  });
const page = await context.newPage();
const guest = await guestContext.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(`${page.url()}: ${error.stack ?? error.message}`));
guest.on('pageerror', error => errors.push(`${guest.url()}: ${error.stack ?? error.message}`));
const screenshots = new URL('../../.swubase/forum-create/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at) VALUES (${author}, 'Forum browser author', 'Forum browser author', ${author + '@invalid.local'}, false, 'USD', 'user', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${author}, now(), now())`;
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
  await guest.goto(`${origin}/forum/new`);
  await expect(guest.getByRole('button', { name: 'Sign in to start a discussion' })).toBeVisible();
  await expect(guest.getByLabel('Title', { exact: true })).toHaveCount(0);
  await page.goto(`${origin}/forum`);
  await expect(page.getByRole('link', { name: 'Forum', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Start a thread' }).click();
  await expect(page).toHaveURL(`${origin}/forum/new`);
  await page.getByLabel('Title', { exact: true }).fill('Weekend deckbuilding ideas');
  const form = page.getByRole('group', { name: 'Edit discussion', exact: true });
  const editor = form.locator('[contenteditable=true]').first();
  await expect(editor).toBeVisible();
  await editor.focus();
  await page.keyboard.type('/h4', { delay: 20 });
  await page.getByRole('option').filter({ hasText: 'Heading 4' }).first().click();
  await page.keyboard.type('Opening thoughts', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Which cards would you test this weekend?', { delay: 20 });
  await expect(form.locator('h4')).toHaveText('Opening thoughts');
  expect(errors).toEqual([]);
  await page.once('dialog', dialog => {
    void dialog.dismiss();
  });
  await page.getByRole('link', { name: 'Back to forum' }).click();
  await expect(page).toHaveURL(`${origin}/forum/new`);
  expect(errors).toEqual([]);
  await page.route('**/api/discussions/forum', async route => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary test failure' }),
      });
    else await route.continue();
  });
  await form.getByRole('button', { name: 'Create discussion' }).click();
  await expect(form.getByRole('alert')).toContainText('Temporary test failure');
  expect(errors).toEqual([]);
  await expect(editor).toContainText('Which cards would you test this weekend?');
  await page.unroute('**/api/discussions/forum');
  await page.setViewportSize({ width: 390, height: 1100 });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${screenshots}/new-mobile.png` });
  await form.getByRole('button', { name: 'Create discussion' }).click();
  await expect(page).toHaveURL(/\/forum\/[0-9a-f-]{36}$/);
  discussionId = new URL(page.url()).pathname.split('/').at(-1)!;
  const topicUrl = page.url();
  await expect(
    page.getByRole('heading', { name: 'Weekend deckbuilding ideas', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.rte-published h4')).toHaveText('Opening thoughts');
  await expect(page.locator('[data-comment-id]')).toHaveCount(1);
  const openingId = await page.locator('[data-comment-id]').first().getAttribute('data-comment-id');
  const openingPanel = page.getByRole('region', { name: 'Opening post', exact: true });
  const commentsPanel = page.getByRole('region', { name: 'Comments', exact: true });
  await expect(page.getByRole('heading', { name: 'Opening post', exact: true })).toHaveCount(0);
  await expect(openingPanel.getByRole('button', { name: 'Reply', exact: true })).toHaveCount(0);
  await expect(openingPanel.locator('[data-comment-id]')).toHaveCount(1);
  await expect(commentsPanel.locator('[data-comment-id]')).toHaveCount(0);
  await expect(
    commentsPanel.getByRole('heading', { name: 'Comments (0)', exact: true }),
  ).toBeVisible();
  await expect(commentsPanel.getByText('No comments yet.', { exact: true })).toBeVisible();
  const openingBounds = await openingPanel.boundingBox();
  const commentsBounds = await commentsPanel.boundingBox();
  expect(openingBounds!.y + openingBounds!.height).toBeLessThan(commentsBounds!.y);
  await expect(page.getByRole('button', { name: 'Delete comment', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit comment', exact: true })).toBeVisible();
  await openingPanel.getByRole('button', { name: 'Edit comment', exact: true }).click();
  const openingForm = openingPanel.getByRole('group', { name: 'Edit comment', exact: true });
  await expect(commentsPanel.getByText('No comments yet.', { exact: true })).toBeVisible();
  await openingForm
    .getByText('Which cards would you test this weekend?', { exact: true })
    .fill('Which cards would you test this weekend? Share your favorite deckbuilding ideas.');
  await openingForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(openingForm).toHaveCount(0);
  await expect(openingPanel.locator('.rte-published')).toContainText(
    'Share your favorite deckbuilding ideas.',
  );
  await expect(openingPanel.locator('.rte-published h4')).toHaveText('Opening thoughts');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${screenshots}/thread-mobile.png` });
  await page.getByRole('button', { name: 'Edit title', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Weekend ideas — updated');
  await page.getByRole('button', { name: 'Save title' }).click();
  await expect(
    page.getByRole('heading', { name: 'Weekend ideas — updated', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Write a comment' }).click();
  const replyForm = page.getByRole('group', { name: 'Edit comment', exact: true });
  await replyForm
    .locator('[contenteditable=true]')
    .first()
    .fill('I am starting with a lower curve.');
  await replyForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('[data-comment-id]')).toHaveCount(2);
  await expect(page.locator('[data-comment-id]').first()).toHaveAttribute(
    'data-comment-id',
    openingId!,
  );
  const replyId = await page.locator('[data-comment-id]').last().getAttribute('data-comment-id');
  await expect(
    commentsPanel
      .locator(`[data-comment-id="${replyId}"]`)
      .getByRole('button', { name: 'Reply', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(`[data-comment-id="${replyId}"]`).getByRole('button', { name: 'Delete comment' }),
  ).toBeVisible();
  await commentsPanel.getByRole('button', { name: 'Write a comment' }).click();
  await replyForm
    .locator('[contenteditable=true]')
    .first()
    .fill('My second idea is to test more removal.');
  await replyForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(commentsPanel.locator('[data-comment-id]')).toHaveCount(2);
  const newestId = await commentsPanel
    .locator('[data-comment-id]')
    .first()
    .getAttribute('data-comment-id');
  expect(newestId).not.toBe(replyId);
  await expect(commentsPanel.locator('[data-comment-id]').first()).toContainText(
    'My second idea is to test more removal.',
  );
  await expect(commentsPanel.locator('[data-comment-id]').last()).toHaveAttribute(
    'data-comment-id',
    replyId!,
  );
  await expect(
    commentsPanel.getByRole('heading', { name: 'Comments (2)', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to forum' }).click();
  const discussions = page.getByRole('region', { name: 'Newest threads' });
  const comments = page.getByRole('region', { name: 'Recent discussions' });
  await expect(discussions.getByRole('link', { name: /Weekend ideas — updated/ })).toHaveCount(1);
  await expect(comments.getByRole('link').first()).toHaveAttribute(
    'href',
    `/forum/${discussionId}?forumComment=${newestId}`,
  );
  await comments.getByRole('link').first().click();
  await expect(commentsPanel.locator(`[data-comment-id="${newestId}"]`)).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-comment-id]')).toHaveCount(3);
  await page.goto(`${topicUrl}?forumComment=${openingId}`);
  await expect(openingPanel.locator(`[data-comment-id="${openingId}"]`)).toBeFocused();
  // Preserve replies from before the opening post's Reply action was removed.
  const existingReply = emptyPostDocument();
  existingReply.blocks[0]!.content = [
    { type: 'text', text: 'A reply to the opening post.', styles: {} },
  ];
  await sql`INSERT INTO discussion_comment (discussion_id, parent_id, depth, author_id, content)
    VALUES (${discussionId}, ${openingId}, 1, ${author}, ${JSON.stringify(existingReply)}::jsonb)`;
  await page.reload();
  await expect(
    openingPanel
      .locator(`[data-comment-id="${openingId}"]`)
      .getByRole('button', { name: 'Reply', exact: true }),
  ).toHaveCount(0);
  await expect(openingPanel.getByRole('region', { name: 'Comment replies' })).toContainText(
    'A reply to the opening post.',
  );
  await expect(
    openingPanel
      .getByRole('region', { name: 'Comment replies' })
      .getByRole('button', { name: 'Reply', exact: true }),
  ).toBeVisible();
  await expect(commentsPanel.locator('[data-comment-id]')).toHaveCount(2);
  await expect(
    commentsPanel.getByRole('heading', { name: 'Comments (2)', exact: true }),
  ).toBeVisible();
  // Exercise the opening-post request independently of the current root page.
  const rootPattern = `**/api/discussions/${discussionId}/comments?*`;
  const openingPattern = `**/api/discussions/${discussionId}/comments/${openingId}/thread`;
  await guest.route(rootPattern, async route => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        data: body.data.filter((comment: { id: string }) => comment.id !== openingId),
      },
    });
  });
  let releaseOpening!: () => void;
  const openingGate = new Promise<void>(resolve => {
    releaseOpening = resolve;
  });
  let failOpening = true;
  await guest.route(openingPattern, async route => {
    await openingGate;
    if (failOpening)
      await route.fulfill({
        status: 503,
        json: { error: 'Opening post temporarily unavailable.' },
      });
    else await route.continue();
  });
  const guestOpening = guest.getByRole('region', { name: 'Opening post', exact: true });
  try {
    await guest.goto(topicUrl);
    await expect(guestOpening.getByRole('status')).toHaveText('Loading opening post…');
    await expect(guest.getByRole('heading', { name: 'Comments', exact: true })).toBeVisible();
    await expect(
      guest.getByRole('region', { name: 'Comments', exact: true }).locator('[data-comment-id]'),
    ).toHaveCount(2);
  } finally {
    releaseOpening();
  }
  await expect(guestOpening.getByRole('alert')).toContainText(
    'Opening post temporarily unavailable.',
  );
  await expect(guest.getByRole('heading', { name: 'Comments', exact: true })).toBeVisible();
  failOpening = false;
  await guestOpening.getByRole('button', { name: 'Try again' }).click();
  await expect(guestOpening.locator('.rte-published h4')).toHaveText('Opening thoughts');
  await expect(
    guestOpening
      .locator(`[data-comment-id="${openingId}"]`)
      .getByRole('button', { name: 'Reply', exact: true }),
  ).toHaveCount(0);
  await expect(guest.getByRole('heading', { name: 'Comments (2)', exact: true })).toBeVisible();
  await guest.unroute(rootPattern);
  await guest.unroute(openingPattern);
  await expect(
    guest.getByRole('heading', { name: 'Weekend ideas — updated', exact: true }),
  ).toBeVisible();
  await expect(guest.getByRole('button', { name: 'Edit title' })).toHaveCount(0);
  await expect(guest.getByRole('button', { name: 'Delete discussion' })).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1100 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${screenshots}/thread-desktop.png` });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(openingPanel.locator('.rte-published h4')).toHaveText('Opening thoughts');
  await expect(commentsPanel.locator('[data-comment-id]')).toHaveCount(2);
  await page.screenshot({ path: `${screenshots}/thread-dark.png` });
  // Replies attached to the opening post do not count as items in the Comments box.
  for (const remaining of [1, 0]) {
    page.once('dialog', dialog => {
      void dialog.accept();
    });
    await commentsPanel
      .getByRole('button', { name: 'Delete comment', exact: true })
      .first()
      .click();
    await expect(commentsPanel.locator('[data-comment-id]')).toHaveCount(remaining);
    await expect(
      commentsPanel.getByRole('heading', { name: `Comments (${remaining})`, exact: true }),
    ).toBeVisible();
  }
  await expect(commentsPanel.getByText('Have more to add?', { exact: true })).toBeVisible();
  await expect(
    commentsPanel.getByText('Add a new comment to the discussion.', { exact: true }),
  ).toBeVisible();
  await expect(openingPanel.getByRole('region', { name: 'Comment replies' })).toContainText(
    'A reply to the opening post.',
  );
  page.once('dialog', dialog => {
    void dialog.accept();
  });
  await page.getByRole('button', { name: 'Delete discussion' }).click();
  await expect(page).toHaveURL(`${origin}/forum`);
  await expect(discussions.getByRole('link', { name: /Weekend ideas — updated/ })).toHaveCount(0);
  await guest.reload();
  await expect(guest.getByRole('alert')).toContainText('This discussion is unavailable.');
  expect(errors).toEqual([]);
  console.log(
    `Forum creation, headings, failed-save recovery, mobile/dark layout, title editing, headerless editable opener without Reply, opening-post loading/retry, newest-first comments, existing opening replies, deep links, guest access, and deletion passed. Screenshots: ${screenshots}`,
  );
} finally {
  await browser.close();
  if (discussionId) await sql`DELETE FROM discussion WHERE id = ${discussionId}`;
  await sql`DELETE FROM discussion WHERE id IN (SELECT discussion_id FROM forum_thread WHERE author_id = ${author})`;
  await sql`DELETE FROM "user" WHERE id = ${author}`;
  await sql.end();
}
