// CREATOR_STUDIO_SCROLL_TEST=1 bun frontend/tests/creator-studio-scroll.browser.ts
// Real studio layout with an in-memory draft; no accounts or articles are written.
import { chromium, expect as baseExpect } from 'playwright/test';
import { creationDocumentSchema, type Creation } from '../../shared/creators/contracts.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.CREATOR_STUDIO_SCROLL_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this check against a local worktree frontend.');
const expect = baseExpect.configure({ timeout: 15_000 });
const id = '11111111-1111-4111-8111-111111111111';
const fixture: Creation = {
  id,
  creatorId: null,
  ownershipRevision: 1,
  author: null,
  authorId: 'scroll-fixture',
  revision: 1,
  sourceVerified: false,
  publishedAt: null,
  updatedAt: '2026-01-01T00:00:00Z',
  creator: null,
  document: creationDocumentSchema.parse({
    title: 'Long tournament report',
    medium: 'article',
    tags: [],
    references: [],
    chapters: [],
    body: {
      version: 1,
      blocks: Array.from({ length: 30 }, (_, index) => ({
        id: `paragraph-${index}`,
        type: 'paragraph',
        props: {},
        children: [],
        content: [
          {
            type: 'text',
            text: `Round ${index + 1}: Notes about the game and preparation for the next round.`,
            styles: {},
          },
        ],
      })),
    },
  }),
};
const browser = await chromium.launch();
const errors: string[] = [];
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('vite-ui-theme', value), theme);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/get-session')
        return route.fulfill({
          json: {
            user: {
              id: 'scroll-fixture',
              name: 'Scroll fixture',
              displayName: 'Scroll fixture',
              email: 'scroll@example.invalid',
              role: 'user',
              currency: 'USD',
              createdAt: fixture.updatedAt,
              updatedAt: fixture.updatedAt,
            },
            session: {
              id: 'scroll-fixture',
              userId: 'scroll-fixture',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          },
        });
      if (path === '/api/creator-hub/mine') return route.fulfill({ json: { data: [] } });
      if (path === '/api/creator-hub/personal/counts')
        return route.fulfill({ json: { data: { total: 1, drafts: 1, published: 0 } } });
      if (path === '/api/creator-hub/personal/articles')
        return route.fulfill({ json: { data: { items: [], hasMore: false } } });
      if (path === `/api/creator-hub/creations/${id}/draft`)
        return route.fulfill({ json: { data: fixture } });
      if (path.startsWith('/api/creator-hub/creations') && route.request().method() !== 'GET')
        return route.abort();
      return route.continue();
    });
    await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
      page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
    );
    await page.goto(`${origin}/creator-studio?creationId=${id}`);
    await expect(page.getByRole('article', { name: 'Article editor' })).toBeVisible();
    const search = page.getByRole('combobox', { name: 'Find a card to connect' });
    await expect(search).toBeAttached();
    const assertSinglePageScroll = async () => {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
      ).toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
      await expect
        .poll(() => page.locator('main').evaluate(el => el.scrollHeight - el.clientHeight))
        .toBeGreaterThan(100);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    };
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('main').evaluate(el => {
        el.scrollTop = 0;
      });
      await assertSinglePageScroll();
      await page.mouse.move(width - 50, 700);
      await page.mouse.wheel(0, 600);
      await expect
        .poll(() => page.locator('main').evaluate(el => el.scrollTop))
        .toBeGreaterThan(100);
      await assertSinglePageScroll();
      await search.fill('Battlefield Marine');
      await expect(
        page.getByRole('option').filter({ hasText: 'Battlefield Marine' }).first(),
      ).toBeVisible();
      await assertSinglePageScroll();
      await search.press('Escape');
      await expect(page.locator('[cmdk-item]')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Export creation', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('button', { name: 'Export creation', exact: true }),
      ).toBeInViewport();
      await assertSinglePageScroll();
      await page.getByRole('button', { name: 'Preview', exact: true }).click();
      await expect(page.getByRole('article', { name: 'Article preview' })).toBeVisible();
      await assertSinglePageScroll();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(search).toBeAttached();
      await assertSinglePageScroll();
    }
    await page.close();
  }
  expect(errors).toEqual([]);
  console.log(
    'Studio uses one page scroll on desktop/mobile in both themes; card search, keyboard dismissal, footer, and preview remain usable.',
  );
} finally {
  await browser.close();
}
