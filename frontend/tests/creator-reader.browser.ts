// Build first, then CREATOR_READER_BROWSER_TEST=1 bun frontend/tests/creator-reader.browser.ts
// Public fixtures on a loopback server; no accounts, database or provider writes.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

if (process.env.CREATOR_READER_BROWSER_TEST !== '1') throw new Error('Enable explicitly.');
const dist = resolve(import.meta.dir, '../dist');
const profile = {
  ...creatorProfileSchema.parse({
    slug: 'reader-academy',
    name: 'Reader Academy',
    languages: ['en', 'fr'],
    specialties: [],
    links: [],
    bio: emptyPostDocument(),
  }),
  id: '10000000-0000-4000-8000-000000000001',
  ownerId: null,
  revision: 1,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  youtube: [],
};
const publications = Array.from({ length: 48 }, (_, i) => ({
  id: `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  creatorId: profile.id,
  authorId: null,
  author: null,
  revision: 1,
  ownershipRevision: 1,
  sourceVerified: false,
  publishedAt: '2026-10-12T12:00:00Z',
  updatedAt: '2026-10-12T12:00:00Z',
  creator: { slug: profile.slug, name: profile.name, avatarUrl: '' },
  references: [],
  document: creationDocumentSchema.parse({
    title: `Guide ${i + 1}: Making better resource decisions`,
    medium: 'article',
    summary: 'Practical decisions for your next game.',
    freshness: i === 0 ? 'historical' : 'current',
    pinned: i === 0,
    language: i % 2 ? 'fr' : 'en',
    tags: ['purpose:strategy'],
    references: [],
    chapters: [],
    body: {
      version: 1,
      blocks: Array.from({ length: 25 }, (_, n) => ({
        id: `paragraph-${n}`,
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'A strategy guide should make it easy to explore, read, and return to the next useful story.',
            styles: {},
          },
        ],
        children: [],
      })),
    },
  }),
}));
let failDiscovery = false;
let pendingProfile: Promise<void> | undefined;
let releaseProfile: (() => void) | undefined;
let pendingDiscovery: Promise<void> | undefined;
let releaseDiscovery: (() => void) | undefined;
let discoveryWaiting = false;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const url = new URL(request.url),
      q = url.searchParams;
    const json = (data: unknown) => Response.json({ data });
    if (url.pathname === `/api/creator-hub/creators/${profile.slug}`) {
      await pendingProfile;
      return json(profile);
    }
    if (url.pathname === `/api/creator-hub/creators/${profile.id}/counts`)
      return json({ articles: 48, videos: 0, podcasts: 0, decks: 0, series: 0 });
    if (url.pathname === '/api/creator-hub/creators')
      return json({
        items: Array.from({ length: 12 }, (_, i) => ({ ...profile, id: `${profile.id}-${i}` })),
        hasMore: true,
        languages: ['en', 'fr'],
      });
    if (url.pathname === '/api/creator-hub/creations') {
      if (pendingDiscovery) {
        discoveryWaiting = true;
        await pendingDiscovery;
      }
      if (failDiscovery) return Response.json({ message: 'Fixture unavailable' }, { status: 503 });
      const tags = q.get('tags')?.split(',') ?? [];
      const matching = publications.filter(
        item =>
          (!q.get('q') || item.document.title.toLowerCase().includes(q.get('q')!.toLowerCase())) &&
          (!q.get('language') || item.document.language === q.get('language')) &&
          (!tags.some(tag => tag.startsWith('medium:')) || tags.includes('medium:article')),
      );
      const page = Number(q.get('page') ?? 1),
        limit = Number(q.get('limit') ?? 24);
      return json({
        items: matching.slice((page - 1) * limit, page * limit),
        hasMore: page * limit < matching.length,
        languages: ['en', 'fr'],
        tagCounts: [{ id: 'purpose:strategy', count: matching.length }],
      });
    }
    if (url.pathname.startsWith('/api/creator-hub/creations/'))
      return json(publications.find(item => url.pathname.endsWith(item.id)));
    if (url.pathname === '/api/creator-hub/subjects') return json([]);
    if (url.pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'reader-test', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'reader-test', cards: {} },
        karabast_unimplemented: {},
      });
    if (url.pathname === '/api/auth/get-session') return Response.json(null);
    if (url.pathname === '/api/user-settings' || url.pathname === '/api/application-configuration')
      return Response.json({});
    if (url.pathname.startsWith('/api/')) return json([]);
    const file = resolve(dist, `.${url.pathname}`);
    return new Response(
      Bun.file(
        file.startsWith(dist + '/') && (await Bun.file(file).exists())
          ? file
          : resolve(dist, 'index.html'),
      ),
    );
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 15_000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const output = resolve(import.meta.dir, '../../.swubase/creator-reader');
await mkdir(output, { recursive: true });
const scrollTop = () => page.locator('main').evaluate(el => el.scrollTop);
try {
  await page.clock.install();
  await page.goto(`${server.url}creators/${profile.slug}/articles`);
  const cards = page.locator('[aria-label="Creator publications"] article');
  await expect(cards).toHaveCount(6);
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole('button', { name: 'Load more content', exact: true })
      .scrollIntoViewIfNeeded();
    await expect.poll(() => cards.count()).toBeGreaterThanOrEqual((i + 2) * 6);
  }
  await cards.nth(16).locator('h3 a').scrollIntoViewIfNeeded();
  const before = await scrollTop();
  const loaded = await cards.count();
  expect(before).toBeGreaterThan(1000);
  await cards.nth(16).locator('h3 a').click();
  await expect(
    page.getByRole('heading', { name: publications[16].document.title, exact: true }),
  ).toBeVisible();
  await expect.poll(scrollTop).toBe(0);
  // An article can take longer to read than the default five-minute query cache.
  await page.clock.fastForward(6 * 60_000);
  pendingProfile = new Promise<void>(resolve => {
    releaseProfile = resolve;
  });
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible();
  releaseProfile!();
  pendingProfile = undefined;
  await expect(cards).toHaveCount(loaded);
  await expect.poll(async () => Math.abs((await scrollTop()) - before)).toBeLessThan(3);
  await cards.nth(16).locator('h3 a').click();
  await page.goBack();
  await expect(cards).toHaveCount(loaded);
  await expect.poll(async () => Math.abs((await scrollTop()) - before)).toBeLessThan(3);
  // A delayed response must not override a reader who has already started scrolling.
  for (const interaction of ['wheel', 'keyboard']) {
    await cards.nth(16).locator('h3 a').click();
    await page.clock.fastForward(6 * 60_000);
    pendingProfile = new Promise<void>(resolve => {
      releaseProfile = resolve;
    });
    await page.goBack();
    await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible();
    if (interaction === 'wheel') {
      await page.mouse.move(800, 400);
      await page.mouse.wheel(0, 200);
    } else {
      await page.keyboard.press('PageDown');
    }
    releaseProfile!();
    pendingProfile = undefined;
    await expect(cards).toHaveCount(loaded);
    await expect.poll(scrollTop).toBeLessThan(250);
  }
  const tabs = page.getByRole('navigation', { name: 'Creator content' });
  await tabs.getByRole('link', { name: 'All content', exact: true }).click();
  await expect(cards).toHaveCount(6);
  await page.locator('main').evaluate(element => {
    element.scrollTop = 200;
  });
  await expect.poll(scrollTop).toBe(200);
  const beforeTab = await scrollTop();
  await tabs.getByRole('link', { name: 'Articles (48)', exact: true }).click();
  await expect.poll(async () => Math.abs((await scrollTop()) - beforeTab)).toBeLessThan(3);

  await page.goto(`${server.url}content?page=1&language=en`);
  const discoveryCards = page.locator('[aria-label="Discover content"] article');
  await discoveryCards.nth(12).locator('h3 a').scrollIntoViewIfNeeded();
  const discoveryTop = await scrollTop();
  await discoveryCards.nth(12).locator('h3 a').click();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect.poll(async () => Math.abs((await scrollTop()) - discoveryTop)).toBeLessThan(3);
  await page.goto(`${server.url}content`);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(discoveryCards.first().locator('h3')).toContainText('Guide 25:');
  await expect
    .poll(
      async () =>
        (await page.getByRole('region', { name: 'Content results', exact: true }).boundingBox())!.y,
    )
    .toBeLessThan(80);

  await page.goto(`${server.url}creators?q=Reader&language=en`);
  const directoryLinks = page.getByRole('link', { name: 'Explore creator', exact: true });
  await directoryLinks.nth(8).scrollIntoViewIfNeeded();
  const directoryTop = await scrollTop();
  await directoryLinks.nth(8).click();
  // An ordinary creator link must start a fresh visit rather than reuse a
  // previous position for that profile's URL.
  const profileCards = page.locator('[aria-label="Creator publications"] article');
  await page
    .getByRole('button', { name: 'Load more content', exact: true })
    .scrollIntoViewIfNeeded();
  await expect.poll(() => profileCards.count()).toBeGreaterThanOrEqual(12);
  await profileCards.nth(7).locator('h3 a').click();
  await page.getByRole('link', { name: profile.name, exact: true }).click();
  await expect.poll(scrollTop).toBe(0);
  await page.goBack();
  await page.goBack();
  await page.getByRole('link', { name: '← Back to results', exact: true }).click();
  await expect.poll(async () => Math.abs((await scrollTop()) - directoryTop)).toBeLessThan(3);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect
    .poll(async () => (await page.locator('[data-creator-results]').boundingBox())!.y)
    .toBeLessThan(80);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${server.url}content`);
  await expect(discoveryCards.first()).toBeVisible();
  const firstTitle = await discoveryCards.first().locator('h3').boundingBox();
  expect(firstTitle!.y + firstTitle!.height).toBeLessThan(700);
  await expect(discoveryCards.first().getByText(/Article · Historical · Pinned/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(output, 'discovery-mobile-light.png') });
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page).toHaveURL(/medium%3Aarticle/);
  await expect(page.getByRole('group', { name: 'Active filters', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filter content' });
  await expect(drawer).toBeVisible();
  await expect.poll(async () => Math.abs((await drawer.boundingBox())!.x)).toBeLessThan(1);
  await page.screenshot({ path: resolve(output, 'filters-mobile-light.png') });
  pendingDiscovery = new Promise<void>(resolve => {
    releaseDiscovery = resolve;
  });
  await drawer.getByRole('button', { name: 'French', exact: true }).click();
  await expect.poll(() => discoveryWaiting).toBe(true);
  await drawer.getByRole('button', { name: 'Show results', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('region', { name: 'Content results', exact: true })).toBeFocused();
  releaseDiscovery!();
  pendingDiscovery = undefined;
  await expect(page.getByRole('region', { name: 'Content results', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect
    .poll(
      async () =>
        (await page.getByRole('region', { name: 'Content results', exact: true }).boundingBox())!.y,
    )
    .toBeLessThan(90);
  await expect(
    page.getByRole('button', { name: 'Remove French filter', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filters/ })).toContainText('2');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remove French filter', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Remove French filter', exact: true }).click();
  await expect(page).not.toHaveURL(/language=/);
  await expect(page).toHaveURL(/medium%3Aarticle/);
  const filterButton = page.getByRole('button', { name: /^Filters/ });
  await filterButton.click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(filterButton).toBeFocused();
  await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
  await page.getByRole('button', { name: 'Watch', exact: true }).click();
  await expect(
    page.getByText('No publications match these filters.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
  await expect(discoveryCards.first()).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('vite-ui-theme', 'dark');
    location.reload();
  });
  await expect(discoveryCards.first()).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: resolve(output, 'discovery-mobile-dark.png') });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  failDiscovery = true;
  await page.getByRole('textbox', { name: 'Search content', exact: true }).fill('unavailable');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Fixture unavailable' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Reader checks passed: long-list returns, retained pages, mobile first viewport, filters, keyboard, themes, empty and error states.',
  );
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  throw error;
} finally {
  releaseProfile?.();
  releaseDiscovery?.();
  await browser.close();
  server.stop(true);
}
