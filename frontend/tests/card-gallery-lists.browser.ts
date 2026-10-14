// CARD_GALLERY_LIST_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-gallery-lists.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { cardList } from '../../server/db/lists.ts';
import { indexCardPrintings } from '../../shared/lib/cardGroupPrintings.ts';
import { getSetPrintings } from '../src/components/app/cards/CardHome/cardHomeLib.ts';
import { SwuSet } from '../../types/enums.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_GALLERY_LIST_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Use an isolated development worktree.');
const expect = baseExpect.configure({ timeout: 20_000 });
const sql = postgres(database.toString(), { max: 2 });
const owner = `gallery-owner-${randomUUID()}`;
const other = `gallery-other-${randomUUID()}`;
const listIds = Array.from({ length: 4 }, () => randomUUID());
const titles = [
  'Gallery collection',
  'Gallery wantlist',
  'Gallery card list',
  'Someone else’s list',
];
const groupId = randomUUID();
const card = Object.values(cardList).find(
  card =>
    card?.type !== 'Leader' &&
    Object.values(card?.variants ?? {}).some(
      v => v.set === 'jtl' && v.variantName === 'Standard',
    ) &&
    Object.values(card?.variants ?? {}).some(
      v => v.set === 'jtl' && v.variantName === 'Standard Foil',
    ),
)!;
const standard = Object.values(card.variants).find(
  v => v.set === 'jtl' && v.variantName === 'Standard',
)!;
const foil = Object.values(card.variants).find(
  v => v.set === 'jtl' && v.variantName === 'Standard Foil',
)!;
const leader = Object.values(cardList).find(
  card =>
    card?.type === 'Leader' &&
    Object.values(card.variants).some(v => v.set === 'hmw' && v.variantName === 'Showcase'),
)!;
const showcase = Object.values(leader.variants).find(
  v => v.set === 'hmw' && v.variantName === 'Showcase',
)!;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const anonymous = await visitor.newPage();
const errors: string[] = [];
const reads: string[] = [];
const quantityWrites: string[] = [];
const screenshots = '.swubase/card-gallery-lists-screenshots';
await mkdir(screenshots, { recursive: true });
for (const p of [page, anonymous]) {
  p.on('pageerror', error => errors.push(error.message));
  p.setDefaultTimeout(20_000);
  await p.addLocatorHandler(p.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    p.getByRole('button', { name: 'Dismiss', exact: true }).press('Enter'),
  );
}
page.on('request', request => {
  if (request.method() === 'GET' && /\/api\/collection\/[^/]+\/card$/.test(request.url()))
    reads.push(request.url());
  if (request.method() === 'PUT' && /\/api\/collection\/[^/]+\/card\/amount$/.test(request.url()))
    quantityWrites.push(request.url());
});
async function signIn(target: BrowserContext, userId: string) {
  await target.clearCookies();
  const token = randomUUID();
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${randomUUID()},${token},now()+interval '1 hour',${userId},now(),now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await target.addCookies([
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
async function chooseList(target: Page, title: string) {
  await target.getByLabel('Destination list', { exact: true }).click();
  await target.getByRole('option', { name: title, exact: true }).click();
}
const tile = (image: string) =>
  page.locator('article').filter({ has: page.locator(`img[src$="/${image}"]`) });
const quantity = (image: string) => tile(image).getByRole('group', { name: /^Quantity of / });
const rows = (listId = listIds[0]) =>
  sql`SELECT * FROM collection_card WHERE collection_id=${listId} ORDER BY variant_id,foil,condition,language`;
try {
  for (const id of [owner, other])
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency) VALUES (${id},'Gallery list test',${id + '@invalid.local'},false,now(),now(),${id},'USD')`;
  for (const [i, id] of listIds.entries())
    await sql`INSERT INTO collection (id,user_id,title,collection_type,public,updated_at) VALUES (${id},${i === 3 ? other : owner},${titles[i]},${(i % 3) + 1},${i === 3},'2000-01-01')`;
  await sql`INSERT INTO card_group (id,title,description,variant_ids,published,sort_order) VALUES (${groupId},'Gallery quantity fixture','Three exact card versions.',${sql.json([standard.variantId, foil.variantId, showcase.variantId])},true,0)`;
  await sql`INSERT INTO collection_card (collection_id,card_id,variant_id,foil,condition,language,amount,amount2,note,price) VALUES
    (${listIds[0]},${card.cardId},${standard.variantId},false,1,'EN',2,4,'Keep note',12.34),
    (${listIds[0]},${card.cardId},${standard.variantId},true,1,'EN',6,0,'Other foil',null),
    (${listIds[0]},${card.cardId},${standard.variantId},false,2,'FR',7,0,'Other language and condition',null),
    (${listIds[1]},${card.cardId},${standard.variantId},false,1,'EN',8,0,null,null)`;
  await signIn(context, owner);
  await anonymous.goto(`${origin}/cards/groups/${groupId}`);
  await expect(anonymous.getByRole('heading', { name: 'Gallery quantity fixture' })).toBeVisible();
  await expect(anonymous.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  await expect(anonymous.getByLabel('Destination list', { exact: true })).toHaveCount(0);
  await page.goto(`${origin}/cards/groups/${groupId}`);
  await expect(page.getByLabel('Destination list', { exact: true })).toBeEnabled();
  await expect(page.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  expect(reads).toEqual([]);
  await expect(
    page.getByText('EN · Near Mint · Foil follows the card version', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Info', exact: true }).hover();
  await expect(
    page.getByText('EN · Near Mint · Foil follows the card version', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Destination list', { exact: true }).click();
  for (const title of titles.slice(0, 3))
    await expect(page.getByRole('option', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: titles[3], exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: titles[0], exact: true }).click();
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '2', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    quantity(foil.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const originalUrl = page.url();
  const amountRoute = (url: URL) => url.pathname === `/api/collection/${listIds[0]}/card/amount`;
  let release = () => {};
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let writes = 0;
  await page.route(amountRoute, async route => {
    writes++;
    await gate;
    await route.continue();
  });
  const contentRoute = (url: URL) => url.pathname === `/api/collection/${listIds[0]}/card`;
  let releaseOldRead = () => {};
  const oldReadGate = new Promise<void>(resolve => {
    releaseOldRead = resolve;
  });
  let capturedOldRead = false;
  await page.route(
    contentRoute,
    async route => {
      const response = await route.fetch();
      capturedOldRead = true;
      await oldReadGate;
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'x-gallery-stale-read': 'true' },
      });
    },
    { times: 1 },
  );
  try {
    await quantity(standard.image.front).getByRole('tab', { name: '3', exact: true }).click();
    await expect(
      quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Clear list selection' })).toBeDisabled();
    await quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }).focus();
    await page.keyboard.press('Enter');
    expect(writes).toBe(1);
    await page.getByRole('link', { name: 'Card home', exact: true }).click();
    await page.goBack();
    await expect(page.getByLabel('Destination list', { exact: true })).toContainText(titles[0]!);
    await expect.poll(() => capturedOldRead).toBe(true);
  } finally {
    release();
  }
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const lateRead = page.waitForResponse(
    response => response.headers()['x-gallery-stale-read'] === 'true',
  );
  releaseOldRead();
  await (await lateRead).finished();
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.unroute(amountRoute);
  expect(page.url()).toBe(originalUrl);
  expect((await rows()).find(row => !row.foil && row.language === 'EN')).toMatchObject({
    amount: 3,
    amount2: 4,
    note: 'Keep note',
    price: '12.34',
  });
  await quantity(foil.image.front).getByRole('tab', { name: '2', exact: true }).click();
  await expect(
    quantity(foil.image.front).getByRole('tab', { name: '2', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows()).find(row => row.variant_id === foil.variantId)).toMatchObject({
    foil: true,
    language: 'EN',
    condition: 1,
    amount: 2,
  });
  await quantity(foil.image.front).getByRole('tab', { name: '0', exact: true }).click();
  await expect(
    quantity(foil.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows()).some(row => row.variant_id === foil.variantId)).toBe(false);
  await quantity(standard.image.front).getByRole('tab', { name: '0', exact: true }).click();
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows()).find(row => !row.foil && row.language === 'EN')).toMatchObject({
    amount: 0,
    amount2: 4,
    note: 'Keep note',
    price: '12.34',
  });
  expect((await rows()).find(row => row.language === 'FR')?.amount).toBe(7);
  expect((await rows()).find(row => row.foil)?.amount).toBe(6);
  await page.route(amountRoute, route =>
    route.fulfill({ status: 503, json: { message: 'Retry this quantity' } }),
  );
  await quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }).click();
  await expect(page.getByText('Error while updating the card', { exact: true })).toBeVisible();
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.unroute(amountRoute);
  await quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }).click();
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await tile(showcase.image.front)
    .getByRole('button', { name: /^Show back side/ })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${screenshots}/group-desktop.png` });
  await page.setViewportSize({ width: 320, height: 844 });
  await quantity(showcase.image.front).scrollIntoViewIfNeeded();
  const imageBox = await tile(showcase.image.front)
    .getByRole('button', { name: /^View / })
    .boundingBox();
  const controlBox = await quantity(showcase.image.front).boundingBox();
  expect(controlBox!.x).toBeGreaterThanOrEqual(imageBox!.x);
  expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(imageBox!.x + imageBox!.width);
  expect(controlBox!.y).toBeGreaterThan(imageBox!.y);
  expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(imageBox!.y + imageBox!.height);
  const targetBox = await quantity(showcase.image.front)
    .getByRole('tab', { name: '0', exact: true })
    .boundingBox();
  expect(targetBox!.width).toBeGreaterThanOrEqual(24);
  expect(targetBox!.height).toBeGreaterThanOrEqual(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('button button').count()).toBe(0);
  await page.screenshot({ path: `${screenshots}/group-mobile.png` });
  await quantity(showcase.image.front)
    .getByRole('button', { name: /^Custom quantity/ })
    .click();
  const customDialog = page.getByRole('dialog', { name: 'Custom quantity', exact: true });
  await expect(customDialog.getByLabel('Quantity', { exact: true })).toBeFocused();
  await customDialog.getByLabel('Quantity', { exact: true }).fill('12');
  await expect(customDialog.getByRole('button', { name: 'Save quantity' })).toBeEnabled();
  await page.screenshot({ path: `${screenshots}/custom-mobile.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(
    quantity(showcase.image.front).getByRole('button', { name: /^Custom quantity/ }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await chooseList(page, titles[1]!);
  await expect(
    quantity(standard.image.front).getByRole('button', { name: 'Custom quantity (8 in list)' }),
  ).toBeVisible();
  const writesBeforeFocus = quantityWrites.length;
  await tile(standard.image.front)
    .getByRole('button', { name: /^View / })
    .focus();
  await page.keyboard.press('Tab');
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toBeFocused();
  expect((await rows(listIds[1]))[0].amount).toBe(8);
  expect(quantityWrites).toHaveLength(writesBeforeFocus);
  await page.keyboard.press('Enter');
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const two = quantity(standard.image.front).getByRole('tab', { name: '2', exact: true });
  await page.keyboard.press('ArrowRight');
  await expect(two).toBeFocused();
  await page.keyboard.press('Space');
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '2', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows(listIds[1]))[0].amount).toBe(2);
  await chooseList(page, titles[2]!);
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '0', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await quantity(showcase.image.front).getByRole('tab', { name: '1', exact: true }).click();
  await expect(
    quantity(showcase.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows(listIds[2]))[0]).toMatchObject({
    variant_id: showcase.variantId,
    foil: true,
    language: 'EN',
    condition: 1,
    amount: 1,
  });
  await page.getByRole('button', { name: 'Clear list selection' }).click();
  await expect(page.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText('Select a list');
  const readsBeforeReselect = reads.filter(url => url.includes(listIds[0]!)).length;
  await chooseList(page, titles[0]!);
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect(reads.filter(url => url.includes(listIds[0]!)).length).toBe(readsBeforeReselect + 1);
  await sql`UPDATE collection_card SET amount=3 WHERE collection_id=${listIds[0]} AND variant_id=${standard.variantId} AND NOT foil AND language='EN' AND condition=1`;
  await chooseList(page, titles[0]!);
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect(reads.filter(url => url.includes(listIds[0]!)).length).toBe(readsBeforeReselect + 2);
  await tile(standard.image.front)
    .getByRole('button', { name: /^View / })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('tab', { name: /^Variants/ })
    .click();
  const addSection = page.getByRole('region', { name: 'Add to list', exact: true });
  await addSection.getByLabel('Destination list', { exact: true }).click();
  await page.getByRole('option', { name: titles[0], exact: true }).click();
  await expect(addSection.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
  await addSection.getByRole('button', { name: 'Clear list selection' }).click();
  await expect(addSection.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  expect(
    await page.evaluate(
      userId => localStorage.getItem(`swubase:card-detail:last-list:${userId}`),
      owner,
    ),
  ).toBeNull();
  await page.keyboard.press('Escape');
  await page.goto(`${origin}/cards/sets/hmw?csCategory=leaders&csVariant=showcase`);
  await chooseList(page, titles[2]!);
  await expect(
    quantity(showcase.image.front).getByRole('tab', { name: '1', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('link', { name: 'Leaders', exact: true }).click();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText(titles[2]!);
  await expect(page.getByRole('group', { name: /^Quantity of / }).first()).toBeVisible();
  await page.screenshot({ path: `${screenshots}/set-desktop.png` });
  await page.goto(`${origin}/cards/promos?promoGroup=${groupId}`);
  await chooseList(page, titles[0]!);
  const pinned = page.locator(`section[aria-labelledby="group-${groupId}"]`);
  await expect(pinned.getByRole('group', { name: /^Quantity of / })).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear list selection' }).click();
  await expect(pinned.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  // The destination survives routes and reloads, but only until five minutes after the last edit.
  const savedDestination = () =>
    page.evaluate(userId => {
      const value = localStorage.getItem(`swubase:card-gallery:destination:${userId}`);
      return value ? (JSON.parse(value) as { id: string; expiresAt: number }) : null;
    }, owner);
  expect(await savedDestination()).toBeNull();
  const startTime = Date.now();
  await page.clock.setFixedTime(startTime);
  await chooseList(page, titles[0]!);
  const firstSaved = await savedDestination();
  expect(firstSaved).toEqual({ id: listIds[0], expiresAt: startTime + 5 * 60_000 });
  await page.getByRole('link', { name: 'Card home', exact: true }).click();
  await page.getByRole('link', { name: /Promo and special cards/ }).click();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText(titles[0]!);
  expect(await savedDestination()).toEqual(firstSaved);
  await page.goto(`${origin}/cards/groups/${groupId}`);
  await expect(
    quantity(standard.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.clock.setFixedTime(startTime + 4 * 60_000);
  const more = quantity(standard.image.front).getByRole('button', { name: /^Custom quantity/ });
  await more.click();
  const input = customDialog.getByLabel('Quantity', { exact: true });
  await expect(input).toHaveValue('3');
  const readsBeforeFocus = reads.length;
  await page.evaluate(async () => {
    for (const visibilityState of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: visibilityState,
      });
      window.dispatchEvent(new Event('visibilitychange'));
    }
    Reflect.deleteProperty(document, 'visibilityState');
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  await expect(input).toBeEditable();
  expect(reads).toHaveLength(readsBeforeFocus);
  const writesBeforeCustom = quantityWrites.length;
  for (const value of ['', '-1', '1.5', '1001']) {
    await input.fill(value);
    await expect(customDialog.getByText('Enter a whole number from 0 to 1000.')).toBeVisible();
    await input.press('Enter');
  }
  expect(quantityWrites).toHaveLength(writesBeforeCustom);
  await input.fill('12');
  await page.route(amountRoute, route =>
    route.fulfill({ status: 503, json: { message: 'Try again' } }),
  );
  await customDialog.getByRole('button', { name: 'Save quantity' }).click();
  await expect(customDialog.getByRole('button', { name: 'Save quantity' })).toBeEnabled();
  await expect(input).toHaveValue('12');
  expect(await savedDestination()).toEqual(firstSaved);
  expect((await rows()).find(row => !row.foil && row.language === 'EN')?.amount).toBe(3);
  await page.unroute(amountRoute);
  await customDialog.getByRole('button', { name: 'Save quantity' }).click();
  await expect(customDialog).toHaveCount(0);
  await expect(more).toHaveText('12');
  await expect(more).toBeFocused();
  expect((await rows()).find(row => !row.foil && row.language === 'EN')).toMatchObject({
    amount: 12,
    amount2: 4,
    note: 'Keep note',
    price: '12.34',
  });
  expect(await savedDestination()).toEqual({ id: listIds[0], expiresAt: startTime + 9 * 60_000 });
  const compactBox = await quantity(standard.image.front).boundingBox();
  const fullImageBox = await tile(standard.image.front)
    .getByRole('button', { name: /^View / })
    .boundingBox();
  expect(compactBox!.width).toBeLessThan(fullImageBox!.width * 0.75);
  await page.clock.setFixedTime(startTime + 6 * 60_000);
  await page.reload();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText(titles[0]!);
  await expect(
    quantity(standard.image.front).getByRole('button', { name: 'Custom quantity (12 in list)' }),
  ).toBeVisible();
  // Keep cached card contents but make the owner-list lookup resolve after the gallery mounts.
  await page.getByRole('link', { name: 'Card home', exact: true }).click();
  await page.evaluate(async userId => {
    const modulePath = '/src/queryClient.ts';
    const { queryClient } = await import(modulePath);
    queryClient.removeQueries({ queryKey: ['collections', userId] });
  }, owner);
  await sql`UPDATE collection_card SET amount=14 WHERE collection_id=${listIds[0]} AND variant_id=${standard.variantId} AND NOT foil AND language='EN' AND condition=1`;
  await page.goBack();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText(titles[0]!);
  await expect(
    quantity(standard.image.front).getByRole('button', { name: 'Custom quantity (14 in list)' }),
  ).toBeVisible();
  await page.clock.setFixedTime(startTime + 9 * 60_000);
  await page.reload();
  await expect(page.getByLabel('Destination list', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText('Select a list');
  await expect(page.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  expect(await savedDestination()).toBeNull();
  await chooseList(page, titles[0]!);
  await page.getByRole('button', { name: 'Clear list selection' }).click();
  await page.reload();
  await expect(page.getByLabel('Destination list', { exact: true })).toContainText('Select a list');
  expect(await savedDestination()).toBeNull();
  await chooseList(page, titles[0]!);
  const printings = [...indexCardPrintings(cardList).values()];
  for (const treatment of ['standard', 'hyperspace'] as const) {
    const early = getSetPrintings(printings, SwuSet.SOR, 'all', treatment).find(
      p => p.card.type === 'Unit' && p.variant.hasFoil && p.variant.hasNonfoil,
    )!;
    await page.goto(`${origin}/cards/sets/sor?csCategory=all&csVariant=${treatment}-foil`);
    const control = quantity(early.variant.image.front);
    await expect(control).toHaveAttribute('aria-label', / — Foil$/);
    await expect(control.getByRole('tab', { name: '2', exact: true })).toBeEnabled();
    await control.getByRole('tab', { name: '2', exact: true }).click();
    await expect(control.getByRole('tab', { name: '2', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect((await rows()).find(row => row.variant_id === early.variant.variantId)).toMatchObject({
      foil: true,
      amount: 2,
    });
    await page.goto(`${origin}/cards/sets/sor?csCategory=all&csVariant=${treatment}`);
    await expect(control).toHaveAttribute('aria-label', / — Non-foil$/);
    await expect(control.getByRole('tab', { name: '0', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(control.getByRole('tab', { name: '1', exact: true })).toBeEnabled();
    await control.getByRole('tab', { name: '1', exact: true }).click();
    await expect(control.getByRole('tab', { name: '1', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.goto(`${origin}/cards/sets/sor?csCategory=all&csVariant=${treatment}-foil`);
    await expect(control.getByRole('tab', { name: '2', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await control.getByRole('button', { name: /^Custom quantity/ }).click();
    await customDialog.getByLabel('Quantity', { exact: true }).fill('6');
    await customDialog.getByRole('button', { name: 'Save quantity' }).click();
    await expect(customDialog).toHaveCount(0);
    const saved = (await rows()).filter(row => row.variant_id === early.variant.variantId);
    expect(saved.find(row => row.foil)?.amount).toBe(6);
    expect(saved.find(row => !row.foil)?.amount).toBe(1);
  }
  const hmwFoil = getSetPrintings(printings, SwuSet.HMW, 'all', 'hyperspace-foil').find(
    p => p.card.type === 'Unit' && p.variant.variantName === 'Hyperspace' && !p.variant.hasNonfoil,
  )!;
  await page.goto(`${origin}/cards/sets/hmw?csCategory=all&csVariant=hyperspace-foil`);
  await expect(quantity(hmwFoil.variant.image.front)).toHaveAttribute('aria-label', / — Foil$/);
  await expect(
    quantity(hmwFoil.variant.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toBeEnabled();
  await quantity(hmwFoil.variant.image.front).getByRole('tab', { name: '3', exact: true }).click();
  await expect(
    quantity(hmwFoil.variant.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await sql`UPDATE card_group SET variant_ids=${sql.json([hmwFoil.variant.variantId])} WHERE id=${groupId}`;
  await page.goto(`${origin}/cards/groups/${groupId}`);
  await expect(quantity(hmwFoil.variant.image.front)).toHaveAttribute('aria-label', / — Foil$/);
  await expect(
    quantity(hmwFoil.variant.image.front).getByRole('tab', { name: '3', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect((await rows()).filter(row => row.variant_id === hmwFoil.variant.variantId)).toMatchObject([
    { foil: true, amount: 3 },
  ]);
  await signIn(context, other);
  await page.reload();
  await expect(page.getByRole('group', { name: /^Quantity of / })).toHaveCount(0);
  await page.getByLabel('Destination list', { exact: true }).click();
  await expect(page.getByRole('option', { name: titles[0], exact: true })).toHaveCount(0);
  await expect(page.getByRole('option', { name: titles[3], exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Passed: optional destination, all list types, exact EN/NM/foil quantities, custom quantities and validation, preserved metadata, insert/update/remove, pending/error recovery, keyboard activation, five-minute storage renewal/expiry, list restoration/refetch races/clearing, card detail clear, tooltip, mobile controls/popover, set navigation, promo groups, and account isolation.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png` }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM collection_card WHERE collection_id IN ${sql(listIds)}`;
  await sql`DELETE FROM collection WHERE id IN ${sql(listIds)}`;
  await sql`DELETE FROM card_group WHERE id=${groupId}`;
  await sql`DELETE FROM session WHERE user_id IN (${owner},${other})`;
  await sql`DELETE FROM "user" WHERE id IN (${owner},${other})`;
  await sql.end();
}
