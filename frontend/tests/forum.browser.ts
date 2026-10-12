// FORUM_BROWSER_TEST=1 bun frontend/tests/forum.browser.ts
// Build first. Uses a temporary loopback server and API fixtures, no database.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import type { DiscussionFeedKind, RecentDiscussion } from '../../shared/types/discussions.ts';

if (process.env.FORUM_BROWSER_TEST !== '1') throw new Error('Enable FORUM_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const leader = Object.values(cardList).find(card => card?.type === 'Leader')!;
const base = Object.values(cardList).find(card => card?.type === 'Base')!;
const entries: RecentDiscussion[] = Array.from({ length: 5 }, (_, i) => ({
  id: `77777777-7777-4777-8777-77777777777${i}`,
  discussionId: '88888888-8888-4888-8888-888888888888',
  type: i === 0 ? 'deck' : 'card-detail',
  targetName: i === 0 ? 'Weekend experiments' : `${leader.name} — discussion ${i}`,
  targetUrl: `/cards/detail/${leader.cardId}?cardTab=rules-discussion&cardComment=77777777-7777-4777-8777-77777777777${i}`,
  thumbnail:
    i === 0
      ? { kind: 'deck', leaderId: leader.cardId, leader2Id: null, baseId: base.cardId }
      : { kind: 'card', cardId: leader.cardId },
  preview: [
    'Which cards would you swap into this deck?',
    'How does this ability work?',
    'I would try a lower curve.',
    'This worked well in my last game.',
    'Another idea for this list.',
  ][i]!,
  createdAt: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
  author:
    i === 1
      ? null
      : { id: 'forum-author', displayName: 'Mira', image: i === 3 ? null : '/fixture-avatar.svg' },
}));
const state: Record<DiscussionFeedKind, 'ready' | 'error' | 'empty'> = {
  discussions: 'ready',
  comments: 'ready',
};
let failNextPage = false;
const requests: { kind: string; cursor: string | null; type?: string }[] = [];
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname, searchParams } = new URL(request.url);
    if (pathname === '/api/discussions/feed') {
      const kind = searchParams.get('kind') as DiscussionFeedKind;
      const cursor = searchParams.get('cursor');
      const type = searchParams.get('type');
      requests.push({ kind, cursor, ...(type ? { type } : {}) });
      if (state[kind] === 'error' || (cursor && failNextPage))
        return Response.json({ error: 'Fixture error' }, { status: 503 });
      if (state[kind] === 'empty') return Response.json({ data: [], nextCursor: null });
      if (type) {
        const matching = entries.filter(entry => entry.type === type);
        return Response.json({
          data: matching.slice(cursor ? 2 : 0, cursor ? 4 : 2),
          nextCursor: !cursor && matching.length > 2 ? `next-${kind}-${type}` : null,
        });
      }
      const items = kind === 'discussions' ? entries.slice(0, 2) : entries.slice(2, 4);
      return Response.json({
        data: cursor ? [entries[4]] : items,
        nextCursor: cursor ? null : `next-${kind}`,
      });
    }
    if (pathname === '/fixture-avatar.svg')
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#326149"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } },
      );
    if (pathname === '/api/auth/get-session') return Response.json(null);
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/user/forum-author/achievements')
      return Response.json({ data: { achievements: [] } });
    if (pathname === '/api/user/forum-author/header')
      return Response.json({ data: { image: '/fixture-avatar.svg', width: 1600, height: 400 } });
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'forum-fixture', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'forum-fixture', cards: {} },
        karabast_unimplemented: {},
      });
    if (pathname.startsWith('/api/')) return Response.json({ data: [] });
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1200 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const discussions = page.getByRole('region', { name: 'Newest threads' });
const comments = page.getByRole('region', { name: 'Recent discussions' });
const output = resolve(import.meta.dir, '../../.swubase/forum');
await mkdir(output, { recursive: true });
const openForum = () => page.goto(`${server.url}forum`);
try {
  await openForum();
  await expect(page).toHaveTitle('Forum | SWUBase');
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  await expect(comments.getByRole('listitem')).toHaveCount(2);
  const left = (await discussions.boundingBox())!;
  const right = (await comments.boundingBox())!;
  expect(Math.abs(left.width / right.width - 2)).toBeLessThan(0.02);
  expect(left.x + left.width).toBeLessThan(right.x);
  const invitation = page.getByRole('complementary', { name: 'Join the conversation' });
  const inviteBounds = (await invitation.boundingBox())!;
  expect(Math.abs(inviteBounds.y - right.y)).toBeLessThan(1);
  expect(inviteBounds.y + inviteBounds.height).toBeLessThan(left.y);
  const introBounds = (await page
    .getByRole('heading', { name: 'Forum', exact: true })
    .boundingBox())!;
  expect(introBounds.x + introBounds.width).toBeLessThan(inviteBounds.x);
  await expect(page.getByRole('link', { name: 'Forum', exact: true })).toHaveCount(0);
  const startDiscussion = invitation.getByRole('link', { name: 'Start a thread' });
  const artoo = invitation.getByRole('img', { name: 'R2-D2, Full of Solutions' });
  await expect(artoo).toBeVisible();
  await expect
    .poll(() => artoo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const filters = page.getByRole('group', { name: 'Filter threads & discussions' });
  await expect(
    discussions.getByText('Filter threads & discussions', { exact: true }),
  ).toBeVisible();
  const filterBounds = (await filters.boundingBox())!;
  const firstThreadBounds = (await discussions.getByRole('listitem').first().boundingBox())!;
  expect(filterBounds.y).toBeGreaterThan(left.y);
  expect(filterBounds.y + filterBounds.height).toBeLessThan(firstThreadBounds.y);
  await expect(filters.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
  await expect(startDiscussion).toBeVisible();
  await expect(startDiscussion).toHaveAttribute('href', '/forum/new');
  await expect(discussions).toContainText('Deleted user');
  await expect(comments).toContainText('I would try a lower curve.');
  await expect(discussions.locator('.deck-artwork img')).toHaveCount(2);
  await expect(discussions.getByRole('list').getByRole('link').first()).toHaveAttribute(
    'href',
    entries[0]!.targetUrl,
  );
  const author = discussions.getByRole('button', { name: "View Mira's profile" }).first();
  const before = page.url();
  await author.locator('img').click();
  const profile = page.getByRole('dialog', { name: "Mira's profile" });
  await expect(profile.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
    'href',
    '/users/forum-author',
  );
  expect(page.url()).toBe(before);
  await page.keyboard.press('Escape');
  await expect(author).toBeFocused();
  await author.press('Enter');
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toHaveCount(0);

  const commentRow = comments.getByRole('listitem').first();
  const commentAuthor = commentRow.getByRole('button', { name: "View Mira's profile" });
  await expect(commentRow.getByRole('link')).toHaveAccessibleDescription(entries[2]!.preview);
  const avatarBounds = (await commentAuthor.boundingBox())!;
  const previewBounds = (await commentRow
    .getByText(entries[2]!.preview, { exact: true })
    .boundingBox())!;
  const timeBounds = (await commentRow.locator('time').boundingBox())!;
  const commentBounds = (await commentRow.boundingBox())!;
  expect(avatarBounds.width).toBeLessThan(40);
  expect(avatarBounds.x + avatarBounds.width).toBeLessThan(previewBounds.x);
  expect(timeBounds.y).toBeLessThan(previewBounds.y);
  expect(
    Math.abs(timeBounds.x + timeBounds.width - commentBounds.x - commentBounds.width),
  ).toBeLessThan(1);
  expect(commentBounds.height).toBeLessThan(firstThreadBounds.height);
  await expect(
    comments.getByRole('listitem').nth(1).getByText('MI', { exact: true }),
  ).toBeVisible();
  await commentAuthor.locator('img').click();
  await expect(profile).toBeVisible();
  expect(page.url()).toBe(before);
  await page.keyboard.press('Escape');
  await expect(commentAuthor).toBeFocused();
  await commentAuthor.press('Enter');
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.forum-page').screenshot({ path: `${output}/desktop.png` });

  await discussions.getByRole('button', { name: 'Load more threads' }).click();
  await expect(discussions.getByRole('listitem')).toHaveCount(3);
  await expect(comments.getByRole('listitem')).toHaveCount(2);
  expect(requests).toContainEqual({ kind: 'discussions', cursor: 'next-discussions' });
  await expect(discussions.getByRole('button', { name: 'Load more threads' })).toHaveCount(0);
  failNextPage = true;
  await comments.getByRole('button', { name: 'Load more comments' }).click();
  await expect(comments.getByRole('alert')).toContainText('Couldn’t load more comments.');
  await expect(comments.getByRole('listitem')).toHaveCount(2);
  failNextPage = false;
  await comments.getByRole('button', { name: 'Retry comments' }).click();
  await expect(comments.getByRole('listitem')).toHaveCount(3);

  for (const width of [1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const stackedLeft = (await discussions.boundingBox())!;
    const stackedRight = (await comments.boundingBox())!;
    const stackedInvite = (await invitation.boundingBox())!;
    expect(stackedInvite.y + stackedInvite.height).toBeLessThan(stackedLeft.y);
    if (width < 1024) expect(stackedRight.y).toBeGreaterThan(stackedLeft.y + stackedLeft.height);
    else expect(stackedRight.y).toBeLessThan(stackedLeft.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await commentAuthor.click();
    await expect(profile).toBeVisible();
    const bounds = (await profile.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await page.locator('.forum-page').screenshot({ path: `${output}/width-${width}.png` });
  }
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await page.reload();
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  await page.locator('.forum-page').screenshot({ path: `${output}/dark.png` });
  await page.setViewportSize({ width: 1500, height: 1200 });
  await page.locator('.forum-page').screenshot({ path: `${output}/dark-desktop.png` });

  state.discussions = 'error';
  await openForum();
  await expect(discussions.getByRole('alert')).toContainText('Newest threads couldn’t be loaded.');
  await expect(comments.getByRole('listitem')).toHaveCount(2);
  state.discussions = 'ready';
  await discussions.getByRole('button', { name: 'Retry threads' }).click();
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  state.discussions = 'empty';
  state.comments = 'empty';
  await openForum();
  await expect(discussions).toContainText('No threads yet.');
  await expect(comments).toContainText('No comments yet.');

  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/discussions/feed?*', async route => {
    await gate;
    await route.continue();
  });
  try {
    state.discussions = 'ready';
    state.comments = 'ready';
    await openForum();
    await expect(discussions.getByRole('status', { name: 'Loading threads' })).toBeVisible();
    await expect(comments.getByRole('status', { name: 'Loading comments' })).toBeVisible();
    release();
    await expect(discussions.getByRole('listitem')).toHaveCount(2);
    await expect(comments.getByRole('listitem')).toHaveCount(2);
  } finally {
    release();
    await page.unroute('**/api/discussions/feed?*');
  }
  await filters.getByRole('radio', { name: 'Cards', exact: true }).click();
  await expect(page).toHaveURL(`${server.url}forum?forumType=card-detail`);
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  await expect(comments.getByRole('listitem')).toHaveCount(2);
  await expect(comments.getByRole('img', { name: 'Deleted user' })).toBeVisible();
  await expect(comments.getByRole('img', { name: 'Deleted user' })).toHaveAttribute(
    'title',
    'Deleted user',
  );
  await expect(comments.getByRole('button', { name: "View Deleted user's profile" })).toHaveCount(
    0,
  );
  await expect(discussions).not.toContainText('Weekend experiments');
  await expect(comments).not.toContainText('Weekend experiments');
  await discussions.getByRole('button', { name: 'Load more threads' }).click();
  await expect(discussions.getByRole('listitem')).toHaveCount(4);
  expect(requests).toContainEqual({
    kind: 'discussions',
    cursor: 'next-discussions-card-detail',
    type: 'card-detail',
  });
  await filters.getByRole('radio', { name: 'Decks', exact: true }).click();
  for (const feed of [discussions, comments]) {
    await expect(feed.getByRole('listitem')).toHaveCount(1);
    await expect(feed).toContainText('Weekend experiments');
    await expect(feed.getByRole('button', { name: /Load more/ })).toHaveCount(0);
  }
  await page.reload();
  await expect(filters.getByRole('radio', { name: 'Decks', exact: true })).toBeChecked();
  await expect(discussions.getByRole('listitem')).toHaveCount(1);
  await page.goBack();
  await expect(filters.getByRole('radio', { name: 'Cards', exact: true })).toBeChecked();
  await expect(discussions).not.toContainText('Weekend experiments');
  await page.goForward();
  await expect(filters.getByRole('radio', { name: 'Decks', exact: true })).toBeChecked();
  for (const [label, type] of [
    ['General', 'forum'],
    ['Daily pools', 'daily-pool'],
  ] as const) {
    await filters.getByRole('radio', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${server.url}forum?forumType=${type}`);
    await expect(discussions).toContainText('No threads of this type yet.');
    await expect(comments).toContainText('No comments of this type yet.');
  }
  await filters.getByRole('radio', { name: 'All', exact: true }).click();
  await expect(page).toHaveURL(`${server.url}forum`);
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  await page.goto(`${server.url}forum?forumType=unknown`);
  await expect(filters.getByRole('radio', { name: 'All', exact: true })).toBeChecked();
  await expect(discussions.getByRole('listitem')).toHaveCount(2);
  await startDiscussion.focus();
  await expect(startDiscussion).toBeFocused();
  await startDiscussion.press('Enter');
  await expect(page).toHaveURL(`${server.url}forum/new`);
  await expect(page.getByRole('button', { name: 'Sign in to start a discussion' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(`Forum browser checks passed. Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.stop(true);
}
