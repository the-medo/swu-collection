// Opt-in acceptance check against a running isolated worktree; fixtures are removed in finally.
// CARD_GROUPS_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-groups.browser.ts
import {
  chromium,
  expect as baseExpect,
  type BrowserContext,
  type Locator,
  type Page,
} from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { cardList } from '../../server/db/lists.ts';
import { maxCardGroupPosition } from '../../types/CardGroup.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_GROUPS_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable this test only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const expect = baseExpect.configure({ timeout: 20000 });
async function checkBackSide(page: Page, entry: Locator, expectedImage: string) {
  const url = page.url();
  const cardArea = await entry.getByRole('button', { name: /^View / }).boundingBox();
  expect(cardArea).not.toBeNull();
  expect(cardArea!.width).toBeGreaterThan(cardArea!.height);
  const backButton = entry.getByRole('button', { name: /^Show back side of / });
  for (const activation of ['keyboard', 'pointer']) {
    if (activation === 'keyboard') {
      await backButton.focus();
      await backButton.press('Enter');
    } else {
      await backButton.click();
    }
    const preview = page.getByRole('dialog');
    await expect(preview).toBeVisible();
    await expect(preview.locator('img').first()).toHaveAttribute(
      'src',
      `https://images.swubase.com/cards/${expectedImage}`,
    );
    expect(page.url()).toBe(url);
    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);
    await expect(backButton).toBeFocused();
  }
}
async function setSessionCookie(context: BrowserContext, token: string) {
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
}
const sql = postgres(database.toString(), { max: 2 });
const userId = `card-groups-browser-${randomUUID()}`;
const otherUserId = `card-groups-other-${randomUUID()}`;
const title = `Card group fixture ${randomUUID()}`;
const token = randomUUID();
const feedIds = Array.from({ length: 8 }, () => randomUUID());
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const visitor = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const anonymous = await visitor.newPage();
const errors: string[] = [];
for (const p of [page, anonymous]) {
  p.setDefaultTimeout(20000);
  p.on('pageerror', error => errors.push(error.message));
  await p.addLocatorHandler(p.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    p.getByRole('button', { name: 'Dismiss', exact: true }).press('Enter'),
  );
}
const screenshots = '.swubase/card-groups-screenshots';
await mkdir(screenshots, { recursive: true });
let groupId: string | undefined;
const card =
  cardList['darth-vader--dark-lord-of-the-sith'] ??
  Object.values(cardList).find(c => c?.back && Object.keys(c.variants).length > 2)!;
const ids = Object.keys(card.variants).slice(0, 2);
try {
  expect((await anonymous.request.get(`${origin}/api/admin/card-groups`)).status()).toBe(401);
  expect((await anonymous.request.get(`${origin}/api/user-settings`)).status()).toBe(401);
  expect(
    (
      await anonymous.request.post(`${origin}/api/user-settings`, {
        data: { cardGalleryShowLabels: true, cardGalleryShowPrices: true },
      })
    ).status(),
  ).toBe(401);
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES (${userId},'Card group browser',${userId + '@invalid.local'},false,now(),now(),${userId},'USD','user')`;
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${randomUUID()},${token},now()+interval '1 hour',${userId},now(),now())`;
  await setSessionCookie(context, token);
  expect((await page.request.get(`${origin}/api/admin/card-groups`)).status()).toBe(403);
  await sql`UPDATE "user" SET role='admin' WHERE id=${userId}`;
  expect(
    (
      await page.request.post(`${origin}/api/admin/card-groups`, {
        data: {
          title,
          description: '',
          variantIds: ['missing-printing'],
          published: false,
          sortOrder: 0,
        },
      })
    ).status(),
  ).toBe(400);
  const existingGroups = (await (await page.request.get(`${origin}/api/admin/card-groups`)).json())
    .data as { sortOrder: number }[];
  const nextPosition =
    existingGroups.reduce((highest, group) => Math.max(highest, group.sortOrder), 0) + 100;
  const manualPosition = Math.max(nextPosition, 20_000);
  await page.goto(`${origin}/admin?page=card-groups`);
  const adminListRequest = (url: URL) => url.pathname === '/api/admin/card-groups';
  await page.route(adminListRequest, route => route.fulfill({ status: 200, json: { data: [] } }));
  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue('100');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.unroute(adminListRequest);
  await page.route(adminListRequest, route =>
    route.fulfill({
      status: 200,
      json: {
        data: [
          {
            id: randomUUID(),
            title: 'Position limit fixture',
            description: '',
            variantIds: ids,
            published: false,
            sortOrder: maxCardGroupPosition,
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue(
    String(maxCardGroupPosition + 100),
  );
  const positionLimitError = page.getByText(`Position must be ${maxCardGroupPosition} or less.`, {
    exact: true,
  });
  await expect(positionLimitError).toBeVisible();
  await page.getByLabel('Position', { exact: true }).fill('100');
  await expect(positionLimitError).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.unroute(adminListRequest);
  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue(String(nextPosition));
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Short description').fill('Exact versions, deliberately ordered.');
  await page.getByText('Add multiple variant IDs', { exact: true }).click();
  await page.getByLabel('Variant IDs, separated by commas or new lines').fill(ids.join('\n'));
  await page.getByRole('button', { name: 'Add versions', exact: true }).click();
  await page.getByRole('button', { name: 'Move version 2 up', exact: true }).click();
  await page.getByLabel('Position', { exact: true }).fill('-1');
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await page.getByLabel('Position', { exact: true }).fill(String(manualPosition));
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Card group saved.', { exact: true })).toBeVisible();
  const adminRows = (await (await page.request.get(`${origin}/api/admin/card-groups`)).json()).data;
  const saved = adminRows.find((group: { title: string }) => group.title === title);
  groupId = saved.id;
  expect(saved.sortOrder).toBe(manualPosition);
  expect(saved.variantIds).toEqual([...ids].reverse());
  expect((await anonymous.request.get(`${origin}/api/card-groups/${groupId}`)).status()).toBe(404);
  expect(
    (await (await anonymous.request.get(`${origin}/api/card-groups`)).json()).data.some(
      (group: { id: string }) => group.id === groupId,
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue(
    String(manualPosition + 100),
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const row = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue(String(manualPosition));
  await page.getByLabel('Position', { exact: true }).fill(String(manualPosition + 10));
  await page.getByRole('switch', { name: 'Publish on promo page' }).click();
  await page.screenshot({ path: `${screenshots}/admin-editor.png` });
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect(row.getByText('Published', { exact: true })).toBeVisible();
  await expect(
    row.getByText(`Position ${manualPosition + 10} · 2 versions`, { exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`${origin}/api/admin/card-groups`)).json()).data[0].sortOrder,
  ).toBe(manualPosition + 10);
  await anonymous.goto(`${origin}/cards/search`);
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  await anonymous
    .getByRole('link')
    .filter({
      has: anonymous.getByRole('heading', { name: 'Promo and special cards', exact: true }),
    })
    .click();
  await anonymous.getByRole('link', { name: title, exact: true }).click();
  await expect(anonymous.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const galleryEntries = anonymous
    .locator('article')
    .filter({ has: anonymous.getByRole('button', { name: /^View / }) });
  const images = galleryEntries.locator('img');
  const labelSwitch = anonymous.getByRole('switch', { name: 'Show card labels' });
  const priceSwitch = anonymous.getByRole('switch', { name: 'Show prices', exact: true });
  await expect(labelSwitch).not.toBeChecked();
  await expect(galleryEntries.locator('p')).toHaveCount(0);
  await expect(priceSwitch).not.toBeChecked();
  const priceGroups = galleryEntries.getByRole('group', { name: /^Prices for / });
  await expect(priceGroups).toHaveCount(0);
  const priceRequests: { variantIds: string[]; sourceType: string }[] = [];
  await anonymous.route('**/api/card-prices/bulk-load', route => {
    const request = route.request().postDataJSON() as (typeof priceRequests)[number];
    priceRequests.push(request);
    return route.fulfill({
      status: 200,
      json: {
        success: true,
        data: request.variantIds.flatMap(variantId =>
          ids.includes(variantId) && !(variantId === ids[0] && request.sourceType === 'tcgplayer')
            ? [
                {
                  cardId: card.cardId,
                  variantId,
                  sourceType: request.sourceType,
                  price:
                    variantId === ids[0]
                      ? '9.87'
                      : request.sourceType === 'cardmarket'
                        ? '12.34'
                        : '56.78',
                  sourceLink: 'https://www.cardmarket.com/en/StarWarsUnlimited',
                  updatedAt: new Date().toISOString(),
                  data: JSON.stringify({
                    fromPrice: 12.34,
                    priceTrend: 12.34,
                    averagePrice30Days: 12.34,
                    averagePrice7Days: 12.34,
                    averagePrice1Day: 12.34,
                    marketPrice: 56.78,
                  }),
                },
              ]
            : [],
        ),
      },
    });
  });
  await priceSwitch.focus();
  await priceSwitch.press('Space');
  await expect(priceSwitch).toBeChecked();
  await expect(priceGroups).toHaveCount(2);
  await expect(priceGroups.first()).toContainText('12.34 €');
  await expect(priceGroups.first()).toContainText('$56.78');
  await expect(priceGroups.first()).toHaveAccessibleName(
    (await galleryEntries
      .first()
      .getByRole('button', { name: /^View / })
      .getAttribute('aria-label'))!.replace(/^View /, 'Prices for '),
  );
  await expect(
    priceGroups.first().getByRole('button', { name: 'TCGplayer $56.78', exact: true }),
  ).toBeVisible();
  await expect(priceGroups.nth(1)).toContainText('9.87 €');
  await expect(priceGroups.nth(1)).toContainText('N/A');
  expect(
    priceRequests.some(
      request => request.sourceType === 'cardmarket' && request.variantIds.includes(ids[1]!),
    ),
  ).toBe(true);
  expect(
    priceRequests.some(
      request => request.sourceType === 'tcgplayer' && request.variantIds.includes(ids[1]!),
    ),
  ).toBe(true);
  await expect(labelSwitch).not.toBeChecked();
  await expect(galleryEntries.locator('p')).toHaveCount(0);
  const priceUrl = anonymous.url();
  await priceGroups.first().getByRole('button', { name: /12.34/ }).focus();
  await expect(anonymous.getByRole('tooltip')).toContainText('Price trend');
  expect(anonymous.url()).toBe(priceUrl);
  await anonymous.keyboard.press('Escape');
  await priceSwitch.focus();
  await expect(anonymous.getByRole('tooltip')).toHaveCount(0);
  expect(await anonymous.locator('button button').count()).toBe(0);
  await anonymous.setViewportSize({ width: 320, height: 844 });
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await anonymous.screenshot({ path: `${screenshots}/group-prices-mobile.png` });
  await anonymous.setViewportSize({ width: 1440, height: 1000 });
  await anonymous.reload();
  await expect(priceSwitch).toBeChecked();
  await expect(priceGroups.first()).toContainText('12.34 €');
  await priceSwitch.click();
  await expect(priceGroups).toHaveCount(0);
  await labelSwitch.click();
  await expect(labelSwitch).toBeChecked();
  await expect(galleryEntries.first().locator('p')).toHaveCount(2);
  await anonymous.reload();
  await expect(labelSwitch).toBeChecked();
  await expect(images).toHaveCount(2);
  await expect(images.first()).toHaveAttribute(
    'src',
    `https://images.swubase.com/cards/${card.variants[ids[1]]!.image.front}`,
  );
  await checkBackSide(anonymous, galleryEntries.first(), card.variants[ids[1]]!.image.back!);
  expect(await anonymous.locator('button button').count()).toBe(0);
  await anonymous.setViewportSize({ width: 390, height: 844 });
  await checkBackSide(anonymous, galleryEntries.first(), card.variants[ids[1]]!.image.back!);
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await anonymous.screenshot({ path: `${screenshots}/group-mobile.png` });
  await anonymous.setViewportSize({ width: 1440, height: 1000 });
  await galleryEntries
    .first()
    .getByRole('button', { name: /^View / })
    .click();
  await expect(anonymous.getByRole('dialog')).toBeVisible();
  expect(new URL(anonymous.url()).searchParams.get('modalCardVariantId')).toBe(ids[1]);
  await anonymous.keyboard.press('Escape');
  await anonymous.getByRole('link', { name: 'Card home', exact: true }).click();
  const heroSearch = anonymous.getByRole('textbox', { name: 'Search for cards', exact: true });
  await heroSearch.fill('Darth Vader');
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  const historyBeforeSearch = await anonymous.evaluate(() => history.length);
  await anonymous.evaluate(() => {
    const toasts = new Set<Element>();
    const observer = new MutationObserver(records => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          const candidates = node.matches('li[data-state]')
            ? [node]
            : [...node.querySelectorAll('li[data-state]')];
          for (const toast of candidates)
            if (toast.textContent?.includes('Search completed')) toasts.add(toast);
        }
      document.body.dataset.completedSearchToasts = String(toasts.size);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await heroSearch.press('Enter');
  const resultsHeading = anonymous.getByRole('heading', { name: /Search Results/ });
  await expect(resultsHeading).toContainText(/\([1-9]\d* cards\)/);
  const resultText = await resultsHeading.textContent();
  await anonymous.waitForTimeout(250);
  expect(await anonymous.evaluate(() => history.length)).toBe(historyBeforeSearch + 1);
  await expect(anonymous.locator('body')).toHaveAttribute('data-completed-search-toasts', '1');
  await anonymous.goBack();
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  await anonymous.goForward();
  await expect(resultsHeading).toHaveText(resultText!);
  await anonymous.reload();
  await expect(anonymous.locator('#name-search')).toHaveValue('Darth Vader');
  await expect(resultsHeading).toHaveText(resultText!);
  await anonymous.getByRole('link', { name: 'Card home', exact: true }).click();
  await anonymous.goBack();
  await expect(anonymous.locator('#name-search')).toHaveValue('Darth Vader');
  await anonymous.goForward();
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  await anonymous.screenshot({ path: `${screenshots}/home-desktop.png` });
  await expect(anonymous.getByText('Explore the sets', { exact: true })).toHaveCount(0);
  await expect(anonymous.getByText('Newest first', { exact: true })).toHaveCount(0);
  const advancedFilters = anonymous.getByRole('button', { name: 'Advanced filters', exact: true });
  await expect(advancedFilters).toHaveAttribute('aria-expanded', 'false');
  await expect(anonymous.locator('#name-search')).toHaveCount(0);
  const filterButtonBox = await advancedFilters.boundingBox();
  const searchInputBox = await anonymous.locator('#card-home-search').boundingBox();
  expect(filterButtonBox!.x + filterButtonBox!.width).toBeLessThan(searchInputBox!.x);
  await advancedFilters.click();
  await expect(anonymous.locator('#name-search')).toBeFocused();
  await expect(advancedFilters).toHaveAttribute('aria-expanded', 'true');
  await anonymous.screenshot({ path: `${screenshots}/home-desktop-filters.png` });
  await anonymous.getByRole('button', { name: 'Collapse filters', exact: true }).click();
  await expect(advancedFilters).toBeFocused();
  await expect(anonymous.locator('#name-search')).toHaveCount(0);
  await anonymous.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await expect(anonymous.locator('html')).toHaveClass(/light/);
  await anonymous.waitForTimeout(300);
  await anonymous.screenshot({ path: `${screenshots}/home-light.png` });
  await anonymous.setViewportSize({ width: 390, height: 844 });
  await anonymous.screenshot({ path: `${screenshots}/home-mobile.png` });
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await advancedFilters.click();
  await expect(anonymous.locator('#name-search')).toBeVisible();
  await expect(anonymous.locator('#name-search')).toBeFocused();
  await anonymous.screenshot({ path: `${screenshots}/home-mobile-filters.png` });
  await anonymous.getByRole('button', { name: 'Collapse filters', exact: true }).click();
  await expect(advancedFilters).toBeFocused();
  await expect(anonymous.locator('#name-search')).toBeHidden();
  await anonymous.setViewportSize({ width: 1440, height: 1000 });
  await anonymous.goto(`${origin}/cards/search?csAll=true`);
  await expect(anonymous.getByRole('heading', { name: /Search Results/ })).toContainText('cards');
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toHaveCount(0);
  await anonymous.goto(`${origin}/cards/search?resultsLayout=tableSmall&sort=name`);
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  await anonymous
    .locator('article')
    .filter({ has: anonymous.getByRole('heading', { name: 'Homeworlds', exact: true }) })
    .getByRole('link', { name: 'Showcases', exact: true })
    .click();
  expect(new URL(anonymous.url()).searchParams.has('resultsLayout')).toBe(false);
  expect(new URL(anonymous.url()).searchParams.has('sort')).toBe(false);
  await expect(anonymous.getByRole('link', { name: 'Showcases', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(images.first()).toBeVisible();
  expect(new URL(anonymous.url()).searchParams.get('csCategory')).toBe('leaders');
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('showcase');
  const showcaseFront = await images.first().getAttribute('src');
  const showcase = Object.values(cardList)
    .flatMap(c => Object.values(c?.variants ?? {}))
    .find(variant => showcaseFront?.endsWith(variant.image.front));
  expect(showcase?.variantName).toBe('Showcase');
  await checkBackSide(anonymous, galleryEntries.first(), showcase!.image.back!);
  await galleryEntries
    .first()
    .getByRole('button', { name: /^View / })
    .click();
  await expect(anonymous.getByRole('dialog')).toBeVisible();
  const showcaseId = new URL(anonymous.url()).searchParams.get('modalCardVariantId')!;
  expect(
    Object.values(cardList).some(c => c?.variants[showcaseId]?.variantName === 'Showcase'),
  ).toBe(true);
  await anonymous.keyboard.press('Escape');
  await anonymous.screenshot({ path: `${screenshots}/showcases-horizontal.png` });
  await anonymous.getByRole('link', { name: 'Prestige', exact: true }).click();
  await expect(anonymous.getByRole('link', { name: 'Prestige', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('Standard Prestige');
  const prestigeLabels = await galleryEntries.locator('p.text-xs').allTextContents();
  expect(prestigeLabels.length).toBeGreaterThan(0);
  expect(prestigeLabels.every(label => label.endsWith('Standard Prestige'))).toBe(true);
  const portraitArea = await galleryEntries
    .first()
    .getByRole('button', { name: /^View / })
    .boundingBox();
  expect(portraitArea).not.toBeNull();
  expect(portraitArea!.height).toBeGreaterThan(portraitArea!.width);
  const categories = anonymous.getByRole('navigation', { name: 'Set card categories' });
  const treatments = anonymous.getByRole('navigation', { name: 'Card treatments' });
  await treatments.getByRole('link', { name: /^Foil Prestige/ }).click();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('Foil Prestige');
  await treatments.getByRole('link', { name: /^Serialized Prestige/ }).click();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('Serialized Prestige');
  await categories.getByRole('link', { name: 'Weekly promo', exact: true }).click();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('HMWP');
  await treatments.getByRole('link', { name: /^Weekly Play Foil/ }).click();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('Weekly Play Foil');
  await categories.getByRole('link', { name: 'Showcases', exact: true }).click();
  await expect(treatments.getByRole('link', { name: /^Showcase/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await anonymous.getByRole('button', { name: 'Older set', exact: true }).click();
  await expect(
    anonymous.getByRole('heading', { name: 'Ashes of Empire', exact: true }),
  ).toBeVisible();
  expect(new URL(anonymous.url()).searchParams.get('csCategory')).toBe('leaders');
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('showcase');
  await anonymous.getByRole('button', { name: 'Newer set', exact: true }).click();
  await expect(anonymous.getByRole('heading', { name: 'Homeworlds', exact: true })).toBeVisible();
  await anonymous.getByRole('combobox', { name: 'Choose a set' }).click();
  await anonymous.getByRole('option', { name: /SOR.*Spark of Rebellion/ }).click();
  await expect(
    anonymous.getByRole('heading', { name: 'Spark of Rebellion', exact: true }),
  ).toBeVisible();
  await expect(treatments.getByRole('link', { name: /^Showcase/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await treatments.getByRole('link', { name: /^Hyperspace/ }).click();
  await expect(categories.getByRole('link', { name: 'Leaders', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('Hyperspace');
  await anonymous.reload();
  await expect(treatments.getByRole('link', { name: /^Hyperspace/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await categories.getByRole('link', { name: 'Weekly promo', exact: true }).click();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('OP Promo');
  await anonymous.goBack();
  await expect(treatments.getByRole('link', { name: /^Hyperspace/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await anonymous.goForward();
  await expect(galleryEntries.first().locator('p.text-xs')).toContainText('OP Promo');

  // Omitted treatments normalize in place, preserving Back to the previous page.
  await anonymous.goto(`${origin}/cards/search`);
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  const historyBeforeDefault = await anonymous.evaluate(() => history.length);
  await anonymous.goto(`${origin}/cards/sets/hmw?csCategory=leaders`);
  await expect.poll(() => new URL(anonymous.url()).searchParams.get('csVariant')).toBe('standard');
  await expect(treatments.getByRole('link', { name: /^Standard\s*\d+$/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await anonymous.evaluate(() => history.length)).toBe(historyBeforeDefault + 1);
  await anonymous.goBack();
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  // Older showcase URLs resolve to the same Leaders / Showcase selection.
  await anonymous.goto(`${origin}/cards/sets/hmw?csCategory=showcases`);
  await expect.poll(() => new URL(anonymous.url()).searchParams.get('csCategory')).toBe('leaders');
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('showcase');
  await anonymous.screenshot({ path: `${screenshots}/set-header-desktop.png` });
  await anonymous.setViewportSize({ width: 390, height: 844 });
  await expect(anonymous.getByRole('combobox', { name: 'Choose a set' })).toBeVisible();
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await anonymous.screenshot({ path: `${screenshots}/set-header-mobile.png` });
  await anonymous.setViewportSize({ width: 1440, height: 1000 });

  // Keep an unavailable treatment selected when moving to a later set.
  await anonymous.goto(`${origin}/cards/sets/sec?csCategory=all&csVariant=standard-foil`);
  await expect(galleryEntries.first()).toBeVisible();
  await anonymous.getByRole('combobox', { name: 'Choose a set' }).click();
  await anonymous.getByRole('option', { name: /LAW.*A Lawless Time/ }).click();
  await expect(
    anonymous.getByText(
      'No Standard Foil cards in A Lawless Time. Choose another treatment or switch sets.',
    ),
  ).toBeVisible();
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('standard-foil');
  await treatments.getByRole('link', { name: /^Standard\s*\d+$/ }).click();
  await expect(galleryEntries.first()).toBeVisible();
  await labelSwitch.click();
  await expect(labelSwitch).not.toBeChecked();
  await expect(galleryEntries.locator('p')).toHaveCount(0);
  await expect(anonymous.getByRole('button', { name: /Show more versions|Load more/ })).toHaveCount(
    0,
  );
  const initialCount = await galleryEntries.count();
  expect(initialCount).toBe(60);
  await anonymous.getByTestId('card-gallery-sentinel').scrollIntoViewIfNeeded();
  await expect.poll(() => galleryEntries.count()).toBeGreaterThan(initialCount);
  // Changing the treatment resets the rendered batch and keeps the preference.
  await anonymous.goto(`${origin}/cards/sets/hmw?csCategory=all&csVariant=hyperspace-foil`);
  await expect(galleryEntries.first()).toBeVisible();
  await expect(labelSwitch).not.toBeChecked();
  const foilFront = await images.first().getAttribute('src');
  const foilPrinting = Object.values(cardList)
    .flatMap(c => Object.values(c?.variants ?? {}))
    .find(v => foilFront?.endsWith(v.image.front));
  expect(foilPrinting?.hasFoil).toBe(true);
  expect(foilPrinting?.hasNonfoil).toBe(false);
  await anonymous.goto(`${origin}/cards/sets/hmw?csCategory=prestige&csVariant=hyperspace`);
  await expect(treatments.getByRole('link', { name: /^Standard Prestige/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('standard-prestige');
  // Existing shared links must not gain a history entry or trap Back when normalized.
  await anonymous.goto(`${origin}/cards/search`);
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  const historyBeforeLegacyUrl = await anonymous.evaluate(() => history.length);
  await anonymous.goto(
    `${origin}/cards/search?name=Darth+Vader&resultsLayout=imageBig&sort=name&order=asc`,
  );
  await expect(anonymous.getByRole('heading', { name: /Search Results/ })).toContainText(
    /\([1-9]\d* cards\)/,
  );
  await expect.poll(() => new URL(anonymous.url()).searchParams.get('csAll')).toBe('true');
  expect(await anonymous.evaluate(() => history.length)).toBe(historyBeforeLegacyUrl + 1);
  await anonymous.goBack();
  await expect(
    anonymous.getByRole('heading', { name: 'Search for cards', exact: true }),
  ).toBeVisible();
  await anonymous.goForward();
  await expect(anonymous.getByRole('heading', { name: /Search Results/ })).toContainText(
    /\([1-9]\d* cards\)/,
  );
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('switch', { name: 'Publish on promo page' }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(row.getByText('Draft', { exact: true })).toBeVisible();
  expect((await anonymous.request.get(`${origin}/api/card-groups/${groupId}`)).status()).toBe(404);
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete group', exact: true })
    .click();
  await expect(row).toHaveCount(0);
  const defaults = await (await page.request.get(`${origin}/api/user-settings`)).json();
  expect(defaults.cardGalleryShowLabels).toBe(false);
  expect(defaults.cardGalleryShowPrices).toBe(false);
  expect(
    (
      await page.request.post(`${origin}/api/user-settings`, {
        data: { deckPrices: true, calendarWeekStartsOn: 6 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`${origin}/api/user-settings`, {
        data: { cardGalleryShowLabels: 'yes' },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(`${origin}/api/user-settings`, {
        data: { cardGalleryShowPrices: 'yes' },
      })
    ).status(),
  ).toBe(400);
  await page.goto(`${origin}/cards/sets/hmw?csCategory=leaders&csVariant=showcase`);
  for (const toggleName of ['Show card labels', 'Show prices']) {
    const accountToggle = page.getByRole('switch', { name: toggleName, exact: true });
    await expect(accountToggle).not.toBeChecked();
    await page.route('**/api/user-settings', route =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
        : route.continue(),
    );
    await accountToggle.click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Unable to save or load' }),
    ).toBeVisible();
    await expect(accountToggle).not.toBeChecked();
    await page.unroute('**/api/user-settings');
    let releaseSave = () => {};
    let saveRequests = 0;
    const saveGate = new Promise<void>(resolve => {
      releaseSave = resolve;
    });
    await page.route('**/api/user-settings', async route => {
      if (route.request().method() === 'POST') {
        saveRequests++;
        await saveGate;
      }
      await route.continue();
    });
    try {
      await accountToggle.focus();
      await accountToggle.press('Space');
      await expect(accountToggle).toHaveAttribute('aria-busy', 'true');
      await expect(accountToggle).toBeFocused();
      await accountToggle.press('Space');
      await expect.poll(() => saveRequests).toBe(1);
    } finally {
      releaseSave();
    }
    await expect(accountToggle).toBeChecked();
    await expect(accountToggle).toBeFocused();
    await page.unroute('**/api/user-settings');
  }
  const accountLabels = page.getByRole('switch', { name: 'Show card labels' });
  const settings = await (await page.request.get(`${origin}/api/user-settings`)).json();
  expect(settings.cardGalleryShowLabels).toBe(true);
  expect(settings.cardGalleryShowPrices).toBe(true);
  expect(settings.deckPrices).toBe(true);
  expect(settings.calendarWeekStartsOn).toBe(6);
  const setup = await (await page.request.get(`${origin}/api/user-setup`)).json();
  expect(setup.data.settings.cardGalleryShowLabels).toBe(true);
  expect(setup.data.settings.cardGalleryShowPrices).toBe(true);
  const stored =
    await sql`SELECT value FROM user_settings WHERE user_id=${userId} AND key='cardGalleryShowLabels'`;
  expect(stored[0].value).toBe('true');
  const storedPrices =
    await sql`SELECT value FROM user_settings WHERE user_id=${userId} AND key='cardGalleryShowPrices'`;
  expect(storedPrices[0].value).toBe('true');
  await page.reload();
  await expect(accountLabels).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Show prices', exact: true })).toBeChecked();

  // The existing sign-in flow requests a server-to-browser sync on a fresh origin/account.
  const synced = await browser.newContext({ storageState: await context.storageState() });
  await synced.addInitScript(() => sessionStorage.setItem('needsSettingsSync', '1'));
  const syncedPage = await synced.newPage();
  await syncedPage.goto(`${origin}/cards/sets/hmw?csCategory=leaders`);
  await expect(syncedPage.getByRole('switch', { name: 'Show card labels' })).toBeChecked();
  await expect(syncedPage.getByRole('switch', { name: 'Show prices', exact: true })).toBeChecked();
  expect(
    (
      await syncedPage.request.post(`${origin}/api/auth/sign-out`, {
        data: {},
        headers: { origin },
      })
    ).status(),
  ).toBe(200);
  await syncedPage.reload();
  await expect(syncedPage.getByRole('switch', { name: 'Show card labels' })).toBeChecked();
  await expect(syncedPage.getByRole('switch', { name: 'Show prices', exact: true })).toBeChecked();
  const otherToken = randomUUID();
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES (${otherUserId},'Other card gallery user',${otherUserId + '@invalid.local'},false,now(),now(),${otherUserId},'USD','user')`;
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${randomUUID()},${otherToken},now()+interval '1 hour',${otherUserId},now(),now())`;
  await setSessionCookie(synced, otherToken);
  await syncedPage.reload();
  await expect(syncedPage.getByRole('switch', { name: 'Show card labels' })).not.toBeChecked();
  await expect(
    syncedPage.getByRole('switch', { name: 'Show prices', exact: true }),
  ).not.toBeChecked();
  await synced.close();
  // The sign-out check revoked the original session shared with the admin context.
  const feedAdminToken = randomUUID();
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${randomUUID()},${feedAdminToken},now()+interval '1 hour',${userId},now(),now())`;
  await setSessionCookie(context, feedAdminToken);
  // Positions beat recency; tied positions/timestamps remain stable across page boundaries.
  const beforeFeed = (await (await page.request.get(`${origin}/api/admin/card-groups`)).json())
    .data as { sortOrder: number }[];
  const feedBase = beforeFeed.reduce((highest, group) => Math.max(highest, group.sortOrder), 0);
  const feedPositions = [100, 300, 200, 200, 200, 200, 200, 400].map(offset => feedBase + offset);
  expect(feedPositions[7]).toBeLessThanOrEqual(maxCardGroupPosition);
  for (const [i, id] of feedIds.entries()) {
    const updatedAt =
      i === 1
        ? '2020-01-01 00:00:00'
        : i === 0
          ? '2100-01-01 00:00:00'
          : '2099-01-01 00:00:00.123456';
    await sql`INSERT INTO card_group (id,title,description,variant_ids,published,sort_order,updated_at)
      VALUES (${id},${`Promo fixture ${i}`},'A collection for pagination checks.',${sql.json(ids)},${i < 7},${feedPositions[i]},${updatedAt}::text::timestamp)`;
  }
  const orderedIds = [feedIds[1]!, ...feedIds.slice(2, 7).sort().reverse(), feedIds[0]!];
  const firstFeed = await (await anonymous.request.get(`${origin}/api/card-groups/feed`)).json();
  expect(firstFeed.data.map((g: { id: string }) => g.id)).toEqual(orderedIds.slice(0, 5));
  expect(JSON.parse(firstFeed.nextCursor).sortOrder).toBe(feedPositions[2]);
  expect(JSON.parse(firstFeed.nextCursor).updatedAt).toBe('2099-01-01T00:00:00.123456Z');
  const secondFeed = await (
    await anonymous.request.get(
      `${origin}/api/card-groups/feed?cursor=${encodeURIComponent(firstFeed.nextCursor)}`,
    )
  ).json();
  expect(secondFeed.data.slice(0, 2).map((g: { id: string }) => g.id)).toEqual(orderedIds.slice(5));
  expect(secondFeed.data.some((g: { id: string }) => g.id === feedIds[7])).toBe(false);
  const publicList = (await (await anonymous.request.get(`${origin}/api/card-groups`)).json()).data;
  expect(publicList.slice(0, 7).map((group: { id: string }) => group.id)).toEqual(orderedIds);
  const positionList = (await (await page.request.get(`${origin}/api/admin/card-groups`)).json())
    .data;
  expect(positionList.slice(0, 8).map((group: { id: string }) => group.id)).toEqual([
    feedIds[7],
    ...orderedIds,
  ]);

  await anonymous.goto(`${origin}/cards/search`);
  const browseSets = anonymous.getByRole('region', { name: 'Browse sets' });
  const tiles = browseSets.locator(':scope > div.grid > *');
  await expect(
    tiles.nth(1).getByRole('heading', { name: 'Promo and special cards', exact: true }),
  ).toBeVisible();
  const firstSet = browseSets.locator('article').first();
  const allSetLink = firstSet.getByRole('heading').getByRole('link');
  const setPath = new URL((await allSetLink.getAttribute('href'))!, origin).pathname;
  await firstSet.click({ position: { x: 20, y: 20 } });
  await expect.poll(() => new URL(anonymous.url()).pathname).toBe(setPath);
  expect(new URL(anonymous.url()).searchParams.get('csCategory')).toBe('all');
  expect(new URL(anonymous.url()).searchParams.get('csVariant')).toBe('standard');
  await anonymous.goBack();
  await allSetLink.focus();
  await allSetLink.press('Enter');
  await expect.poll(() => new URL(anonymous.url()).pathname).toBe(setPath);
  await anonymous.goBack();
  await firstSet.getByRole('link', { name: 'Leaders', exact: true }).click();
  await expect.poll(() => new URL(anonymous.url()).searchParams.get('csCategory')).toBe('leaders');
  await anonymous.goBack();
  await expect(anonymous.locator('a a')).toHaveCount(0);
  const nextFeedRequest = (url: URL) =>
    url.pathname === '/api/card-groups/feed' && url.searchParams.has('cursor');
  const firstFeedRequest = (url: URL) =>
    url.pathname === '/api/card-groups/feed' && !url.searchParams.has('cursor');
  await anonymous.route(nextFeedRequest, route =>
    route.fulfill({ status: 500, json: { message: 'Temporary failure' } }),
  );
  await tiles.nth(1).click();
  const groupSections = anonymous.locator('section[aria-labelledby^="group-"]');
  await expect(groupSections).toHaveCount(5);
  expect(
    await groupSections.evaluateAll(sections =>
      sections.map(s => s.getAttribute('aria-labelledby')?.replace('group-', '')),
    ),
  ).toEqual(orderedIds.slice(0, 5));
  await expect(anonymous.getByRole('switch', { name: 'Show card labels' })).toHaveCount(1);
  await expect(priceSwitch).not.toBeChecked();
  await priceSwitch.click();
  await expect(groupSections.first().getByRole('group', { name: /^Prices for / })).toHaveCount(2);
  await expect(
    groupSections
      .first()
      .getByRole('group', { name: /^Prices for / })
      .first(),
  ).toContainText('9.87 €');
  await anonymous.screenshot({ path: `${screenshots}/promo-prices-desktop.png` });
  await priceSwitch.click();
  await expect(groupSections.getByRole('group', { name: /^Prices for / })).toHaveCount(0);
  const groupSelector = anonymous.getByRole('combobox', { name: /^Choose a card group/ });
  const pinnedId = orderedIds[6]!;
  const pinnedTitle = `Promo fixture ${feedIds.indexOf(pinnedId)}`;
  await groupSelector.click();
  await expect(anonymous.getByRole('option', { name: /^Promo fixture 7 / })).toHaveCount(0);
  await anonymous.getByRole('option').filter({ hasText: pinnedTitle }).click();
  await expect.poll(() => new URL(anonymous.url()).searchParams.get('promoGroup')).toBe(pinnedId);
  await expect(groupSections).toHaveCount(6);
  await expect(groupSections.first()).toHaveAttribute('aria-labelledby', `group-${pinnedId}`);
  await expect(groupSelector).toHaveAccessibleName(`Choose a card group ${pinnedTitle}`);
  expect(
    await groupSections.evaluateAll(sections =>
      sections.map(section => section.getAttribute('aria-labelledby')?.replace('group-', '')),
    ),
  ).toEqual([pinnedId, ...orderedIds.slice(0, 5)]);
  await anonymous.reload();
  await expect(groupSections).toHaveCount(6);
  await expect(groupSections.first()).toHaveAttribute('aria-labelledby', `group-${pinnedId}`);
  await groupSections
    .first()
    .getByRole('button', { name: /^View / })
    .first()
    .click();
  await expect(anonymous.getByRole('dialog')).toBeVisible();
  expect(new URL(anonymous.url()).pathname).toBe('/cards/promos');
  expect(new URL(anonymous.url()).searchParams.get('promoGroup')).toBe(pinnedId);
  expect(new URL(anonymous.url()).searchParams.get('modalCardVariantId')).toBe(ids[0]);
  await anonymous.keyboard.press('Escape');
  expect(new URL(anonymous.url()).searchParams.get('promoGroup')).toBe(pinnedId);
  await groupSelector.click();
  await anonymous.getByRole('option', { name: 'Browse all groups', exact: true }).click();
  await expect.poll(() => new URL(anonymous.url()).searchParams.has('promoGroup')).toBe(false);
  await expect(groupSections).toHaveCount(5);
  await anonymous.goBack();
  await expect(groupSections.first()).toHaveAttribute('aria-labelledby', `group-${pinnedId}`);
  await anonymous.goForward();
  await expect(groupSections).toHaveCount(5);
  await anonymous.getByTestId('card-groups-sentinel').scrollIntoViewIfNeeded();
  await expect(
    anonymous.getByRole('alert').filter({ hasText: 'More collections couldn’t be loaded.' }),
  ).toBeVisible();
  await expect(groupSections).toHaveCount(5);
  await anonymous.unroute(nextFeedRequest);
  await anonymous.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => groupSections.count()).toBeGreaterThan(5);
  for (const id of orderedIds) await expect(anonymous.locator(`#group-${id}`)).toHaveCount(1);
  await expect(anonymous.locator(`#group-${feedIds[7]}`)).toHaveCount(0);
  const loadedCount = await groupSections.count();
  await groupSelector.click();
  await anonymous.getByRole('option').filter({ hasText: pinnedTitle }).click();
  await expect(groupSections.first()).toHaveAttribute('aria-labelledby', `group-${pinnedId}`);
  await expect(groupSections).toHaveCount(loadedCount);
  await expect(anonymous.locator(`#group-${pinnedId}`)).toHaveCount(1);
  await groupSelector.click();
  await anonymous.getByRole('option', { name: 'Browse all groups', exact: true }).click();
  await anonymous.setViewportSize({ width: 390, height: 844 });
  await anonymous
    .getByRole('heading', { name: 'Promo and special cards', exact: true })
    .scrollIntoViewIfNeeded();
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await anonymous.reload();
  await expect(
    anonymous.getByRole('heading', { name: 'Promo and special cards', exact: true }),
  ).toBeVisible();
  await expect(groupSections).toHaveCount(5);
  await anonymous.route(firstFeedRequest, route =>
    route.fulfill({ status: 200, json: { data: [], nextCursor: null } }),
  );
  await anonymous.reload();
  await expect(anonymous.getByRole('heading', { name: 'More to discover soon' })).toBeVisible();
  await anonymous.unroute(firstFeedRequest);
  await anonymous.route(firstFeedRequest, route =>
    route.fulfill({ status: 500, json: { message: 'Temporary failure' } }),
  );
  await anonymous.reload();
  await expect(
    anonymous.getByRole('alert').filter({ hasText: 'Unable to load the collections.' }),
  ).toBeVisible();
  await anonymous.unroute(firstFeedRequest);
  await anonymous.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(groupSections).toHaveCount(5);
  const groupListRequest = (url: URL) => url.pathname === '/api/card-groups';
  await anonymous.route(groupListRequest, route =>
    route.fulfill({ status: 500, json: { message: 'Temporary failure' } }),
  );
  await anonymous.reload();
  await expect(
    anonymous.getByRole('alert').filter({ hasText: 'The card group selector couldn’t be loaded.' }),
  ).toBeVisible();
  await expect(groupSections).toHaveCount(5);
  await anonymous.unroute(groupListRequest);
  await anonymous.getByRole('button', { name: 'Retry group selector', exact: true }).click();
  await expect(groupSelector).toBeEnabled();
  await groupSelector.click();
  await anonymous.getByRole('option').filter({ hasText: pinnedTitle }).click();
  await expect(groupSections.first()).toHaveAttribute('aria-labelledby', `group-${pinnedId}`);
  expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await anonymous.goto(`${origin}/cards/promos?promoGroup=${feedIds[7]}`);
  await expect(
    anonymous.getByRole('alert').filter({ hasText: 'This card group is no longer available.' }),
  ).toBeVisible();
  await expect(anonymous.locator(`#group-${feedIds[7]}`)).toHaveCount(0);
  await expect(groupSections).toHaveCount(5);
  await anonymous.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect.poll(() => new URL(anonymous.url()).searchParams.has('promoGroup')).toBe(false);
  expect(errors).toEqual([]);
  console.log(
    'Passed: admin/anonymous authorization, invalid IDs, draft/create/reorder/publish/unpublish/delete, position defaults/manual edits/descending order/tied pagination, exact variant gallery, leader back-side previews and keyboard/mobile controls, search/refresh/back/forward, mobile filters, set/treatment navigation, promo mappings, infinite scroll, exact-version price badges, independent persisted labels/prices and account sync, whole set tiles, promo feed pagination/draft exclusion/error recovery/empty state, group selection/pinning/deduplication/refresh/history/selector error recovery.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  await anonymous.screenshot({ path: `${screenshots}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM card_group WHERE title=${title} OR id IN ${sql(feedIds)}`;
  await sql`DELETE FROM session WHERE user_id=${userId}`;
  await sql`DELETE FROM "user" WHERE id IN (${userId}, ${otherUserId})`;
  await sql.end();
}
