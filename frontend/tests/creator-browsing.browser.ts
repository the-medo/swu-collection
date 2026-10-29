// Build first, then: CREATOR_BROWSING_BROWSER_TEST=1 bun frontend/tests/creator-browsing.browser.ts
// Public API fixtures and a loopback static server; no account or database writes.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import type {
  CreatorProfile,
  CreationSummary,
  CreatorDeckList,
} from '../../shared/creators/contracts.ts';

if (process.env.CREATOR_BROWSING_BROWSER_TEST !== '1')
  throw new Error('Enable CREATOR_BROWSING_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const profile: CreatorProfile = {
  id: '10000000-0000-4000-8000-000000000001',
  slug: 'test-creator',
  name: 'Test Creator',
  ownerId: null,
  revision: 1,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  tagline: 'Decks, strategy and tournament stories.',
  avatarUrl: '',
  bannerUrl: '',
  bio: emptyPostDocument(),
  languages: ['en', 'fr'],
  specialties: ['purpose:meta-report'],
  links: [],
  introduction: '',
  youtube: [],
};
const otherProfile: CreatorProfile = {
  ...profile,
  id: '10000000-0000-4000-8000-000000000002',
  slug: 'other-creator',
  name: 'Other Creator',
};
const items: CreationSummary[] = Array.from({ length: 14 }, (_, n) => ({
  id: `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  creatorId: profile.id,
  authorId: null,
  author: null,
  ownershipRevision: 1,
  revision: 1,
  sourceVerified: n < 12,
  publishedAt: '2026-10-12T12:00:00Z',
  updatedAt: '2026-10-13T12:00:00Z',
  creator: { slug: profile.slug, name: profile.name, avatarUrl: '' },
  document: {
    title:
      n < 12
        ? `Video ${n + 1}: Preparing for the next event`
        : `Article ${n - 11}: Understanding the meta`,
    summary: 'A practical guide to card choices, matchups and preparing for your next tournament.',
    medium: n < 12 ? 'video' : 'article',
    durationSeconds: n === 0 ? 754 : n === 1 ? 3920 : null,
    coverUrl: '',
    language: n % 2 ? 'fr' : 'en',
    tags: [n % 2 ? 'purpose:gameplay' : 'purpose:meta-report'],
    freshness: 'current',
    pinned: n === 0,
    series: 'Tournament preparation',
    seriesOrder: n,
  },
}));
const decks: CreatorDeckList['items'] = Array.from({ length: 15 }, (_, n) => ({
  user: { id: 'fixture', displayName: 'Test Creator', image: null },
  deck: {
    id: `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    userId: 'fixture',
    name: `Tournament brew ${n + 1}`,
    description: 'Linked from a published guide',
    format: 1,
    public: 1,
    cardPoolId: null,
    leaderCardId1: 'sabine-wren--galvanized-revolutionary',
    leaderCardId2: null,
    baseCardId: 'energy-conversion-lab',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-12T12:00:00Z',
  },
  entityPrices: [],
}));
let failNext = false;
let nextAttempts = 0;
let pendingFeed: Promise<void> | undefined;
let releaseFeed: (() => void) | undefined;
let releaseCounts: (() => void) | undefined;
let pendingCounts: Promise<void> | undefined = new Promise(resolve => {
  releaseCounts = resolve;
});
let countsUnavailable = false;
let failedCounts = 0;
const requests: URLSearchParams[] = [];
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname, searchParams } = new URL(request.url);
    const json = (data: unknown) => Response.json({ data });
    if (pathname === `/api/creator-hub/creators/${profile.slug}`) return json(profile);
    if (pathname === `/api/creator-hub/creators/${otherProfile.slug}`) return json(otherProfile);
    if (pathname === `/api/creator-hub/creators/${profile.id}/counts`) {
      await pendingCounts;
      return json({ videos: 12, articles: 2, podcasts: 0, decks: 15, series: 1 });
    }
    if (pathname === `/api/creator-hub/creators/${otherProfile.id}/counts`) {
      if (countsUnavailable) {
        failedCounts++;
        return Response.json({ message: 'Fixture unavailable' }, { status: 503 });
      }
      return json({ videos: 0, articles: 0, podcasts: 0, decks: 0, series: 0 });
    }
    if (pathname === '/api/creator-hub/creators')
      return json({ items: [profile, otherProfile], hasMore: false, languages: ['en', 'fr'] });
    if (pathname === `/api/creator-hub/creators/${profile.id}/collections`)
      return json({ series: ['Tournament preparation'], decks: [], hasMore: false });
    if (pathname === `/api/creator-hub/creators/${profile.id}/decks`) {
      const page = Number(searchParams.get('page') ?? 1),
        limit = Number(searchParams.get('limit') ?? 12);
      return json({
        items: decks.slice((page - 1) * limit, page * limit),
        hasMore: page * limit < decks.length,
      });
    }
    if (pathname === '/api/creator-hub/creations') {
      requests.push(searchParams);
      const page = Number(searchParams.get('page') ?? 1),
        limit = Number(searchParams.get('limit') ?? 24);
      if (page === 1) await pendingFeed;
      if (searchParams.get('creatorId') === otherProfile.id)
        return json({ items: [], hasMore: false, languages: [], tagCounts: [] });
      if (page > 1) {
        nextAttempts++;
        if (failNext) return Response.json({ message: 'Fixture unavailable' }, { status: 503 });
      }
      const tags = searchParams.get('tags')?.split(',') ?? [];
      const section = items.filter(
        item =>
          !tags.some(
            tag => tag.startsWith('medium:') && tag !== `medium:${item.document.medium}`,
          ) &&
          (!searchParams.get('q') || item.document.title.includes(searchParams.get('q')!)),
      );
      const available = section.filter(
        item =>
          !searchParams.get('language') || item.document.language === searchParams.get('language'),
      );
      const matching = available.filter(
        item => !tags.some(tag => !tag.startsWith('medium:') && !item.document.tags.includes(tag)),
      );
      return json({
        items: matching.slice((page - 1) * limit, page * limit),
        hasMore: page * limit < matching.length,
        languages: [...new Set(section.map(item => item.document.language))],
        tagCounts: ['purpose:meta-report', 'purpose:gameplay']
          .map(id => ({
            id,
            count: available.filter(item => item.document.tags.includes(id)).length,
          }))
          .filter(tag => tag.count),
      });
    }
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'creator-browser', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'creator-browser', cards: {} },
        karabast_unimplemented: {},
      });
    if (pathname === '/api/auth/get-session') return Response.json(null);
    if (pathname === '/api/user-settings' || pathname === '/api/application-configuration')
      return Response.json({});
    if (pathname.startsWith('/api/')) return json([]);
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 15_000 });
const context = await browser.newContext({ viewport: { width: 1550, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
let documentRequests = 0;
page.on('request', request => {
  if (request.resourceType() === 'document' && request.frame() === page.mainFrame())
    documentRequests++;
});
const output = resolve(import.meta.dir, '../../.swubase/creator-browsing');
await mkdir(output, { recursive: true });
try {
  await page.goto(`${server.url}creators/${profile.slug}/videos`);
  const nav = page.getByRole('navigation', { name: 'Creator content' });
  await expect(nav.getByRole('link')).toHaveText([
    'All content',
    'Videos',
    'About',
    'Is this your channel?',
  ]);
  await expect(nav.getByRole('link', { name: 'Videos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  releaseCounts!();
  pendingCounts = undefined;
  await expect(nav.getByRole('link', { name: 'Videos (12)', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link')).toHaveText([
    'All content',
    'Videos (12)',
    'Articles (2)',
    'Decks (15)',
    'Series (1)',
    'About',
    'Is this your channel?',
  ]);
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(6);
  expect(requests[0].get('limit')).toBe('6');
  await expect(page.getByRole('button', { name: 'Meta report (6)', exact: true })).toBeVisible();
  await expect(page.locator('article time').first()).toContainText('Uploaded Oct 12, 2026');
  const thumbnails = page.locator('[data-creator-layout] article > a');
  await expect(thumbnails.nth(0)).toContainText('12:34');
  await expect(thumbnails.nth(1)).toContainText('1:05:20');
  await expect(thumbnails.nth(2)).toHaveText('video');
  await expect(page.locator('img[alt="English"]').first()).toHaveAttribute(
    'src',
    'https://images.swubase.com/flags/countries/gb.webp',
  );
  await page.screenshot({ path: resolve(output, 'creator-videos-desktop.png'), fullPage: true });
  failNext = true;
  await page.getByRole('button', { name: 'Load more content' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('alert')).toContainText('Could not load more content');
  const attempts = nextAttempts;
  await page.waitForTimeout(500);
  expect(nextAttempts).toBe(attempts);
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(6);
  failNext = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(12);
  // Crossing between the index and media routes must also retain the feed while loading.
  await nav.evaluate(element => {
    const main = element.closest('main')!;
    main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 80;
  });
  const scrollBeforeTab = await page.locator('main').evaluate(element => element.scrollTop);
  expect(scrollBeforeTab).toBeGreaterThan(100);
  pendingFeed = new Promise<void>(resolve => {
    releaseFeed = resolve;
  });
  await nav.getByRole('link', { name: 'All content', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/creators/${profile.slug}/?$`));
  await expect.poll(() => requests.at(-1)?.has('tags')).toBe(false);
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeCloseTo(
    scrollBeforeTab,
    0,
  );
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(12);
  releaseFeed!();
  pendingFeed = undefined;
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(6);
  await nav.getByRole('link', { name: 'Videos (12)', exact: true }).click();
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(12);
  // A slow filter response must not collapse the feed and clamp the scroll position.
  const filters = page.getByRole('region', { name: 'Filter creator content' });
  await filters.evaluate(element => {
    const main = element.closest('main')!;
    main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 80;
  });
  const scrollBeforeFilter = await page.locator('main').evaluate(element => element.scrollTop);
  expect(scrollBeforeFilter).toBeGreaterThan(100);
  pendingFeed = new Promise<void>(resolve => {
    releaseFeed = resolve;
  });
  await page.getByRole('button', { name: 'Meta report (6)', exact: true }).click();
  await expect(page).toHaveURL(/tags=purpose/);
  await expect.poll(() => requests.at(-1)?.get('tags')).toContain('purpose:meta-report');
  // Allow layout and browser scroll clamping to run while the response is held.
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeCloseTo(
    scrollBeforeFilter,
    0,
  );
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(12);
  await expect(filters.getByRole('button', { name: 'Gameplay (6)', exact: true })).toBeVisible();
  const updateStatus = page.getByRole('status', { name: 'Creator content update' });
  await expect(updateStatus).toHaveText('Updating content…');
  expect(documentRequests).toBe(1);
  releaseFeed!();
  pendingFeed = undefined;
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(6);
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeCloseTo(
    scrollBeforeFilter,
    0,
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Meta report (6)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'French', exact: true }).click();
  await expect(page.getByText('No publications match these filters.')).toBeVisible();
  pendingFeed = new Promise<void>(resolve => {
    releaseFeed = resolve;
  });
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await expect(updateStatus).toHaveText('Updating content…');
  await expect(page.getByRole('region', { name: 'Creator publications' })).toContainText(
    'Updating content…',
  );
  await expect(page.getByText('New creations will appear here.')).not.toBeVisible();
  releaseFeed!();
  pendingFeed = undefined;
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(6);
  await page.getByRole('textbox', { name: 'Search this creator' }).fill('Video 1:');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Videos (12)', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Articles (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await nav.getByRole('link', { name: 'Articles (2)', exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(page.locator('article time').first()).toContainText('Published Oct 12, 2026');
  await nav.getByRole('link', { name: 'Decks (15)', exact: true }).click();
  await expect(page).toHaveURL(/\/decks$/);
  await expect(page.getByRole('columnheader', { name: 'Leaders/Base' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Tournament brew/ })).toHaveCount(12);
  await page.screenshot({ path: resolve(output, 'creator-decks-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Load more decks' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: /Tournament brew/ })).toHaveCount(15);
  await page.reload();
  await expect(nav.getByRole('link', { name: 'Decks (15)', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/articles$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/decks$/);
  await nav.getByRole('link', { name: 'Series (1)', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Series', exact: true })
    .selectOption('Tournament preparation');
  await expect(page).toHaveURL(/series=/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Series', exact: true })).toHaveValue(
    'Tournament preparation',
  );
  await nav.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About Test Creator' })).toBeVisible();
  await expect(page.locator('.bn-container')).toBeVisible();
  await nav.getByRole('link', { name: 'All content', exact: true }).click();
  expect(new URL(page.url()).pathname.replace(/\/$/, '')).toBe(`/creators/${profile.slug}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: resolve(output, 'creator-mobile-dark.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await nav.getByRole('link', { name: 'Decks (15)', exact: true }).click();
  await expect(page.getByRole('link', { name: /Tournament brew 1\b/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(output, 'creator-decks-mobile-dark.png'), fullPage: true });
  await page.getByRole('link', { name: /Meet the creators/ }).click();
  await expect(page.locator('img[alt="English"]').first()).toHaveAttribute(
    'src',
    /countries\/gb.webp/,
  );
  // A new creator must not inherit another creator's cached publications.
  pendingFeed = new Promise<void>(resolve => {
    releaseFeed = resolve;
  });
  await page.getByRole('link', { name: /Other Creator/ }).click();
  await expect(page.getByRole('heading', { name: 'Other Creator', exact: true })).toBeVisible();
  await expect.poll(() => requests.at(-1)?.get('creatorId')).toBe(otherProfile.id);
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible();
  await expect(page.locator('[data-creator-layout] article')).toHaveCount(0);
  releaseFeed!();
  pendingFeed = undefined;
  await expect(page.getByText('New creations will appear here.')).toBeVisible();
  await expect(nav.getByRole('link')).toHaveText(['All content', 'About', 'Is this your channel?']);
  // A bookmarked empty section still has a selected tab and the normal empty state.
  await page.goto(`${server.url}creators/${otherProfile.slug}/videos`);
  await expect(nav.getByRole('link', { name: 'Videos (0)', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByText('New creations will appear here.')).toBeVisible();
  await nav.getByRole('link', { name: 'All content', exact: true }).click();
  await expect(nav.getByRole('link')).toHaveText(['All content', 'About', 'Is this your channel?']);
  countsUnavailable = true;
  await page.reload();
  await expect.poll(() => failedCounts).toBe(2);
  await expect(nav.getByRole('link')).toHaveText([
    'All content',
    'Videos',
    'Articles',
    'Podcasts',
    'Decks',
    'Series',
    'About',
    'Is this your channel?',
  ]);
  await nav.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About Other Creator' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log('Creator browsing browser checks passed. Screenshots:', output);
} finally {
  releaseCounts?.();
  releaseFeed?.();
  await browser.close();
  server.stop(true);
}
