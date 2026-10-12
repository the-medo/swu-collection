// Build first. Serves the application with isolated API and image fixtures; no database writes.
import { chromium, expect as baseExpect } from 'playwright/test';
import { resolve } from 'node:path';
import { homepageHeaderLayers } from '../src/components/app/home/header/homepageHeaderArtwork.ts';
import { headerArtworks } from '../src/components/app/home/header/headerArtworks.ts';
import credits from '../src/components/app/home/header/headerArtworkCredits.json';

if (process.env.HOMEPAGE_HEADER_BROWSER_TEST !== '1')
  throw new Error('Enable HOMEPAGE_HEADER_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/auth/get-session') return Response.json(null);
    if (pathname === '/api/application-configuration')
      return Response.json({ homepageMode: 'live' });
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/tournament-weekends/live') return Response.json({ data: null });
    if (pathname === '/api/card-pools/daily')
      return Response.json({
        data: {
          date: '2026-10-11',
          today: '2026-10-11',
          nextRefreshAt: '2026-10-12T00:00:00.000Z',
          availableDates: [],
          pool: null,
        },
      });
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: false },
        preview: { needsUpdate: false },
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
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
let failImages = false;
const imageRequests = new Set<string>();
await context.route('https://images.swubase.com/**', route => {
  imageRequests.add(route.request().url());
  if (failImages) return route.abort();
  return route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#28474e"/></svg>',
  });
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const expect = baseExpect.configure({ timeout: 15000 });
const stage = page.locator('.homepage-header-stage');
try {
  await page.goto(`${server.url}?homeMode=live`);
  await expect(page.getByRole('heading', { name: 'SWUBASE', exact: true })).toBeVisible();
  await expect(page.getByText('A galaxy of possibilities')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Header variants' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Next|Previous) header$/ })).toHaveCount(0);
  await expect(page.locator('.homepage-header-caption')).toHaveCount(0);
  await expect(stage.locator('.homepage-header-layer img')).toHaveCount(2);
  await expect.poll(() => imageRequests.size).toBe(2);
  const creditTrigger = page.getByRole('button', { name: 'Illus. — header illustration credits' });
  await creditTrigger.focus();
  await creditTrigger.press('Enter');
  const creditPopover = page.getByRole('dialog', { name: 'Header illustrations' });
  await expect(creditPopover).toContainText('Reno');
  await expect(creditPopover).toContainText('Adrien Girod');
  await expect(creditPopover.getByRole('listitem')).toHaveCount(2);
  await expect(creditPopover).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await expect(creditTrigger).toBeFocused();

  // The permanent composition and its credits fit mobile, tablet and desktop.
  for (const width of [1500, 1100, 1000, 900, 768, 640, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    // Let the mobile sidebar and container queries settle before comparing bounds.
    await page.evaluate(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    const artBox = (await stage.boundingBox())!;
    // Homepage variants must not add mobile breakpoints to the shared .container utility.
    if (width < 640) await expect(page.locator('footer .container')).toHaveCSS('max-width', 'none');
    const menuBarBox = (await page.locator('.homepage-menu-bar').boundingBox())!;
    const menu = page.locator('.homepage-menu');
    const menuBox = (await menu.boundingBox())!;
    expect(Math.abs(menuBarBox.x - artBox.x)).toBeLessThan(1);
    expect(Math.abs(menuBarBox.x + menuBarBox.width - artBox.x - artBox.width)).toBeLessThan(1);
    expect(menuBarBox.y).toBeGreaterThan(artBox.y + artBox.height);
    expect(menuBarBox.y - artBox.y - artBox.height).toBeLessThanOrEqual(20);
    const social = page.locator('.homepage-menu-social');
    await expect(social.getByRole('link', { name: 'Discord' })).toBeVisible();
    await expect(social.getByRole('link', { name: 'Support' })).toBeVisible();
    const socialBox = (await social.boundingBox())!;
    for (const box of [menuBox, socialBox]) {
      expect(box.x).toBeGreaterThan(menuBarBox.x);
      expect(box.x + box.width).toBeLessThan(menuBarBox.x + menuBarBox.width);
      expect(box.y).toBeGreaterThan(menuBarBox.y);
      expect(box.y + box.height).toBeLessThan(menuBarBox.y + menuBarBox.height);
    }
    if (menuBarBox.width > 520) {
      expect(socialBox.x).toBeGreaterThan(menuBox.x + menuBox.width);
      expect(
        Math.abs(socialBox.y + socialBox.height / 2 - menuBox.y - menuBox.height / 2),
      ).toBeLessThan(1);
    } else {
      expect(socialBox.y).toBeGreaterThan(menuBox.y + menuBox.height);
    }
    for (const mode of await menu.getByRole('radio').all()) {
      const labelFits = await mode.locator('.homepage-mode-label').evaluate(el => {
        const bounds = el.getBoundingClientRect();
        const button = el.closest('button')!.getBoundingClientRect();
        return bounds.x >= button.x && bounds.right <= button.right;
      });
      expect(labelFits).toBe(true);
    }
    expect(artBox.height).toBeLessThanOrEqual(201);
    if (width <= 640) expect(artBox.height).toBe(120);
    const copy = (await page.locator('.homepage-header-copy').boundingBox())!;
    expect(copy.x).toBeGreaterThanOrEqual(artBox.x);
    expect(copy.x + copy.width).toBeLessThanOrEqual(artBox.x + artBox.width);
    expect(copy.y).toBeGreaterThanOrEqual(artBox.y);
    expect(copy.y + copy.height).toBeLessThanOrEqual(artBox.y + artBox.height);
    const palace = (await stage
      .locator(`[data-gallery-id="${headerArtworks.theed.galleryId}"]`)
      .boundingBox())!;
    const shield = (await stage
      .locator(`[data-gallery-id="${headerArtworks.shield.galleryId}"]`)
      .boundingBox())!;
    expect(palace.x + palace.width / 2).toBeLessThan(artBox.x + artBox.width / 2);
    expect(shield.x + shield.width / 2).toBeGreaterThan(artBox.x + artBox.width / 2);
    await creditTrigger.click();
    await expect(creditPopover.getByRole('listitem')).toHaveCount(2);
    for (const layer of homepageHeaderLayers)
      await expect(creditPopover).toContainText(credits[layer.image].artist);
    const creditBox = (await creditPopover.boundingBox())!;
    expect(creditBox.x).toBeGreaterThanOrEqual(0);
    expect(creditBox.x + creditBox.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(creditPopover).toBeHidden();
    const images = await stage.locator('.homepage-header-layer img').evaluateAll(async elements => {
      await Promise.all(elements.map(image => (image as HTMLImageElement).decode()));
      return elements.map(image => ({
        src: (image as HTMLImageElement).currentSrc,
        width: image.clientWidth,
        height: image.clientHeight,
      }));
    });
    // Thumbnails must cover the actual crop without excessive upscaling.
    for (const [imageIndex, image] of images.entries()) {
      if (!image.src.endsWith('-thumb.webp')) continue;
      const art = headerArtworks[homepageHeaderLayers[imageIndex]!.image];
      const requiredWidth = Math.max(image.width, (image.height * art.width) / art.height);
      const thumbnailWidth = (400 * art.width) / Math.max(art.width, art.height);
      expect(requiredWidth).toBeLessThanOrEqual(thumbnailWidth * 1.1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(creditTrigger).toBeVisible();
  await expect(page.locator('.homepage-header-art')).toHaveCSS('animation-name', 'none');
  await page.getByRole('radio', { name: /Today/ }).click();
  await expect(stage.locator('.homepage-header-layer img')).toHaveCount(2);
  await page.getByRole('radio', { name: /Live Weekend/ }).click();
  await expect(stage.locator('.homepage-header-layer img')).toHaveCount(2);

  failImages = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'SWUBASE', exact: true })).toBeVisible();
  for (const img of await stage.locator('.homepage-header-layer img').all())
    await expect(img).toHaveCSS('visibility', 'hidden');
  await creditTrigger.click();
  await expect(creditPopover).toContainText('Reno');
  await expect(creditPopover).toContainText('Adrien Girod');
  expect(errors).toEqual([]);
  console.log(
    'Header checks passed: fixed artwork, keyboard credits, responsive menu and social links, modes, reduced motion, dark theme, and failed images.',
  );
} finally {
  await browser.close();
  server.stop(true);
}
