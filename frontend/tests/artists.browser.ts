// Opt-in browser/API acceptance test against a running isolated worktree.
// ARTIST_SHOWCASE_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artists.browser.ts
// Temporary public profile fixtures are removed in finally.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import cards from '../../server/db/json/card-list.json';
import { getArtistPrintings } from '../../shared/lib/artists.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';
import {
  getArtistArtworkKey,
  getArtistSetName,
} from '../src/components/app/artists/artistGallery.ts';

const expect = baseExpect.configure({ timeout: 25_000 });
const database = new URL(process.env.DATABASE_URL!);
if (
  process.env.ARTIST_SHOWCASE_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw Error('Expected isolated worktree database');
const origin = process.env.BETTER_AUTH_URL!;
const backend = origin;
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw Error('Expected development origin');
const sql = postgres(database.toString());
const key = `artist-smoke-${randomUUID()}`;
const aliasKey = `${key}-alias`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const directory = page.getByRole('region', { name: 'Artist directory', exact: true });
const errors: string[] = [];
page.on('pageerror', error => {
  if (!errors.length) console.error(`First browser error at ${page.url()}:\n${error.stack}`);
  errors.push(error.message);
});
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
let fixtureId: string | undefined;
try {
  let response = await fetch(`${backend}/api/artists/david%20buisan`);
  expect(response.status).toBe(200);
  expect((await response.json()).data.key).toBe('david buisan');
  expect((await fetch(`${backend}/api/artists/${key}`)).status).toBe(404);
  expect((await fetch(`${backend}/api/artists/%20`)).status).toBe(400);
  const [profile] =
    await sql`insert into artist (key, name, biography) values (${key}, 'Artist test fixture', 'Test biography') returning id`;
  fixtureId = profile.id;
  await sql`insert into artist_link (artist_id, label, url, position) values (${fixtureId}, 'Second', 'https://example.com/second', 2), (${fixtureId}, 'First', 'https://example.com/first', 1), (${fixtureId}, 'Unsafe', 'javascript:alert(1)', 0)`;
  response = await fetch(`${backend}/api/artists/${key}`);
  const stored = (await response.json()).data;
  expect(stored.biography).toBe('Test biography');
  expect(stored.links.map((link: { label: string }) => link.label)).toEqual(['First', 'Second']);
  const names = (await (await fetch(`${backend}/api/artists`)).json()).data;
  expect(names.find((entry: { key: string }) => entry.key === key)).toEqual({
    key,
    name: 'Artist test fixture',
    creditKeys: [key],
  });
  const [aliasProfile] =
    await sql`insert into artist (key, name, biography) values (${aliasKey}, 'Alias fixture', 'Alias biography') returning id`;
  await sql`insert into artist_link (artist_id, label, url, position) values (${aliasProfile.id}, 'Duplicate', 'https://example.com/first', 0), (${aliasProfile.id}, 'Alias portfolio', 'https://example.com/alias', 1)`;
  await sql`insert into artist_alias (key, canonical_key) values (${aliasKey}, ${key})`;
  const resolvedAlias = (await (await fetch(`${backend}/api/artists/${aliasKey}`)).json()).data;
  expect(resolvedAlias.key).toBe(key);
  expect(resolvedAlias.creditKeys).toEqual([key, aliasKey]);
  expect(resolvedAlias.biography).toBe('Test biography');
  expect(resolvedAlias.links.map((link: { label: string }) => link.label)).toEqual([
    'First',
    'Second',
    'Alias portfolio',
  ]);
  expect(
    (
      await (
        await fetch(`${backend}/api/artists/${encodeURIComponent(`  ${aliasKey.toUpperCase()}  `)}`)
      ).json()
    ).data,
  ).toEqual(resolvedAlias);
  console.log('API: catalog fallback, 404, validation, biography, ordered safe links passed.');

  const cardId = 'admiral-ackbar--brilliant-strategist';
  const variant = Object.values(cards[cardId].variants).find(v => v.artist === 'David Buisan')!;
  const searchPath = `/cards/search?${new URLSearchParams({ artist: 'David Buisan', name: 'Admiral Ackbar' })}`;
  await page.goto(origin + searchPath);
  const art = page.locator(`img[alt="card-${cardId}"]`).first();
  await expect(art).toHaveAttribute(
    'src',
    new RegExp(variant.image.front.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  await art.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'David Buisan', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('modalCardVariantId')).toBe(variant.variantId);
  await page.getByRole('dialog').getByRole('link', { name: 'David Buisan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Find the artist' })).toBeVisible();
  await expect(page.getByText('A biography has not been added yet.', { exact: false })).toHaveCount(
    0,
  );
  await page.screenshot({ path: '.swubase/artist-showcase-desktop.png', fullPage: true });
  const ackbar = page
    .locator('article')
    .filter({ has: page.locator(`img[alt="card-${cardId}"]`) })
    .getByRole('link');
  await ackbar.click();
  await expect(page.getByRole('link', { name: 'David Buisan', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('cardVariantId')).toBe(variant.variantId);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await page.goto(origin + searchPath + '&resultsLayout=tableImage');
  await expect(page.locator('table').locator(`img[alt="card-${cardId}"]`)).toHaveAttribute(
    'src',
    new RegExp(variant.image.front.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  await expect(page.locator('table').getByText('#39', { exact: true })).toBeVisible();
  await page
    .locator('table')
    .getByText('Admiral Ackbar, Brilliant Strategist', { exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get('modalCardVariantId')).toBe(variant.variantId);
  console.log(
    'Browser: grid/table artwork, printing metadata, dialog selection, artist navigation, gallery links, back and refresh passed.',
  );

  await page.goto(origin + '/artists');
  await expect(directory.getByRole('link', { name: /Elena Skitales/ })).toHaveCount(0);
  await page.getByLabel('Find an artist').fill('Luke Harrington');
  await directory.getByRole('link', { name: /Luke Harrington/ }).click();
  await expect(page.getByRole('heading', { name: 'Luke Harrington', exact: true })).toBeVisible();
  await page.goto(origin + '/artists/david%20buisan');
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show more artwork' })).toBeVisible();
  const count = await page.locator('section a').count();
  await page.getByRole('button', { name: 'Show more artwork' }).click();
  await expect.poll(() => page.locator('section a').count()).toBeGreaterThan(count);
  for (const printing of await page.locator('article > div > p:first-of-type').allTextContents()) {
    expect(printing).not.toMatch(/foil|hyperspace|serialized/i);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/artists/david%20buisan');
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await page.screenshot({ path: '.swubase/artist-showcase-mobile-dark.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto(origin + `/artists/${key}`);
  await expect(page.getByText('Test biography')).toBeVisible();
  await expect(page.getByRole('link', { name: /First/ })).toHaveAttribute(
    'href',
    'https://example.com/first',
  );
  await expect(page.getByText('No credited cards are currently available.')).toBeVisible();
  await page.goto(origin + '/artists');
  await page.getByLabel('Find an artist').fill('Sandra Chlewi?ska');
  const expectedName = (await (await fetch(`${backend}/api/artists/sandra%20chlewi%3Fska`)).json())
    .data.name;
  await expect(directory.getByRole('link', { name: new RegExp(expectedName) })).toBeVisible();
  const specialResponse = page.waitForResponse(response =>
    response.url().includes('/api/artists/'),
  );
  await directory.getByRole('link', { name: /Sandra/ }).click();
  const specialProfile = await specialResponse;
  expect(specialProfile.status()).toBe(200);
  const specialName = (await specialProfile.json()).data.name;
  await expect(page.getByRole('heading', { name: specialName, exact: true })).toBeVisible();
  await expect(page.getByText('Original card credits')).toBeVisible();
  await page.goto(origin + '/artists/sandra%20chlewi%253Fska?artistSearch=Luke');
  await expect(page).toHaveURL(/sandra%20chlewi%C5%84ska/);
  await expect(page.getByLabel('Search artwork')).toHaveValue('Luke');
  expect(errors).toEqual([]);
  const sandraResponse = await fetch(`${backend}/api/artists/sandra%20chlewi%3Fska`);
  const sandra = (await sandraResponse.json()).data;
  expect(sandra.key).toBe('sandra chlewińska');
  expect(sandra.creditKeys).toHaveLength(5);
  const sandraPrintings = getArtistPrintings(cards as unknown as CardList, sandra.key, {
    creditKeys: sandra.creditKeys,
  });
  await expect(
    page.getByText(
      `${new Set(sandraPrintings.map(({ card }) => card.cardId)).size} cards · ${sandraPrintings.length} printings`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto(origin + '/artists');
  await page.getByLabel('Find an artist').fill('Sandra');
  await expect(directory.getByRole('link', { name: /Sandra Chlewińska/ })).toHaveCount(1);
  await directory.getByRole('link', { name: /Sandra Chlewińska/ }).scrollIntoViewIfNeeded();
  await expect(
    directory.getByRole('link', { name: /Sandra Chlewińska/ }).locator('svg image'),
  ).toHaveCount(3);
  for (const preview of await directory
    .getByRole('link', { name: /Sandra Chlewińska/ })
    .locator('svg image')
    .all()) {
    await expect(preview).toHaveAttribute('href', /^https:\/\/images.swubase.com\/cards\//);
  }

  // Closing the viewer must consume its history entry, including after refresh.
  await page.getByLabel('Find an artist').fill('David Buisan');
  await directory.getByRole('link', { name: /David Buisan/ }).click();
  await page
    .getByRole('button', { name: /^Enlarge / })
    .first()
    .click();
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/artists(?:\?|$)/);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('artistArtwork')).toBe(false);
  await page.goBack();
  await expect(page).toHaveURL(/\/artists(?:\?|$)/);

  // An artwork can open from cached catalog data before an alias profile resolves.
  let releaseAlias!: () => void;
  const aliasReady = new Promise<void>(resolve => {
    releaseAlias = resolve;
  });
  await page.route('**/api/artists/sandra%20chlewi%3Fska', async route => {
    await aliasReady;
    await route.continue();
  });
  await page.goto(origin + '/artists/sandra%20chlewi%253Fska');
  await page
    .getByRole('button', { name: /^Enlarge / })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  releaseAlias();
  await expect(page).toHaveURL(/sandra%20chlewi%C5%84ska/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(origin + '/artists/sandra%20chlewi%C5%84ska');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/artists(?:\?|$)/);
  await page.unroute('**/api/artists/sandra%20chlewi%3Fska');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + '/artists/david%20buisan');
  await page.getByLabel('Search artwork').fill('Admiral Ackbar');
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Set', exact: true }).click();
  await page.getByRole('option', { name: getArtistSetName(variant.set), exact: true }).click();
  await page.getByRole('combobox', { name: 'Treatment', exact: true }).click();
  await page.getByRole('option', { name: variant.variantName, exact: true }).click();
  expect(new URL(page.url()).searchParams.get('artistSet')).toBe(variant.set);
  expect(new URL(page.url()).searchParams.get('artistTreatment')).toBe(variant.variantName);
  await page.reload();
  await expect(page.getByLabel('Search artwork')).toHaveValue('Admiral Ackbar');
  await expect(page.locator('article')).toHaveCount(1);
  const enlarge = page.getByRole('button', { name: /^Enlarge Admiral Ackbar/ });
  await enlarge.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous artwork' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  expect(new URL(page.url()).searchParams.get('artistArtwork')).toBe(
    `${cardId}:${variant.variantId}`,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(enlarge).toBeFocused();
  await enlarge.click();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('artistSearch')).toBe(false);
  await page
    .getByRole('button', { name: /^Enlarge / })
    .first()
    .click();
  const firstArtwork = new URL(page.url()).searchParams.get('artistArtwork');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('artistArtwork'))
    .not.toBe(firstArtwork);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => new URL(page.url()).searchParams.get('artistArtwork')).toBe(firstArtwork);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'View card details' }).click();
  await expect(page).toHaveURL(/cards\/detail/);
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.swubase/artist-viewer-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.goto(origin + '/artists/david%20buisan?artistSet=not-a-real-set');
  await expect(page.getByText('No artwork matches these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all artwork', exact: true }).click();
  await expect(page.locator('article').first()).toBeVisible();
  const david = (await (await fetch(`${backend}/api/artists/david%20buisan`)).json()).data;
  const davidPrintings = getArtistPrintings(cards as unknown as CardList, david.key, {
    creditKeys: david.creditKeys,
  });
  const lateArtwork = getArtistArtworkKey(davidPrintings[65]);
  await page.goto(
    origin + '/artists/david%20buisan?' + new URLSearchParams({ artistArtwork: lateArtwork }),
  );
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText(
    `66 of ${davidPrintings.length}`,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Card artwork' })).toBeFocused();
  const withBack = davidPrintings.find(printing => !!printing.variant.image.back)!;
  expect(withBack).toBeTruthy();
  await page.goto(
    origin +
      '/artists/david%20buisan?' +
      new URLSearchParams({ artistArtwork: getArtistArtworkKey(withBack) }),
  );
  await page.getByRole('button', { name: 'Show back', exact: true }).click();
  expect(await page.getByRole('dialog').locator('img').getAttribute('src')).toContain(
    withBack.variant.image.back,
  );
  await page.keyboard.press('Tab');
  expect(
    await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('Escape');
  console.log(
    'Browser: combined aliases, legacy redirects, thumbnail directory, URL filters, refresh/back, enlarged artwork, keyboard navigation, focus restoration and mobile viewer passed.',
  );
  let releaseIdentities!: () => void;
  const identitiesReady = new Promise<void>(resolve => {
    releaseIdentities = resolve;
  });
  await page.route('**/api/artists', async route => {
    await identitiesReady;
    await route.continue();
  });
  await page.goto(origin + '/artists');
  await expect(page.getByRole('status').filter({ hasText: 'Loading artists...' })).toBeVisible();
  await expect(directory.getByRole('link', { name: /Sandra/ })).toHaveCount(0);
  releaseIdentities();
  await expect(directory.getByRole('link', { name: /Sandra Chlewińska/ })).toHaveCount(1);
  await page.unroute('**/api/artists');
  let identityFailure = true;
  await page.route('**/api/artists', route =>
    identityFailure
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary outage' }),
        })
      : route.continue(),
  );
  await page.goto(origin + '/artists');
  await expect(
    page.getByText('Artist profiles are temporarily unavailable. Showing original card credits.'),
  ).toBeVisible();
  await expect(directory.getByRole('link', { name: /Sandra/ })).toHaveCount(5);
  identityFailure = false;
  await page.getByRole('button', { name: 'Retry artist profiles' }).click();
  await expect(directory.getByRole('link', { name: /Sandra Chlewińska/ })).toHaveCount(1);
  await expect(
    page.getByText('Artist profiles are temporarily unavailable. Showing original card credits.'),
  ).toHaveCount(0);
  await page.unroute('**/api/artists');
  console.log('Browser: directory loading, identity failure fallback and retry passed.');
  await page.route('**/api/artists/david*', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary outage' }),
    }),
  );
  await page.goto(origin + '/artists/david%20buisan');
  await expect(
    page.getByText('Artist biography and links are temporarily unavailable.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'David Buisan', exact: true })).toBeVisible();
  await expect(page.locator(`section img[alt="card-${cardId}"]`)).toBeVisible();
  await page.goto(origin + '/artists/no-such-artist-fixture');
  await expect(page.getByRole('heading', { name: 'Artist not found' })).toBeVisible();
  await page.goto(origin + '/artists/100%25');
  await expect(page.getByRole('heading', { name: 'Artist not found' })).toBeVisible();
  await page.route('**/api/artists/failing-artist', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary outage' }),
    }),
  );
  await page.goto(origin + '/artists/failing-artist');
  await expect(page.getByRole('heading', { name: 'Unable to load artist' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  console.log(
    'Browser: artist directory, pagination, mobile/dark, profile metadata, empty gallery, encoded artist names, cached gallery on profile errors, not-found and API error states passed.',
  );
  expect(errors).toEqual([]);
} finally {
  await sql`delete from artist where key = ${aliasKey}`;
  if (fixtureId) {
    await sql`delete from artist where id = ${fixtureId}`;
    expect((await sql`select id from artist_link where artist_id = ${fixtureId}`).length).toBe(0);
  }
  await sql.end();
  await browser.close();
}
