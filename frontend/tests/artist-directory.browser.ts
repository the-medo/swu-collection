// Read-only acceptance checks against the running worktree with researched profiles imported.
// ARTIST_SHOWCASE_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artist-directory.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';

const expect = baseExpect.configure({ timeout: 25_000 });
const origin = process.env.BETTER_AUTH_URL!;
const hostname = new URL(origin).hostname;
if (
  process.env.ARTIST_SHOWCASE_TEST !== '1' ||
  !(['127.0.0.1', 'localhost'].includes(hostname) || hostname.endsWith('.ts.net'))
) {
  throw new Error('Expected isolated development origin and ARTIST_SHOWCASE_TEST=1');
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
const directory = page.getByRole('region', { name: 'Artist directory', exact: true });
const hero = page.getByRole('region', { name: 'Explore the artists', exact: true });
async function sortBy(label: string) {
  await page.getByRole('combobox', { name: 'Sort artists' }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}
try {
  for (const [alias, canonical] of [
    ['benjamin paulus', 'benjamin paulus van onzen'],
    ['paulus van onzen', 'benjamin paulus van onzen'],
    ['amélie hutt', 'axel hutt'],
  ]) {
    const response = await fetch(`${origin}/api/artists/${encodeURIComponent(alias)}`);
    expect(response.status).toBe(200);
    const profile = (await response.json()).data;
    expect(profile.key).toBe(canonical);
    expect(profile.creditKeys).toContain(alias);
  }
  await page.goto(origin + '/artists', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'The art of Star Wars: Unlimited', exact: true }),
  ).toBeVisible();
  await expect(hero.getByRole('link')).toHaveCount(10);
  const heroLinks = await hero
    .getByRole('link')
    .evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(new Set(heroLinks).size).toBe(10);
  const firstHero = hero.getByRole('link').first();
  const heroName = (await firstHero.getAttribute('aria-label'))!.replace('Explore artwork by ', '');
  await firstHero.hover();
  await expect(firstHero.locator(':scope > div.absolute')).toHaveCSS('opacity', '1');
  await firstHero.focus();
  await page.keyboard.press('Tab');
  await expect(hero.getByRole('link').nth(1)).toBeFocused();
  await expect(hero.getByRole('link').nth(1).locator(':scope > div.absolute')).toHaveCSS(
    'opacity',
    '1',
  );
  await firstHero.click();
  await expect(page.getByRole('heading', { name: heroName, exact: true })).toBeVisible();
  await page.goBack();
  await expect(directory).toBeVisible();

  const originalNames = await directory.getByRole('heading').allTextContents();
  await sortBy('Name Z–A');
  expect(await directory.getByRole('heading').allTextContents()).toEqual(
    [...originalNames].reverse(),
  );
  for (const [label, value, position] of [
    ['Most cards', 'cards', 0],
    ['Most printings', 'printings', 1],
  ] as const) {
    await sortBy(label);
    expect(new URL(page.url()).searchParams.get('artistSort')).toBe(value);
    const counts = await directory.locator('a > div > p:first-of-type').allTextContents();
    const values = counts.map(text => Number(text.match(/\d+/g)![position]));
    expect(values.length).toBeGreaterThan(100);
    expect(values.every((value, index) => index === 0 || values[index - 1] >= value)).toBe(true);
  }
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Sort artists' })).toHaveText('Most cards');
  await page.getByLabel('Find an artist').fill('Benjamin');
  await expect(directory.getByRole('link')).toHaveCount(1);
  await expect(directory.getByRole('heading')).toHaveText('Benjamin Paulus van Onzen');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Find an artist')).toHaveValue('Benjamin');
  await expect(page.getByRole('combobox', { name: 'Sort artists' })).toHaveText('Most cards');
  await expect(directory.getByRole('link')).toHaveCount(1);
  expect(
    await hero.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))),
  ).toEqual(heroLinks);
  await page.getByLabel('Find an artist').fill('Amélie');
  await expect(directory.getByRole('link')).toHaveCount(1);
  await expect(directory.getByRole('heading')).toHaveText('Axel Hutt');
  await directory.getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Axel Hutt', exact: true })).toBeVisible();
  await page.goto(origin + '/artists/benjamin%20paulus?artistSearch=Luke');
  await expect(page).toHaveURL(/artists\/benjamin%20paulus%20van%20onzen/);
  await expect(page.getByLabel('Search artwork')).toHaveValue('Luke');
  await page.goto(origin + '/artists/am%C3%A9lie%20hutt?artistSearch=Saw');
  await expect(page.getByRole('heading', { name: 'Axel Hutt', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/artists\/axel%20hutt/);
  await expect(page.getByLabel('Search artwork')).toHaveValue('Saw');
  const profileHeader = page.locator('header').filter({
    has: page.getByRole('heading', { name: 'Axel Hutt', exact: true }),
  });
  await expect(profileHeader.getByRole('link', { name: 'All artists' })).toBeVisible();

  await page.goto(origin + '/artists?artistSort=invalid');
  await expect(page.getByRole('combobox', { name: 'Sort artists' })).toHaveText('Name A–Z');
  await sortBy('Most cards');
  await sortBy('Name A–Z');
  expect(new URL(page.url()).searchParams.has('artistSort')).toBe(false);
  await hero.getByRole('link').first().hover();
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll('section[aria-label="Explore the artists"] image')].map(
        element =>
          new Promise<void>(resolve => {
            const image = new Image();
            image.onload = image.onerror = () => resolve();
            image.src = element.getAttribute('href')!;
          }),
      ),
    );
  });
  await page.screenshot({ path: '.swubase/artist-directory-collage-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await hero.scrollIntoViewIfNeeded();
  for (const link of await hero.getByRole('link').all()) {
    await expect(link.locator(':scope > div.absolute')).toHaveCSS('opacity', '1');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.swubase/artist-directory-collage-mobile.png' });
  await page.getByLabel('Find an artist').fill('no-such-artist-directory-fixture');
  await expect(page.getByText('No artists found.', { exact: true })).toBeVisible();
  await expect(hero.getByRole('link')).toHaveCount(10);
  await page.getByLabel('Find an artist').fill('a'.repeat(151));
  await expect(page.getByLabel('Find an artist')).toHaveValue('a'.repeat(150));
  expect(errors).toEqual([]);
  console.log(
    'Artist directory: confirmed aliases, canonical redirects, all sort modes, URL search, refresh/back, collage links, hover/focus names, mobile/dark, empty results and no browser errors passed.',
  );
} finally {
  await browser.close();
}
