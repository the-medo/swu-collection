// CARD_DETAIL_DECK_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-detail-decks.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import cards from '../../server/db/json/card-list.json';

const expect = baseExpect.configure({ timeout: 20_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_DETAIL_DECK_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against an isolated development worktree.');

const sql = postgres(database.toString(), { max: 2 });
const userId = `card-decks-browser-${randomUUID()}`;
const deckIds = Array.from({ length: 14 }, () => randomUUID());
const card = cards['2-1b-surgical-droid'];
const nextCard = cards['332nd-stalwart'];
const leader = Object.values(cards).find(card => card.type === 'Leader')!;
const base = Object.values(cards).find(card => card.type === 'Base')!;
const variant = Object.values(card.variants).find(variant => variant.variantName === 'Hyperspace')!;
const screenshots = new URL('../../.swubase/card-detail-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'dark');
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const requests: string[] = [];
page.on('request', request => {
  if (new URL(request.url()).pathname.startsWith('/api/deck/card/')) requests.push(request.url());
});
const lookupUrl = `**/api/deck/card/${card.cardId}`;

try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${userId}, 'Decks browser fixture', 'Decks test owner', ${userId + '@invalid.local'}, false, 'USD', now(), now())`;
  for (let index = 0; index < deckIds.length; index++) {
    const updatedAt = new Date(Date.UTC(2099, 0, 1) - index * 60_000);
    await sql`INSERT INTO deck (id, user_id, format, name, description, leader_card_id_1, base_card_id, public, updated_at)
      VALUES (${deckIds[index]}, ${userId}, 1, ${'Decks browser fixture ' + index}, 'Public deck table test',
        ${leader.cardId}, ${base.cardId}, ${index === 11 ? 0 : index === 12 ? 2 : 1}, ${updatedAt})`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${deckIds[index]})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity)
      VALUES (${deckIds[index]}, ${index === 13 ? nextCard.cardId : card.cardId}, 1, 3)`;
  }
  await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity)
    VALUES (${deckIds[0]}, ${card.cardId}, 2, 2)`;
  await sql`INSERT INTO entity_price (entity_id, source_type, type, updated_at, price, data)
    VALUES (${deckIds[0]}, 'tcgplayer', 'deck', '2000-01-01', '12.34',
      ${JSON.stringify({ highPrice: 14, midPrice: 12.34, lowPrice: 9.99, marketPrice: 12.34 })})`;

  await page.goto(`${origin}/cards/detail/${card.cardId}`);
  await expect(page.getByRole('tab', { name: 'Card Details', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Variants/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Decks', exact: true })).toBeVisible();
  await expect(page.getByText('Related Information', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Decks with this card', exact: true })).toHaveCount(
    0,
  );
  expect(requests).toEqual([]);

  let release = () => {};
  const heldRequest = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(lookupUrl, async route => {
    await heldRequest;
    await route.continue();
  });
  await page.getByRole('tab', { name: 'Decks', exact: true }).click();
  const section = page.getByRole('region', { name: 'Decks with this card', exact: true });
  await expect(section.getByRole('status')).toHaveText('Loading decks...');
  await expect(section.getByRole('button', { name: 'Loading...', exact: true })).toHaveCount(0);
  const response = page.waitForResponse(lookupUrl);
  release();
  const data = await (await response).json();
  expect(data.data.map((item: { deck: { id: string } }) => item.deck.id)).toEqual(
    deckIds.slice(0, 10),
  );
  await page.unroute(lookupUrl);
  const table = section.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(
    section.getByText('Up to 10 of the most recently updated public decks with this card.'),
  ).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0);
  expect(await table.getByRole('columnheader').allTextContents()).toEqual([
    'Leaders/Base',
    'Name',
    'Price',
    'Format',
    'Owner',
    'Updated',
    'Actions',
  ]);
  await expect(table.getByText('$12.34', { exact: true })).toBeVisible();
  for (let index = 0; index < 10; index++) {
    await expect(
      table.getByRole('link', { name: 'Decks browser fixture ' + index, exact: false }),
    ).toHaveAttribute('href', `/decks/${deckIds[index]}`);
  }
  for (let index = 10; index < deckIds.length; index++) {
    await expect(section.getByText('Decks browser fixture ' + index, { exact: true })).toHaveCount(
      0,
    );
  }
  expect(new URL(requests[0]).search).toBe('');

  // The shared price-refresh action must update this new query family as well.
  const priceUrl = `**/api/deck/${deckIds[0]}/price`;
  await page.route(priceUrl, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const [price] = await sql`UPDATE entity_price SET price='25.00', updated_at=now()
      WHERE entity_id=${deckIds[0]} RETURNING *`;
    await route.fulfill({
      status: 200,
      json: {
        data: [
          {
            entityId: price.entity_id,
            sourceType: price.source_type,
            type: price.type,
            updatedAt: price.updated_at.toISOString(),
            data: price.data,
            dataMissing: price.data_missing,
            price: price.price,
            priceMissing: price.price_missing,
          },
        ],
      },
    });
  });
  await table.getByText('$12.34', { exact: true }).hover();
  const refreshedPrices = page.waitForResponse(lookupUrl);
  // Radix also clones tooltip content into its screen-reader description.
  await page.getByRole('button', { name: 'Refresh prices', exact: true }).first().click();
  expect((await refreshedPrices).status()).toBe(200);
  await expect(table.getByText('$25.00', { exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.unroute(priceUrl);

  // Background failures keep the loaded table and offer a retry.
  await page.route(lookupUrl, route =>
    route.fulfill({ status: 503, json: { message: 'Test failure' } }),
  );
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await page.getByRole('tab', { name: 'Decks', exact: true }).click();
  await expect(section.getByRole('alert')).toContainText('Unable to load decks');
  await expect(table.getByRole('row')).toHaveCount(11);
  await page.unroute(lookupUrl);
  await section.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(section.getByRole('alert')).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0);

  // Reopening the tab removes a deck that is no longer public and fills its place.
  await sql`UPDATE deck SET public=0 WHERE id=${deckIds[0]}`;
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await page.getByRole('tab', { name: 'Decks', exact: true }).click();
  await expect(table.getByText('Decks browser fixture 0', { exact: true })).toHaveCount(0);
  await expect(table.getByText('Decks browser fixture 10', { exact: true })).toBeVisible();
  await sql`UPDATE deck SET public=1 WHERE id=${deckIds[0]}`;

  // Variant selection is independent; reopening the tab refreshes by card ID.
  await page.getByRole('tab', { name: /^Variants/ }).click();
  await expect(section).toHaveCount(0);
  await page
    .getByRole('button', { name: `Hyperspace · SOR #${variant.cardNo}`, exact: true })
    .click();
  const count = requests.length;
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await page.getByRole('tab', { name: 'Card Details', exact: true }).focus();
  const reopened = page.waitForResponse(lookupUrl);
  await page.keyboard.press('End');
  expect((await reopened).status()).toBe(200);
  await expect(page.getByRole('tab', { name: 'Decks', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // Development StrictMode may cancel and restart a newly mounted query.
  expect(requests.length).toBeGreaterThan(count);
  expect(
    requests
      .slice(count)
      .every(
        url =>
          new URL(url).pathname === `/api/deck/card/${card.cardId}` && new URL(url).search === '',
      ),
  ).toBe(true);
  await expect(table.getByText('Decks browser fixture 0', { exact: true })).toBeVisible();

  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    for (const width of [1440, 1024, 768, 430, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await expect(section.getByText('Decks browser fixture 0', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await section.screenshot({ path: `${screenshots}/${theme}-decks-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await table.getByRole('link', { name: 'Decks browser fixture 0', exact: false }).click();
  await expect(page).toHaveURL(`${origin}/decks/${deckIds[0]}`);

  // Card dialogs share the tabs and contain horizontal table scrolling.
  await page.goto(`${origin}/decks/${deckIds[0]}?modalCardId=${card.cardId}`);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('tab', { name: 'Card Details', exact: true })).toBeVisible();
  await expect(dialog.getByText('Related Information', { exact: true })).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Decks', exact: true }).click();
  const modalDecks = dialog.getByRole('region', { name: 'Decks with this card', exact: true });
  for (const width of [1440, 1024, 768, 430]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(modalDecks.getByText('Decks browser fixture 0', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const dimensions = await modalDecks
      .getByRole('region', { name: 'Public decks', exact: true })
      .evaluate(element => ({
        scrollable: element.clientWidth,
        section: element.parentElement!.clientWidth,
      }));
    expect(dimensions.scrollable).toBeLessThanOrEqual(dimensions.section);
  }
  await modalDecks.getByRole('link', { name: 'Decks browser fixture 0', exact: false }).click();
  await expect(page).toHaveURL(`${origin}/decks/${deckIds[0]}`);
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1100 });

  const nextResponse = await page.request.get(`${origin}/api/deck/card/${nextCard.cardId}`);
  expect(nextResponse.status()).toBe(200);
  expect((await nextResponse.json()).data[0].deck.id).toBe(deckIds[13]);

  // A new card gets its own lazy request and an explicit empty state.
  const nextUrl = `**/api/deck/card/${nextCard.cardId}`;
  await page.route(nextUrl, route => route.fulfill({ status: 200, json: { data: [] } }));
  await page.goto(`${origin}/cards/detail/${nextCard.cardId}`);
  const beforeNextCard = requests.length;
  await page.getByRole('tab', { name: 'Decks', exact: true }).click();
  await expect(section.getByRole('status')).toHaveText('No public decks with this card yet.');
  await expect(section.getByRole('table')).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(beforeNextCard);
  expect(new URL(requests[requests.length - 1]).pathname).toBe(`/api/deck/card/${nextCard.cardId}`);
  await page.unroute(nextUrl);

  // Initial errors do not turn into a misleading empty state.
  await page.route(nextUrl, route =>
    route.fulfill({ status: 503, json: { message: 'Test failure' } }),
  );
  await page.reload();
  await page.getByRole('tab', { name: 'Decks', exact: true }).click();
  await expect(section.getByRole('alert')).toContainText('Unable to load decks');
  await expect(section.getByRole('status')).toHaveCount(0);
  await expect(section.getByRole('table')).toHaveCount(0);
  await page.unroute(nextUrl);
  await page.route(nextUrl, route => route.fulfill({ status: 200, json: { data: [] } }));
  await section.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(section.getByRole('status')).toHaveText('No public decks with this card yet.');
  expect(errors).toEqual([]);
  console.log(
    'PASS: anonymous lazy card decks lookup, shared table, public ordering, variant independence, refresh, loading/error/empty states, links, keyboard tabs and light/dark responsive layouts.',
  );
} finally {
  await context.close();
  await browser.close();
  await sql`DELETE FROM entity_price WHERE entity_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck_card WHERE deck_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck WHERE id IN ${sql(deckIds)}`;
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
