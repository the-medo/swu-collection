// DECK_DISCUSSION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/deck-discussion-requests.browser.ts
import { chromium, expect as baseExpect, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.DECK_DISCUSSION_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw Error('Use an explicitly enabled isolated worktree.');
const host = new URL(origin).hostname;
if (!['localhost', '127.0.0.1'].includes(host) && !host.endsWith('.ts.net'))
  throw Error('Expected a development origin.');
const expect = baseExpect.configure({ timeout: 20_000 });
const sql = postgres(database.toString(), { max: 2 });
const browser = await chromium.launch();
const ownerId = `discussion-network-${randomUUID()}`;
const readerId = `discussion-network-${randomUUID()}`;
const deckId = randomUUID();
const parents = Array.from({ length: 9 }, () => randomUUID());
const nestedParent = randomUUID();
const document = (text: string) => {
  const content = emptyPostDocument();
  content.blocks[0]!.content = [{ type: 'text', text, styles: {} }];
  return content;
};
let discussionId = '';
const errors: string[] = [];
async function preparePage(page: Page, expectedComments = 17) {
  await page.clock.install();
  await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
  page.on('pageerror', error => errors.push(error.message));
  const requests: URL[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (
      request.method() === 'GET' &&
      (url.pathname.startsWith(`/api/discussions/${discussionId}`) ||
        url.pathname === `/api/deck/${deckId}/discussion` ||
        url.pathname === `/api/deck/${deckId}/article` ||
        url.pathname === `/api/deck/${deckId}/comments/own`)
    )
      requests.push(url);
  });
  await page.goto(`${origin}/decks/${deckId}?deckTab=article`);
  const comments = page.getByRole('region', { name: 'Deck comments', exact: true });
  await expect(comments.locator('[data-comment-id]')).toHaveCount(expectedComments);
  await expect(comments.getByRole('status')).toHaveCount(0);
  await settled(page);
  expect(requests.filter(url => url.pathname === `/api/deck/${deckId}/discussion`)).toHaveLength(1);
  expect(requests.filter(url => url.pathname === `/api/discussions/${discussionId}`)).toHaveLength(
    0,
  );
  expect(requests.filter(url => url.pathname.endsWith('/comments'))).toHaveLength(1);
  expect(requests.filter(url => url.searchParams.has('parentId'))).toHaveLength(0);
  return { comments, requests };
}
async function settled(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { queryClient } = await import('/src/queryClient.ts');
        return queryClient
          .getQueryCache()
          .findAll({
            predicate: query =>
              ['discussions', 'deck-discussion'].includes(String(query.queryKey[0])),
          })
          .filter(query => query.state.fetchStatus === 'fetching').length;
      }),
    )
    .toBe(0);
}
async function metadataCache(page: Page, viewer?: string) {
  return page.evaluate(
    async ({ deckId, discussionId, viewer }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
      const { deckDiscussionKeys } = await import('/src/api/decks/discussionKeys.ts');
      return {
        generic: queryClient.getQueryData(discussionKeys.info(discussionId, viewer)),
        deck: queryClient.getQueryData(deckDiscussionKeys.discussion(deckId, viewer)),
      };
    },
    { deckId, discussionId, viewer },
  );
}
async function signedInPage(userId: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, ${userId}, now() + interval '1 hour', now(), now())`;
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
  return context.newPage();
}
try {
  for (const id of [ownerId, readerId])
    await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at)
      VALUES (${id}, 'Network fixture', ${id}, ${id + '@invalid.local'}, false, 'USD', 'user', now(), now())`;
  await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
    VALUES (${deckId}, ${ownerId}, 1, 'Discussion network fixture', 1, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
  await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${deckId}, 'battlefield-marine', 1, 3)`;
  discussionId = (await sql`SELECT discussion_id FROM deck_discussion WHERE deck_id=${deckId}`)[0]!
    .discussion_id;
  for (const [index, id] of parents.entries()) {
    await sql`INSERT INTO discussion_comment (id, discussion_id, author_id, content)
      VALUES (${id}, ${discussionId}, ${ownerId}, ${sql.json(document(`Root ${index}`))})`;
    for (let reply = 0; reply < (index === 8 ? 2 : 1); reply++)
      await sql`INSERT INTO discussion_comment (id, discussion_id, parent_id, depth, author_id, content)
        VALUES (${index === 8 && reply === 0 ? nestedParent : randomUUID()}, ${discussionId}, ${id}, 1, ${index === 0 ? readerId : ownerId}, ${sql.json(document(`Reply ${index}.${reply}`))})`;
  }
  await sql`INSERT INTO discussion_comment (discussion_id, parent_id, depth, author_id, content)
    VALUES (${discussionId}, ${nestedParent}, 2, ${ownerId}, ${sql.json(document('Embedded nested reply.'))})`;
  const anonymous = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const { comments, requests } = await preparePage(anonymous);
  const caches = await metadataCache(anonymous);
  expect(caches.deck).toEqual(caches.generic);
  expect(caches.generic).toMatchObject({ id: discussionId, total: 20, canModerate: false });
  const initialRequests = requests.length;
  await anonymous.clock.fastForward(120_000);
  await anonymous.clock.runFor(100);
  await settled(anonymous);
  expect(requests).toHaveLength(initialRequests);
  const multi = comments.locator(`[data-comment-thread="${parents[8]}"]`);
  await multi.getByRole('button', { name: 'View thread (3 replies)', exact: true }).click();
  await expect(multi).toContainText('Reply 8.1');
  await expect(multi).toContainText('Embedded nested reply.');
  await settled(anonymous);
  expect(requests.filter(url => url.searchParams.get('parentId') === parents[8])).toHaveLength(1);
  console.log(
    'Anonymous initial load: one metadata request, one comments request, zero single-reply requests; no requests during two idle minutes.',
  );

  // The parent stays cached while a collapsed descendant passes the cache lifetime.
  await multi.getByRole('button', { name: 'Hide replies', exact: true }).click();
  await anonymous.clock.fastForward(301_000);
  await anonymous.clock.runFor(100);
  expect(
    await anonymous.evaluate(
      async ({ discussionId, nestedParent }) => {
        const { queryClient } = await import('/src/queryClient.ts');
        const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
        return queryClient.getQueryData(
          discussionKeys.comments(discussionId, undefined, nestedParent),
        );
      },
      { discussionId, nestedParent },
    ),
  ).toBeUndefined();
  const failingThread = (url: URL) =>
    url.pathname === `/api/discussions/${discussionId}/comments` &&
    url.searchParams.get('parentId') === parents[8];
  await anonymous.route(failingThread, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Simulated thread refresh failure.' }),
    }),
  );
  await multi.getByRole('button', { name: 'View thread (3 replies)', exact: true }).click();
  await expect(multi.getByText('Embedded nested reply.', { exact: true })).toBeVisible();
  await expect(multi.getByRole('status')).toHaveCount(0);
  await anonymous.clock.runFor(4000);
  await expect(multi.getByRole('alert')).toContainText('Simulated thread refresh failure.');
  await settled(anonymous);
  await anonymous.unroute(failingThread);
  console.log('Embedded replies survive descendant cache expiry and a failed parent refresh.');
  await sql`UPDATE deck SET public = 0 WHERE id = ${deckId}`;
  await anonymous.evaluate(
    async ({ deckId }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { resetDeniedDeckAccess } = await import('/src/api/decks/deckAccessCache.ts');
      await resetDeniedDeckAccess(queryClient, deckId, undefined);
    },
    { deckId },
  );
  await settled(anonymous);
  const deniedCaches = await anonymous.evaluate(
    async ({ discussionId, nestedParent }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
      return {
        info: queryClient.getQueryData(discussionKeys.info(discussionId)),
        roots: queryClient.getQueryData(discussionKeys.comments(discussionId)),
        replies: queryClient.getQueryData(
          discussionKeys.comments(discussionId, undefined, nestedParent),
        ),
      };
    },
    { discussionId, nestedParent },
  );
  expect(deniedCaches.info).toBeUndefined();
  expect(deniedCaches.roots).toBeUndefined();
  expect(deniedCaches.replies).toBeUndefined();
  await expect(anonymous.getByText('Embedded nested reply.', { exact: true })).toHaveCount(0);
  await sql`UPDATE deck SET public = 1 WHERE id = ${deckId}`;
  console.log('Access revocation clears expired reply caches without restoring private data.');

  const owner = await signedInPage(ownerId);
  const owned = await preparePage(owner);
  const ownerCaches = await metadataCache(owner, ownerId);
  expect(ownerCaches.generic).toMatchObject({ total: 20, canModerate: true });
  expect(ownerCaches.deck).toEqual(ownerCaches.generic);
  const beforeWrite = owned.requests.length;
  await owned.comments.getByRole('button', { name: 'Write a comment', exact: true }).click();
  const form = owner.getByRole('group', { name: 'Edit comment', exact: true });
  await form
    .locator('[contenteditable=true]')
    .first()
    .fill('A new comment without a reply-request burst.');
  await form.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(
    owned.comments.locator('[data-comment-id]').filter({
      hasText: 'A new comment without a reply-request burst.',
    }),
  ).toHaveCount(1);
  await settled(owner);
  const afterWrite = owned.requests.slice(beforeWrite);
  expect(
    afterWrite.filter(url => url.pathname === `/api/discussions/${discussionId}`),
  ).toHaveLength(1);
  expect(afterWrite.filter(url => url.pathname === `/api/deck/${deckId}/discussion`)).toHaveLength(
    0,
  );
  expect(afterWrite.filter(url => url.pathname.endsWith('/comments'))).toHaveLength(1);
  expect(afterWrite.filter(url => url.pathname.endsWith('/article'))).toHaveLength(1);
  expect(afterWrite.filter(url => url.searchParams.has('parentId'))).toHaveLength(0);
  const updated = await metadataCache(owner, ownerId);
  expect(updated.deck).toEqual(updated.generic);
  expect(updated.generic).toMatchObject({ total: 21 });
  const ownedThread = owned.comments.locator(`[data-comment-thread="${parents[8]}"]`);
  await ownedThread.getByRole('button', { name: 'View thread (3 replies)', exact: true }).click();
  await expect(ownedThread.getByText('Embedded nested reply.', { exact: true })).toBeVisible();
  await settled(owner);
  const beforeGuideSave = owned.requests.length;
  const guide = owner.getByRole('region', { name: 'Deck guide', exact: true });
  await guide.getByRole('button', { name: 'Write guide', exact: true }).click();
  const guideForm = owner.getByRole('group', { name: 'Edit guide', exact: true });
  await guideForm
    .locator('[contenteditable=true]')
    .first()
    .fill('A guide save keeps loaded replies in place.');
  await guideForm.getByRole('button', { name: 'Save guide', exact: true }).click();
  await expect(guideForm).toHaveCount(0);
  await expect(
    guide.getByText('A guide save keeps loaded replies in place.', { exact: true }),
  ).toBeVisible();
  await settled(owner);
  const guideSaveRequests = owned.requests.slice(beforeGuideSave);
  expect(
    guideSaveRequests.filter(url => url.pathname === `/api/deck/${deckId}/discussion`),
  ).toHaveLength(0);
  expect(
    guideSaveRequests.filter(url => url.pathname === `/api/discussions/${discussionId}`),
  ).toHaveLength(1);
  expect(guideSaveRequests.filter(url => url.pathname.endsWith('/article'))).toHaveLength(1);
  expect(guideSaveRequests.filter(url => url.pathname.endsWith('/comments'))).toHaveLength(0);
  expect(guideSaveRequests.filter(url => url.searchParams.has('parentId'))).toHaveLength(0);
  const guideSaveCache = await metadataCache(owner, ownerId);
  expect(guideSaveCache.deck).toEqual(guideSaveCache.generic);
  expect(guideSaveCache.generic).toMatchObject({ total: 21 });
  console.log(
    'Saving a guide refreshes metadata without reloading comment pages or expanded threads.',
  );
  // The deck-update path invalidates both families; only the canonical metadata fetches.
  const beforeDeckRefresh = owned.requests.length;
  await owner.evaluate(
    async ({ deckId, discussionId }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
      const { deckDiscussionKeys } = await import('/src/api/decks/discussionKeys.ts');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deckDiscussionKeys.deck(deckId) }),
        queryClient.invalidateQueries({ queryKey: discussionKeys.discussion(discussionId) }),
      ]);
    },
    { deckId, discussionId },
  );
  await settled(owner);
  const deckRefresh = owned.requests.slice(beforeDeckRefresh);
  expect(deckRefresh.filter(url => url.pathname === `/api/deck/${deckId}/discussion`)).toHaveLength(
    0,
  );
  expect(
    deckRefresh.filter(url => url.pathname === `/api/discussions/${discussionId}`),
  ).toHaveLength(1);
  const beforeReset = owned.requests.length;
  await owner.evaluate(
    async ({ deckId, viewer }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { resetDeniedDeckAccess } = await import('/src/api/decks/deckAccessCache.ts');
      await resetDeniedDeckAccess(queryClient, deckId, viewer);
    },
    { deckId, viewer: ownerId },
  );
  await settled(owner);
  const resetRequests = owned.requests.slice(beforeReset);
  expect(
    resetRequests.filter(url => url.pathname === `/api/deck/${deckId}/discussion`),
  ).toHaveLength(0);
  expect(
    resetRequests.filter(url => url.pathname === `/api/discussions/${discussionId}`),
  ).toHaveLength(1);
  const resetCache = await metadataCache(owner, ownerId);
  expect(resetCache.deck).toEqual(resetCache.generic);
  expect(resetCache.generic).toMatchObject({ total: 21 });
  // A reset binding must also survive the deck component being unmounted.
  const beforeRemount = owned.requests.length;
  await owner.evaluate(
    async ({ deckId, viewer }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { deckDiscussionKeys } = await import('/src/api/decks/discussionKeys.ts');
      await queryClient.resetQueries({
        queryKey: deckDiscussionKeys.discussion(deckId, viewer),
        exact: true,
      });
    },
    { deckId, viewer: ownerId },
  );
  await owned.comments
    .locator('[data-comment-id]')
    .first()
    .getByRole('button', { name: ownerId, exact: true })
    .click();
  await owner
    .getByRole('dialog', { name: `${ownerId}'s profile`, exact: true })
    .getByRole('link', { name: 'Open profile', exact: true })
    .click();
  await expect(owner).toHaveURL(new RegExp(`/users/${ownerId}$`));
  await owner.goBack();
  await expect(owned.comments).toContainText('A new comment without a reply-request burst.');
  await settled(owner);
  const remountRequests = owned.requests.slice(beforeRemount);
  expect(
    remountRequests.filter(url => url.pathname === `/api/deck/${deckId}/discussion`),
  ).toHaveLength(0);
  expect(
    remountRequests.filter(url => url.pathname === `/api/discussions/${discussionId}`),
  ).toHaveLength(0);
  const remountedCache = await metadataCache(owner, ownerId);
  expect(remountedCache.deck).toEqual(remountedCache.generic);
  console.log(
    'The deck/discussion binding survives a metadata reset and route remount without another discovery request.',
  );
  const after = owned.requests.length;
  await owner.clock.fastForward(120_000);
  await owner.clock.runFor(100);
  await settled(owner);
  expect(owned.requests).toHaveLength(after);
  const reader = await signedInPage(readerId);
  const reading = await preparePage(reader, 18);
  await sql`UPDATE deck SET public = 0 WHERE id = ${deckId}`;
  await reader.evaluate(
    async ({ deckId, viewer }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { resetDeniedDeckAccess } = await import('/src/api/decks/deckAccessCache.ts');
      await resetDeniedDeckAccess(queryClient, deckId, viewer);
    },
    { deckId, viewer: readerId },
  );
  const ownComments = reader.getByRole('region', {
    name: 'Your comments on this deck',
    exact: true,
  });
  await expect(ownComments.getByText('Reply 0.0', { exact: true })).toBeVisible();
  await settled(reader);
  const beforeFocus = reading.requests.length;
  await reader.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    Reflect.deleteProperty(document, 'visibilityState');
  });
  await reader.clock.runFor(100);
  await settled(reader);
  expect(reading.requests).toHaveLength(beforeFocus);
  const ownComment = ownComments.locator('[data-comment-id]');
  reader.once('dialog', dialog => dialog.accept());
  await ownComment.getByRole('button', { name: 'Delete comment', exact: true }).click();
  await expect(ownComments).toHaveCount(0);
  await settled(reader);
  expect(
    reading.requests.slice(beforeFocus).filter(url => url.pathname.endsWith('/comments/own')),
  ).toHaveLength(1);
  console.log(
    'Own comments stay cached on focus and refresh after deleting a comment without deck access.',
  );
  expect(errors).toEqual([]);
  console.log(
    'Posting, deck updates and access resets use one metadata fetch. Both caches stay synchronized, with no polling or single-reply request burst. Request regressions passed.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM deck_information WHERE deck_id=${deckId}`;
  await sql`DELETE FROM deck_card WHERE deck_id=${deckId}`;
  await sql`DELETE FROM deck WHERE id=${deckId}`;
  for (const id of [ownerId, readerId]) {
    await sql`DELETE FROM session WHERE user_id=${id}`;
    await sql`DELETE FROM "user" WHERE id=${id}`;
  }
  await sql.end();
}
