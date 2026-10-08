// CARD_DETAIL_LIST_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-detail-lists.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import cards from '../../server/db/json/card-list.json';

const expect = baseExpect.configure({ timeout: 20_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_DETAIL_LIST_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against an isolated development worktree.');

const sql = postgres(database.toString(), { max: 2 });
const ownerId = `card-detail-owner-${randomUUID()}`;
const otherId = `card-detail-other-${randomUUID()}`;
const emptyId = `card-detail-empty-${randomUUID()}`;
const listIds = Array.from({ length: 4 }, () => randomUUID());
const titles = ['Detail collection', 'Detail wantlist', 'Detail card list', 'Other account list'];
const card = cards['2-1b-surgical-droid'];
const nextCard = cards['332nd-stalwart'];
const variant = Object.values(card.variants).find(v => v.variantName === 'Hyperspace')!;
const standardVariant = Object.values(card.variants).find(v => v.variantName === 'Standard')!;
const modernCard = Object.values(cards).find(card => {
  const variants = Object.values(card.variants);
  return (
    variants.some(v => v.set === 'jtl' && v.variantName === 'Standard') &&
    variants.some(v => v.set === 'jtl' && v.variantName === 'Standard Foil')
  );
})!;
const modernStandard = Object.values(modernCard.variants).find(
  v => v.set === 'jtl' && v.variantName === 'Standard',
)!;
const modernFoil = Object.values(modernCard.variants).find(
  v => v.set === 'jtl' && v.variantName === 'Standard Foil',
)!;
const browser = await chromium.launch();
const contexts: BrowserContext[] = [];
const errors: string[] = [];
const adminPriceRequests: string[] = [];
const screenshots = new URL('../../.swubase/card-detail-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });

async function signIn(context: BrowserContext, userId: string) {
  await context.clearCookies();
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
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

async function pageFor(userId?: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  contexts.push(context);
  if (userId) await signIn(context, userId);
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/card-prices/sources') {
      adminPriceRequests.push(request.url());
    }
  });
  return page;
}

async function openVariants(page: Page) {
  await page.getByRole('tab', { name: /^Variants/ }).click();
}

async function chooseList(page: Page, title: string) {
  await page.getByRole('region', { name: 'Add to list' }).getByLabel('Destination list').click();
  await page.getByRole('option', { name: title, exact: true }).click();
}

async function fillCardDetails(page: Page, amount: string) {
  const section = page.getByRole('region', { name: 'Add to list' });
  await section.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'FR - French' }).click();
  await section.getByLabel('Condition', { exact: true }).click();
  await page.getByRole('option', { name: 'EX - Excellent' }).click();
  await section.getByLabel('Foil', { exact: true }).check();
  await section.getByLabel('Note', { exact: true }).fill('Card detail entry');
  await section.getByLabel('Amount', { exact: true }).fill(amount);
}

async function submit(page: Page) {
  const response = page.waitForResponse(
    r => r.request().method() === 'POST' && /\/collection\/[^/]+\/card$/.test(r.url()),
  );
  await page
    .getByRole('region', { name: 'Add to list' })
    .getByRole('button', { name: 'Add', exact: true })
    .click();
  expect((await response).status()).toBe(201);
  await expect(
    page
      .getByRole('region', { name: 'Add to list' })
      .getByRole('button', { name: 'Add', exact: true }),
  ).toBeEnabled();
}

try {
  for (const id of [ownerId, otherId, emptyId]) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
      VALUES (${id}, 'Card detail tester', ${id + '@invalid.local'}, false, now(), now(), ${id}, 'USD')`;
  }
  for (let i = 0; i < listIds.length; i++) {
    await sql`INSERT INTO collection (id, user_id, title, collection_type, public, for_decks)
      VALUES (${listIds[i]}, ${i === 3 ? otherId : ownerId}, ${titles[i]}, ${i === 3 ? 1 : i + 1}, true, ${i === 0})`;
  }
  await sql`INSERT INTO collection_card (collection_id, card_id, variant_id, foil, condition, language, amount, amount2, price)
    VALUES (${listIds[0]}, ${card.cardId}, ${variant.variantId}, true, 2, 'FR', 5, 2, '1.23')`;

  const page = await pageFor(ownerId);
  const lookupRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/collection/card/')) {
      lookupRequests.push(request.url());
    }
  });
  await page.goto(`${origin}/cards/detail/${card.cardId}`);
  await expect(page.getByRole('region', { name: 'Add to list' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Card in my lists' })).toHaveCount(0);
  await openVariants(page);
  const section = page.getByRole('region', { name: 'Add to list' });
  await expect(section.getByLabel('Destination list')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await section.getByLabel('Destination list').click();
  for (const title of ['Collections', 'Wantlists', 'Card lists']) {
    await expect(page.getByRole('group', { name: new RegExp(`^${title}`) })).toBeVisible();
  }
  for (const title of titles.slice(0, 3))
    await expect(page.getByRole('option', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: titles[3], exact: true })).toHaveCount(0);
  const listSearch = page.getByRole('combobox', { name: 'Search lists', exact: true });
  await expect(listSearch).toBeFocused();
  await listSearch.fill('WANT');
  await expect(page.getByRole('option', { name: titles[1], exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: titles[0], exact: true })).toBeHidden();
  await expect(page.getByRole('group', { name: /^Collections/ })).toBeHidden();
  await listSearch.fill('no matching list');
  await expect(page.getByText('No lists found.', { exact: true })).toBeVisible();
  await listSearch.fill(listIds[0]);
  await expect(page.getByText('No lists found.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(section.getByLabel('Destination list')).toBeFocused();
  await section.getByLabel('Destination list').click();
  await expect(listSearch).toHaveValue('');
  await listSearch.fill(titles[0]);
  await page.keyboard.press('Enter');
  await expect(section.getByLabel('Destination list')).toContainText(titles[0]);
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expect(section).toHaveCount(0);
  await openVariants(page);
  await expect(section.getByLabel('Destination list')).toContainText(titles[0]);
  await page
    .getByRole('button', {
      name: `${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section).toContainText(`Hyperspace · SOR #${variant.cardNo}`);
  await fillCardDetails(page, '3');
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expect(section).toHaveCount(0);
  await openVariants(page);
  await expect(section.getByLabel('Amount', { exact: true })).toHaveValue('3');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByLabel('Condition', { exact: true })).toContainText('EX');
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Card detail entry');
  await expect(section.getByLabel('Foil', { exact: true })).toBeChecked();
  await page
    .getByRole('button', {
      name: `${standardVariant.variantName} · ${standardVariant.set.toUpperCase()} #${standardVariant.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section.getByLabel('Amount', { exact: true })).toHaveValue('3');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByLabel('Condition', { exact: true })).toContainText('EX');
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Card detail entry');
  await expect(section.getByLabel('Foil', { exact: true })).toBeChecked();
  await page
    .getByRole('button', {
      name: `${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Card detail entry');
  await section.getByLabel('Foil', { exact: true }).check();

  // Prime the real detail cache to catch double-counting an upsert's authoritative response.
  await page.evaluate(async id => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    const response = await fetch(`/api/collection/${id}/card`);
    queryClient.setQueryData(['collection-content', id], await response.json());
  }, listIds[0]);
  await submit(page);
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByLabel('Condition', { exact: true })).toContainText('NM');
  await expect(section.getByLabel('Amount', { exact: true })).toHaveValue('1');
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('');
  let [row] = await sql`SELECT * FROM collection_card WHERE collection_id=${listIds[0]}`;
  expect(row).toMatchObject({
    card_id: card.cardId,
    variant_id: variant.variantId,
    foil: true,
    condition: 2,
    language: 'FR',
    amount: 8,
    amount2: 2,
    price: '1.23',
    note: 'Card detail entry',
  });
  const cachedAmount = await page.evaluate(async id => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    return queryClient.getQueryData(['collection-content', id]).data[0].amount;
  }, listIds[0]);
  expect(cachedAmount).toBe(8);
  await fillCardDetails(page, '2');
  await submit(page);
  [row] = await sql`SELECT * FROM collection_card WHERE collection_id=${listIds[0]}`;
  expect(row.amount).toBe(10);
  console.log(
    'PASS: selected variant, all card fields, composite-key upsert and authoritative cached quantities.',
  );

  for (let i = 1; i <= 2; i++) {
    await chooseList(page, titles[i]);
    await submit(page);
    const [added] = await sql`SELECT * FROM collection_card WHERE collection_id=${listIds[i]}`;
    expect(added).toMatchObject({ card_id: card.cardId, variant_id: variant.variantId, amount: 1 });
  }

  // Card lookup is click-gated and uses card ID regardless of the selected variant.
  expect(lookupRequests).toEqual([]);
  await sql`INSERT INTO collection_card (collection_id, card_id, variant_id, foil, condition, language, amount, amount2)
    VALUES (${listIds[0]}, ${card.cardId}, ${standardVariant.variantId}, false, 1, 'EN', 4, null),
      (${listIds[0]}, ${card.cardId}, ${variant.variantId}, false, 3, 'DE', 0, 4),
      (${listIds[3]}, ${card.cardId}, ${standardVariant.variantId}, false, 1, 'EN', 9, null)`;
  const inLists = page.getByRole('region', { name: 'Card in my lists' });
  await expect(
    inLists.getByRole('button', { name: 'Check in my lists', exact: true }),
  ).toBeVisible();
  await expect(inLists.getByRole('table')).toHaveCount(0);
  const initialBox = await inLists.boundingBox();
  const checkBox = await inLists.getByRole('button').boundingBox();
  expect(checkBox!.x + checkBox!.width / 2).toBeCloseTo(initialBox!.x + initialBox!.width / 2, 0);
  let releaseLookup = () => {};
  const heldLookup = new Promise<void>(resolve => {
    releaseLookup = resolve;
  });
  const lookupUrl = `**/api/collection/card/${card.cardId}`;
  await page.route(lookupUrl, async route => {
    await heldLookup;
    await route.continue();
  });
  await inLists.getByRole('button', { name: 'Check in my lists', exact: true }).click();
  await expect(inLists.getByRole('status')).toHaveText('Checking your lists...');
  await expect(inLists.getByRole('button', { name: 'Checking...', exact: true })).toBeDisabled();
  const lookupResponse = page.waitForResponse(
    response => new URL(response.url()).pathname === `/api/collection/card/${card.cardId}`,
  );
  releaseLookup();
  expect((await lookupResponse).status()).toBe(200);
  await page.unroute(lookupUrl);
  for (const [index, title] of titles.slice(0, 3).entries()) {
    await expect(inLists.getByRole('group', { name: title, exact: true })).toBeVisible();
    await expect(inLists.getByRole('link', { name: title, exact: true })).toHaveAttribute(
      'href',
      `/collections/${listIds[index]}`,
    );
  }
  await expect(inLists.getByRole('group', { name: titles[3], exact: true })).toHaveCount(0);
  const matchTable = inLists.getByRole('group', { name: titles[0], exact: true });
  await expect(matchTable.locator('tbody tr')).toHaveCount(3);
  await expect(matchTable).toContainText(`SOR #${standardVariant.cardNo}`);
  await expect(matchTable).toContainText(`SOR #${variant.cardNo}`);
  await expect(matchTable).toContainText('Standard');
  await expect(matchTable).toContainText('Hyperspace');
  await expect(inLists.getByLabel('List totals')).toHaveText(
    '14 in collections · 1 in wantlists · 1 in card lists',
  );
  await expect(matchTable.locator('tbody tr[data-state="highlighted"]')).toHaveCount(2);
  await expect(matchTable.locator('tbody tr[data-state="highlighted"]')).toContainText([
    'Hyperspace',
    'Hyperspace',
  ]);
  for (const name of ['Card', 'Cost', 'Set', 'R.']) {
    await expect(inLists.getByRole('columnheader', { name, exact: true })).toHaveCount(0);
  }
  await expect(matchTable.getByLabel('Quantity 2', { exact: true })).toHaveCount(3);
  const lookupCount = lookupRequests.length;
  await page
    .getByRole('button', {
      name: `${standardVariant.variantName} · SOR #${standardVariant.cardNo}`,
      exact: true,
    })
    .click();
  await expect(matchTable.locator('tbody tr')).toHaveCount(3);
  await expect(matchTable.locator('tbody tr[data-state="highlighted"]')).toHaveCount(1);
  await expect(matchTable.locator('tbody tr[data-state="highlighted"]')).toContainText('Standard');
  expect(lookupRequests).toHaveLength(lookupCount);

  const ownedRowKey = `${listIds[0]}:${card.cardId}:${variant.variantId}:true:2:FR`;
  const quantity = matchTable.locator(`input[id="${ownedRowKey}:amount"]`);
  const editResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card`,
  );
  const refreshedLookup = page.waitForResponse(
    response => new URL(response.url()).pathname === `/api/collection/card/${card.cardId}`,
  );
  await quantity.fill('11');
  expect((await editResponse).status()).toBe(201);
  expect((await refreshedLookup).status()).toBe(200);
  await expect(quantity).toHaveValue('11');
  await expect(inLists.getByLabel('List totals')).toHaveText(
    '15 in collections · 1 in wantlists · 1 in card lists',
  );
  const [editedMatch] = await sql`SELECT amount, amount2, price FROM collection_card
    WHERE collection_id=${listIds[0]} AND variant_id=${variant.variantId} AND foil=true AND language='FR'`;
  expect(editedMatch).toMatchObject({ amount: 11, amount2: 2, price: '1.23' });

  const priceResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card`,
  );
  await matchTable.locator(`input[id="${ownedRowKey}:price"]`).fill('2.34');
  expect((await priceResponse).status()).toBe(201);
  const [pricedMatch] = await sql`SELECT amount, amount2, price FROM collection_card
    WHERE collection_id=${listIds[0]} AND variant_id=${variant.variantId} AND foil=true AND language='FR'`;
  expect(pricedMatch).toMatchObject({ amount: 11, amount2: 2, price: '2.34' });

  // Keep typing while an earlier save and its authoritative lookup response are delayed.
  const putUrl = `**/api/collection/${listIds[0]}/card`;
  const isNoteResponse = (response: import('playwright/test').Response, note: string) =>
    response.request().method() === 'PUT' &&
    new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card` &&
    response.request().postDataJSON()?.data?.note === note;
  let firstNoteSaved = () => {};
  let releaseFirstNote = () => {};
  let releaseSecondNote = () => {};
  const firstSaved = new Promise<void>(resolve => {
    firstNoteSaved = resolve;
  });
  const firstHeld = new Promise<void>(resolve => {
    releaseFirstNote = resolve;
  });
  const secondHeld = new Promise<void>(resolve => {
    releaseSecondNote = resolve;
  });
  await page.route(putUrl, async route => {
    const note = route.request().postDataJSON()?.data?.note;
    if (note === 'abc') {
      const response = await route.fetch();
      firstNoteSaved();
      await firstHeld;
      await route.fulfill({ response });
    } else {
      if (note === 'abcdef') await secondHeld;
      await route.continue();
    }
  });
  const noteInput = matchTable.locator(`input[id="${ownedRowKey}:note"]`);
  const firstNoteResponse = page.waitForResponse(response => isNoteResponse(response, 'abc'));
  await noteInput.fill('abc');
  await firstSaved;
  await noteInput.press('End');
  await noteInput.pressSequentially('def');
  const firstNoteLookup = page.waitForResponse(
    response => new URL(response.url()).pathname === `/api/collection/card/${card.cardId}`,
  );
  releaseFirstNote();
  expect((await firstNoteResponse).status()).toBe(201);
  expect((await firstNoteLookup).status()).toBe(200);
  await expect(noteInput).toHaveValue('abcdef');
  const secondNoteResponse = page.waitForResponse(response => isNoteResponse(response, 'abcdef'));
  releaseSecondNote();
  expect((await secondNoteResponse).status()).toBe(201);
  const finalNoteResponse = page.waitForResponse(response => isNoteResponse(response, 'abcdefg'));
  await noteInput.press('End');
  await noteInput.pressSequentially('g');
  expect((await finalNoteResponse).status()).toBe(201);
  await expect(noteInput).toHaveValue('abcdefg');
  await page.unroute(putUrl);
  await page.route(lookupUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  const blurredSave = page.waitForResponse(response =>
    isNoteResponse(response, 'Saved despite failed refresh'),
  );
  const failedRefresh = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === `/api/collection/card/${card.cardId}` &&
      response.status() === 503,
  );
  await noteInput.fill('Saved despite failed refresh');
  await inLists.getByRole('heading', { name: 'In your lists', exact: true }).click();
  expect((await blurredSave).status()).toBe(201);
  await failedRefresh;
  await expect(noteInput).toHaveValue('Saved despite failed refresh');
  await expect(inLists.getByRole('alert')).toBeVisible();
  await page.unroute(lookupUrl);
  await inLists.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(inLists.getByRole('alert')).toHaveCount(0);
  await page.route(putUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Could not save this note' }),
    }),
  );
  const failedNoteResponse = page.waitForResponse(response =>
    isNoteResponse(response, 'Keep this failed edit'),
  );
  await noteInput.fill('Keep this failed edit');
  expect((await failedNoteResponse).status()).toBe(503);
  await expect(page.getByText('Could not save this note', { exact: false })).toBeVisible();
  await expect(noteInput).toHaveAttribute('aria-invalid', 'true');
  await inLists.getByRole('heading', { name: 'In your lists', exact: true }).click();
  await expect(noteInput).toHaveValue('Keep this failed edit');
  await page.unroute(putUrl);
  const recoveredNoteResponse = page.waitForResponse(response =>
    isNoteResponse(response, 'Keep this failed edit'),
  );
  await matchTable.getByRole('button', { name: 'Retry saving note', exact: true }).click();
  expect((await recoveredNoteResponse).status()).toBe(201);
  await expect(noteInput).not.toHaveAttribute('aria-invalid', 'true');
  await expect(noteInput).toHaveValue('Keep this failed edit');

  // A slow note save must finish before the same row's price save, even if refreshes fail.
  let orderedNoteSaved = () => {};
  let releaseOrderedNote = () => {};
  const orderedNoteBegan = new Promise<void>(resolve => {
    orderedNoteSaved = resolve;
  });
  const orderedNoteHeld = new Promise<void>(resolve => {
    releaseOrderedNote = resolve;
  });
  let orderedPriceRequests = 0;
  await page.route(putUrl, async route => {
    const data = route.request().postDataJSON()?.data;
    if (data?.note === 'Ordered note') {
      const response = await route.fetch();
      orderedNoteSaved();
      await orderedNoteHeld;
      await route.fulfill({ response });
    } else {
      if (data?.price === '2.35') orderedPriceRequests++;
      await route.continue();
    }
  });
  await page.route(lookupUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  const orderedNoteResponse = page.waitForResponse(response =>
    isNoteResponse(response, 'Ordered note'),
  );
  await noteInput.fill('Ordered note');
  await orderedNoteBegan;
  const orderedPriceResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card` &&
      response.request().postDataJSON()?.data?.price === '2.35',
  );
  const priceInput = matchTable.locator(`input[id="${ownedRowKey}:price"]`);
  await priceInput.fill('2.35');
  await inLists.getByRole('heading', { name: 'In your lists', exact: true }).click();
  expect(orderedPriceRequests).toBe(0);
  releaseOrderedNote();
  expect((await orderedNoteResponse).status()).toBe(201);
  expect((await orderedPriceResponse).status()).toBe(201);
  await expect(inLists.getByRole('alert')).toBeVisible();
  await expect(noteInput).toHaveValue('Ordered note');
  await expect(priceInput).toHaveValue('2.35');
  const [orderedRow] =
    await sql`SELECT note, price FROM collection_card WHERE collection_id=${listIds[0]}
    AND variant_id=${variant.variantId} AND foil=true AND condition=2 AND language='FR'`;
  expect(orderedRow).toMatchObject({ note: 'Ordered note', price: '2.35' });
  await page.unroute(putUrl);
  await page.unroute(lookupUrl);
  await inLists.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(inLists.getByRole('alert')).toHaveCount(0);

  // Removing a zero-quantity secondary row uses its full tuple and refreshes the lookup.
  const clearedResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card`,
  );
  await matchTable.locator(`input[id="${ownedRowKey}:amount2"]`).fill('');
  expect((await clearedResponse).status()).toBe(201);
  const [clearedMatch] = await sql`SELECT amount, amount2, price FROM collection_card
    WHERE collection_id=${listIds[0]} AND variant_id=${variant.variantId} AND foil=true AND language='FR'`;
  expect(clearedMatch).toMatchObject({ amount: 11, amount2: null, price: '2.35' });
  const secondaryKey = `${listIds[0]}:${card.cardId}:${variant.variantId}:false:3:DE`;
  const standardKey = `${listIds[0]}:${card.cardId}:${standardVariant.variantId}:false:1:EN`;
  let removalStarted = () => {};
  let releaseRemoval = () => {};
  const removalBegan = new Promise<void>(resolve => {
    removalStarted = resolve;
  });
  const removalHeld = new Promise<void>(resolve => {
    releaseRemoval = resolve;
  });
  await page.route(putUrl, async route => {
    if (route.request().postDataJSON()?.data?.amount2 === 0) {
      removalStarted();
      await removalHeld;
    }
    await route.continue();
  });
  const removeResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card`,
  );
  await matchTable.locator(`input[id="${secondaryKey}:amount2"]`).fill('0');
  await removalBegan;
  const standardNoteResponse = page.waitForResponse(response =>
    isNoteResponse(response, 'Signed copy'),
  );
  await matchTable.locator(`input[id="${standardKey}:note"]`).fill('Signed copy');
  releaseRemoval();
  expect((await removeResponse).status()).toBe(201);
  await expect(matchTable.locator('tbody tr')).toHaveCount(2);
  expect((await standardNoteResponse).status()).toBe(201);
  await expect(matchTable.locator(`input[id="${standardKey}:note"]`)).toHaveValue('Signed copy');
  await page.unroute(putUrl);
  const [removedMatch] = await sql`SELECT count(*)::int AS count FROM collection_card
    WHERE collection_id=${listIds[0]} AND variant_id=${variant.variantId} AND foil=false AND language='DE'`;
  expect(removedMatch.count).toBe(0);

  await chooseList(page, titles[0]);
  // Select the tuple of the existing English row rather than the remembered French language.
  await section.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'EN - English' }).click();
  await section.getByLabel('Amount', { exact: true }).fill('2');
  await submit(page);
  await expect(matchTable.locator(`input[id="${standardKey}:amount"]`)).toHaveValue('6');
  const [preservedNote] =
    await sql`SELECT note FROM collection_card WHERE collection_id=${listIds[0]}
    AND variant_id=${standardVariant.variantId} AND foil=false AND condition=1 AND language='EN'`;
  expect(preservedNote.note).toBe('Signed copy');

  await page.route(lookupUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  await inLists.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(inLists.getByRole('alert')).toContainText('Unable to check this card');
  await expect(matchTable.locator('tbody tr')).toHaveCount(2);
  await page.unroute(lookupUrl);
  await inLists.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(inLists.getByRole('alert')).toHaveCount(0);
  const checkedRequests = lookupRequests.length;
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expect(inLists).toHaveCount(0);
  await openVariants(page);
  await expect(matchTable.locator('tbody tr')).toHaveCount(2);
  expect(lookupRequests).toHaveLength(checkedRequests);

  // A row deleted elsewhere returns a friendly 404 and disappears after the lookup refresh.
  await sql`DELETE FROM collection_card WHERE collection_id=${listIds[0]}
    AND variant_id=${standardVariant.variantId} AND foil=false AND condition=1 AND language='EN'`;
  await sql`UPDATE collection SET updated_at=now() WHERE id=${listIds[0]}`;
  const staleEdit = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[0]}/card`,
  );
  await matchTable.locator(`input[id="${standardKey}:note"]`).fill('Deleted in another tab');
  expect((await staleEdit).status()).toBe(404);
  await expect(
    page.getByText('This card is no longer in this list.', { exact: false }),
  ).toBeVisible();
  await expect(matchTable.locator('tbody tr')).toHaveCount(1);
  console.log(
    'PASS: click-gated lookup, all variants/list types, edits/removal, notes during delayed saves, blank-note preservation, tab drafts, stale rows and retry.',
  );

  // Restore the remembered destination expected by the remaining addition scenarios.
  await chooseList(page, titles[2]);
  await section.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'FR - French' }).click();
  await page.goto(`${origin}/cards/detail/${nextCard.cardId}`);
  await openVariants(page);
  await expect(
    inLists.getByRole('button', { name: 'Check in my lists', exact: true }),
  ).toBeVisible();
  await expect(inLists.getByRole('table')).toHaveCount(0);
  await expect(section.getByLabel('Destination list')).toContainText(titles[2]);
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByLabel('Condition', { exact: true })).toContainText('NM');
  await page.reload();
  await openVariants(page);
  await expect(section.getByLabel('Destination list')).toContainText(titles[2]);
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await section.getByLabel('Amount', { exact: true }).fill('1.5');
  await expect(section.getByText('Enter a whole number from 1 to 1000.')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await section.getByLabel('Amount', { exact: true }).fill('1001');
  await expect(section.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await section.getByLabel('Amount', { exact: true }).fill('1');
  console.log(
    'PASS: collection, wantlist, card list, remembered destination across cards/reloads and quantity validation.',
  );

  await page.goto(`${origin}/cards/detail/${modernCard.cardId}`);
  await openVariants(page);
  await page
    .getByRole('button', {
      name: `${modernStandard.variantName} · JTL #${modernStandard.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section.getByLabel('Foil', { exact: true })).not.toBeChecked();
  await section.getByLabel('Amount', { exact: true }).fill('2');
  await section.getByLabel('Note', { exact: true }).fill('Modern variant draft');
  await page
    .getByRole('button', {
      name: `${modernFoil.variantName} · JTL #${modernFoil.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section.getByLabel('Foil', { exact: true })).toBeChecked();
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Modern variant draft');
  await submit(page);
  const [modernRow] =
    await sql`SELECT variant_id, foil, amount FROM collection_card WHERE collection_id=${listIds[2]} AND card_id=${modernCard.cardId} AND variant_id=${modernFoil.variantId}`;
  expect(modernRow).toMatchObject({ variant_id: modernFoil.variantId, foil: true, amount: 2 });
  await expect(section.getByLabel('Foil', { exact: true })).toBeChecked();
  await page
    .getByRole('button', {
      name: `${modernStandard.variantName} · JTL #${modernStandard.cardNo}`,
      exact: true,
    })
    .click();
  await expect(section.getByLabel('Foil', { exact: true })).not.toBeChecked();
  await submit(page);
  await expect(section.getByLabel('Foil', { exact: true })).not.toBeChecked();
  await page.goto(`${origin}/cards/detail/${nextCard.cardId}`);
  await openVariants(page);
  console.log(
    'PASS: older-set foil choices survive variant changes; modern foil defaults and submitted variants remain correct after resets.',
  );

  const priceListing = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === `/api/user/${ownerId}/collection` &&
      new URL(response.url()).searchParams.get('includeEntityPrices') === 'true',
  );
  await page.locator('a[href="/collections/your"]').first().click();
  expect((await priceListing).status()).toBe(200);
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  const createdTitle = 'Created after browsing a card';
  await page.getByRole('dialog').getByPlaceholder('Title', { exact: true }).fill(createdTitle);
  const createdResponse = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/collection',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
  const created = await (await createdResponse).json();
  listIds.push(created.data[0].id);
  await expect(page.getByRole('heading', { name: createdTitle, exact: true })).toBeVisible();
  const listingCaches = await page.evaluate(async userId => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    return queryClient
      .getQueriesData({ queryKey: ['collections', userId] })
      .map(([, data]: [unknown, { collections: { title: string }[] }]) => ({
        titles: data.collections.map(collection => collection.title),
        pricesPresent: 'entityPrices' in data,
      }));
  }, ownerId);
  expect(listingCaches).toHaveLength(2);
  for (const listing of listingCaches) {
    expect(listing.titles).toContain(createdTitle);
    expect(listing.pricesPresent).toBe(true);
  }
  await page.goto(`${origin}/cards/detail/${nextCard.cardId}`);
  await openVariants(page);
  console.log(
    'PASS: card-detail listing does not suppress price-inclusive listing; creation updates both cached listings.',
  );

  const failingPost = '**/api/collection/*/card';
  await page.route(failingPost, route =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Please try again later' }),
        })
      : route.continue(),
  );
  await section.getByLabel('Note', { exact: true }).fill('Keep this note');
  await section.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Please try again later', { exact: false })).toBeVisible();
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Keep this note');
  await page.unroute(failingPost);
  await submit(page);

  await page.goto(`${origin}/collections/${listIds[0]}?modalCardId=${nextCard.cardId}`);
  await openVariants(page);
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Add to list' })).toBeVisible();
  await expect(page.locator('main').getByText(card.name, { exact: true }).first()).toBeVisible();
  await chooseList(page, titles[1]);
  await submit(page);
  await inLists.getByRole('button', { name: 'Check in my lists', exact: true }).click();
  const modalMatch = inLists.getByRole('group', { name: titles[1], exact: true });
  await expect(modalMatch.getByLabel('Quantity', { exact: true })).toHaveValue('1');
  const modalEditResponse = page.waitForResponse(
    response =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/collection/${listIds[1]}/card`,
  );
  await modalMatch.getByLabel('Quantity', { exact: true }).fill('2');
  expect((await modalEditResponse).status()).toBe(201);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByText(nextCard.name, { exact: true })).toHaveCount(0);
  const [otherListCard] =
    await sql`SELECT amount FROM collection_card WHERE collection_id=${listIds[1]} AND card_id=${nextCard.cardId}`;
  expect(otherListCard.amount).toBe(2);
  console.log(
    'PASS: failed addition preserves inputs and adding in a modal does not change another list on screen.',
  );

  await page.goto(`${origin}/cards/detail/${nextCard.cardId}`);
  await openVariants(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => localStorage.setItem('vite-ui-theme', value), theme);
    await page.reload();
    await openVariants(page);
    await inLists.getByRole('button', { name: 'Check in my lists', exact: true }).click();
    await expect(inLists.getByRole('table').first()).toBeVisible();
    for (const width of [1440, 1430, 1024, 768, 430, 412, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await expect(section.getByLabel('Destination list')).toBeVisible();
      const dimensions = await section.evaluate(element => ({
        body: document.body.scrollWidth,
        viewport: innerWidth,
        form: element.clientWidth,
        content: element.scrollWidth,
      }));
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.form).toBeGreaterThan(240);
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.form + 1);
      if (width >= 412) {
        expect(
          (await section.getByLabel('Note', { exact: true }).boundingBox())!.width,
        ).toBeGreaterThanOrEqual(120);
      }
      await section.screenshot({ path: `${screenshots}/${theme}-${width}.png` });
      await inLists.screenshot({ path: `${screenshots}/${theme}-in-lists-${width}.png` });
      if (width === 1440 || width === 1430) {
        const title = await section
          .getByRole('heading', { name: 'Add to list', exact: true })
          .boundingBox();
        const description = await section
          .getByText('The selected variant will be added:', { exact: false })
          .boundingBox();
        expect(description!.x).toBeGreaterThan(title!.x + title!.width);
        const amount = await section.getByLabel('Amount', { exact: true }).boundingBox();
        const destination = await section.getByLabel('Destination list').boundingBox();
        expect(amount!.x + amount!.width).toBeLessThan(destination!.x);
        const language = await section.getByLabel('Language', { exact: true }).boundingBox();
        const condition = await section.getByLabel('Condition', { exact: true }).boundingBox();
        const foil = await section.getByLabel('Foil', { exact: true }).boundingBox();
        const note = await section.getByLabel('Note', { exact: true }).boundingBox();
        expect(condition!.y).toBeCloseTo(language!.y, 0);
        expect(note!.y).toBeCloseTo(language!.y, 0);
        expect(foil!.y).toBeGreaterThanOrEqual(language!.y);
        expect(foil!.y + foil!.height).toBeLessThanOrEqual(language!.y + language!.height);
      }
      if ([1440, 430, 320].includes(width)) {
        await section.getByLabel('Destination list').click();
        await expect(
          page.getByRole('combobox', { name: 'Search lists', exact: true }),
        ).toBeVisible();
        expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width + 1);
        await page.getByRole('listbox').screenshot({
          path: `${screenshots}/${theme}-list-picker-${width}.png`,
        });
        await page.keyboard.press('Escape');
      }
    }
  }

  await page.evaluate(
    id => localStorage.setItem(`swubase:card-detail:last-list:${id}`, 'deleted-list-id'),
    ownerId,
  );
  await page.reload();
  await openVariants(page);
  await expect(section.getByLabel('Destination list')).toContainText('Select a list...');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await signIn(page.context(), otherId);
  await page.reload();
  await openVariants(page);
  await expect(section.getByLabel('Destination list')).toContainText('Select a list...');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('EN');
  await chooseList(page, titles[3]);
  await section.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'ES - Spanish' }).click();
  await signIn(page.context(), ownerId);
  await page.reload();
  await openVariants(page);
  await expect(section.getByLabel('Destination list')).toContainText('Select a list...');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await page.evaluate(
    id => localStorage.setItem(`swubase:card-detail:last-language:${id}`, 'invalid-language'),
    ownerId,
  );
  await page.reload();
  await expect(section.getByLabel('Language', { exact: true })).toContainText('EN');

  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('swubase:card-detail:')) throw new Error('Storage unavailable');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('swubase:card-detail:')) throw new Error('Storage unavailable');
      setItem.call(this, key, value);
    };
  });
  await page.reload();
  await openVariants(page);
  await expect(section.getByLabel('Language', { exact: true })).toContainText('EN');
  await chooseList(page, titles[2]);
  await section.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'FR - French' }).click();
  await submit(page);
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');

  const listUrl = `**/api/user/${ownerId}/collection*`;
  await page.route(listUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  // Exercise a background refresh independently of card mutations, which only mark list metadata stale.
  await page.evaluate(async userId => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    void queryClient.refetchQueries({ queryKey: ['collections', userId], type: 'active' });
  }, ownerId);
  await fillCardDetails(page, '2');
  await section.getByLabel('Note', { exact: true }).fill('Keep during background refresh failure');
  await expect(section.getByRole('alert')).toHaveText('Unable to refresh your lists.');
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue(
    'Keep during background refresh failure',
  );
  await expect(section.getByLabel('Amount', { exact: true })).toHaveValue('2');
  await expect(section.getByLabel('Language', { exact: true })).toContainText('FR');
  await expect(section.getByLabel('Condition', { exact: true })).toContainText('EX');
  await expect(section.getByLabel('Foil', { exact: true })).toBeChecked();
  await expect(section.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
  await expect(section.getByLabel('Destination list')).toContainText(titles[2]);
  await submit(page);
  const [cachedListAddition] = await sql`SELECT amount, note FROM collection_card
    WHERE collection_id=${listIds[2]} AND card_id=${nextCard.cardId} AND foil=true AND condition=2 AND language='FR'`;
  expect(cachedListAddition).toMatchObject({
    amount: 2,
    note: 'Keep during background refresh failure',
  });
  await section.getByLabel('Note', { exact: true }).fill('Keep during manual retry');
  await expect(section.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  await page.unroute(listUrl);
  await section.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(section.getByRole('alert')).toHaveCount(0);
  await expect(section.getByLabel('Note', { exact: true })).toHaveValue('Keep during manual retry');
  await submit(page);
  console.log(
    'PASS: background list-fetch failure keeps the form, selected list and all entered values available.',
  );

  let releaseList = () => {};
  const blockedList = new Promise<void>(resolve => {
    releaseList = resolve;
  });
  await page.route(listUrl, async route => {
    await blockedList;
    await route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openVariants(page);
  await expect(section.getByRole('status')).toHaveText('Loading your lists...');
  releaseList();
  await expect(section.getByLabel('Destination list')).toBeVisible();
  await page.unroute(listUrl);
  await page.route(listUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  await page.reload();
  await openVariants(page);
  await expect(section.getByRole('alert')).toHaveText('Unable to load your lists.');
  await page.unroute(listUrl);
  await section.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(section.getByLabel('Destination list')).toBeVisible();
  console.log('PASS: unavailable browser storage, loading and list-fetch failure/retry.');

  const emptyPage = await pageFor(emptyId);
  await emptyPage.goto(`${origin}/cards/detail/${card.cardId}`);
  await openVariants(emptyPage);
  await expect(
    emptyPage.getByText('You don’t have any lists yet.', { exact: false }),
  ).toBeVisible();
  const emptyLookup = emptyPage.getByRole('region', { name: 'Card in my lists' });
  await emptyPage.route(lookupUrl, route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  await emptyLookup.getByRole('button', { name: 'Check in my lists', exact: true }).click();
  await expect(emptyLookup.getByRole('alert')).toContainText('Unable to check this card');
  await expect(emptyLookup.getByRole('table')).toHaveCount(0);
  await emptyPage.unroute(lookupUrl);
  await emptyLookup.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(emptyLookup.getByRole('status')).toHaveText('This card isn’t in any of your lists.');
  await expect(
    emptyPage
      .getByRole('region', { name: 'Add to list' })
      .getByRole('link', { name: 'wantlist', exact: true }),
  ).toHaveAttribute('href', '/wantlists/your');
  const anonymous = await pageFor();
  await anonymous.goto(`${origin}/cards/detail/${card.cardId}`);
  await openVariants(anonymous);
  await expect(anonymous.getByRole('button', { name: 'Sign in to add cards' })).toBeVisible();
  await expect(anonymous.getByLabel('Destination list')).toHaveCount(0);
  await expect(
    anonymous
      .getByRole('region', { name: 'Card in my lists' })
      .getByRole('button', { name: 'Check in my lists', exact: true }),
  ).toBeVisible();
  expect(
    (await anonymous.request.get(`${origin}/api/collection/card/${card.cardId}`)).status(),
  ).toBe(401);
  await anonymous
    .getByRole('region', { name: 'Card in my lists' })
    .getByRole('button', { name: 'Check in my lists', exact: true })
    .click();
  await expect(
    anonymous.getByRole('dialog').getByRole('heading', { name: 'Sign In', exact: true }),
  ).toBeVisible();
  const otherPage = await pageFor(otherId);
  await otherPage.goto(`${origin}/cards/detail/${card.cardId}`);
  await openVariants(otherPage);
  const otherLookup = otherPage.getByRole('region', { name: 'Card in my lists' });
  await otherLookup.getByRole('button', { name: 'Check in my lists', exact: true }).click();
  await expect(otherLookup.getByRole('link', { name: titles[3], exact: true })).toBeVisible();
  for (const title of titles.slice(0, 3)) {
    await expect(otherLookup.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  }
  const isolatedKeys = await otherPage.evaluate(async () => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    return queryClient
      .getQueriesData({ queryKey: ['card-in-lists'] })
      .map(([key]: [readonly unknown[], unknown]) => key);
  });
  expect(isolatedKeys).toEqual([['card-in-lists', otherId, card.cardId]]);
  expect(
    (
      await anonymous.request.post(`${origin}/api/collection/${listIds[0]}/card`, {
        data: {
          cardId: card.cardId,
          variantId: variant.variantId,
          foil: false,
          condition: 1,
          language: 'EN',
          amount: 1,
        },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await emptyPage.request.post(`${origin}/api/collection/${listIds[0]}/card`, {
        data: {
          cardId: card.cardId,
          variantId: variant.variantId,
          foil: false,
          condition: 1,
          language: 'EN',
          amount: 1,
        },
      })
    ).status(),
  ).toBe(401);
  expect(errors).toEqual([]);
  expect(adminPriceRequests).toEqual([]);
  console.log(
    'PASS: responsive light/dark layout, deleted selections, account isolation, empty lists and anonymous/non-owner authorization.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await sql`DELETE FROM collection_card WHERE collection_id IN ${sql(listIds)}`;
  await sql`DELETE FROM collection WHERE id IN ${sql(listIds)}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql([ownerId, otherId, emptyId])}`;
  await sql.end();
}
