// CARD_HOME_ARTWORK_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-home-artwork.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { cardList } from '../../server/db/lists.ts';
import { getCardHomeSets } from '../src/components/app/cards/CardHome/cardHomeLib.ts';
import { setInfo } from '../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../types/enums.ts';

const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_HOME_ARTWORK_BROWSER_TEST !== '1' ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Use a running development worktree.');
const expect = baseExpect.configure({ timeout: 20_000 });
const sets = getCardHomeSets(cardList);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
const priceRequests: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const tile = (code: SwuSet) =>
  page.locator('article').filter({
    has: page.getByRole('heading', { name: setInfo[code].name, exact: true }),
  });
const art = (code: SwuSet) => tile(code).locator('img[src*="/cards/"]');
const expectFixedArtwork = async () => {
  for (const set of sets) {
    await expect(art(set.code)).toHaveCount(3);
    await expect
      .poll(() => art(set.code).evaluateAll(images => images.map(img => img.getAttribute('src'))))
      .toEqual(set.featured.map(p => `https://images.swubase.com/cards/${p.variant.image.front}`));
  }
};
const screenshots = '.swubase/card-home-artwork-screenshots';
await mkdir(screenshots, { recursive: true });
try {
  await page.route(`${origin}/api/card-prices/**`, route => {
    priceRequests.push(route.request().url());
    return route.fulfill({ status: 503, json: { message: 'Artwork must not load prices' } });
  });
  await page.goto(`${origin}/cards/search`);
  await expect(page.getByRole('heading', { name: 'Search for cards', exact: true })).toBeVisible();
  await expectFixedArtwork();
  // Fixed artwork must not register prices for the global background fetcher either.
  await page.clock.install();
  await page.clock.fastForward(10_000);
  const queuedPrices = await page.evaluate(async modulePath => {
    const { db } = await import(modulePath);
    return db.cardVariantPriceFetchList.count();
  }, '/src/dexie/db.ts');
  expect(queuedPrices).toBe(0);
  expect(priceRequests).toEqual([]);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, theme);
      for (const code of [SwuSet.TS26, SwuSet.IBH]) {
        await tile(code).scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            art(code).evaluateAll(images =>
              images.every(img => (img as HTMLImageElement).naturalWidth > 0),
            ),
          )
          .toBe(true);
        await tile(code).screenshot({
          path: `${screenshots}/${code}-${viewport.width}-${theme}.png`,
        });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.reload();
  await expectFixedArtwork();
  await page.clock.fastForward(10_000);
  expect(priceRequests).toEqual([]);
  expect(errors).toEqual([]);
  console.log(
    'Passed: fixed artwork for every set, no price requests or fetch-queue entries, stable reload, desktop/mobile light/dark layout.',
  );
} finally {
  await browser.close();
}
