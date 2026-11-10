// COLLECTION_IMPORT_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/collection-import.browser.ts
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

if (process.env.COLLECTION_IMPORT_BROWSER_TEST !== '1')
  throw Error('Opt in to the local browser test.');
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw Error('Use an isolated worktree.');
const sql = postgres(database.href, { max: 1 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const userId = `collection-import-${crypto.randomUUID()}`;
const sessionToken = crypto.randomUUID();
const csv =
  'Set,CardNumber,Count,IsFoil,Stamp,Note\r\nHMW,313,2,False,,first\r\nHMW,313,1,False,,second\r\nSEC,571,3,True,,\r\nSEC,571m,1,True,,\r\nUNKNOWN,001,2,True,Judge,"Original, details"\r\nHMWP,16,1,False,,';
try {
  await page.goto(`${origin}/collections/import`);
  await expect(page.getByText('You must be logged in to view this page.')).toBeVisible();
  await sql`insert into "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at) values (${userId}, 'Import Browser Tester', ${userId}, ${userId + '@invalid.local'}, true, 'USD', 'user', now(), now())`;
  await sql`insert into session (id, token, user_id, expires_at, created_at, updated_at) values (${crypto.randomUUID()}, ${sessionToken}, ${userId}, now() + interval '1 hour', now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, sessionToken, process.env.BETTER_AUTH_SECRET!)
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
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Import from SWUDB', exact: true })).toBeVisible();
  const dismissCookies = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismissCookies.isVisible()) await dismissCookies.click();
  await expect(page.getByLabel('Destination', { exact: true })).toHaveValue('');
  await page.getByLabel('New collection name', { exact: true }).fill('CSV browser acceptance');
  await page.getByLabel('CSV file', { exact: true }).setInputFiles({
    name: 'too-large.csv',
    mimeType: 'text/csv',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(
    page.getByRole('button', { name: 'Import and review results', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Choose a CSV smaller than 2 MiB.');
  await page
    .getByLabel('CSV file', { exact: true })
    .setInputFiles({ name: 'acceptance.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByLabel('CSV contents', { exact: true })).toHaveValue(
    csv.replaceAll('\r\n', '\n'),
  );
  await page.getByLabel('CSV contents', { exact: true }).fill(csv + '\n');
  await page.getByRole('button', { name: 'Import and review results', exact: true }).click();
  await expect(page).toHaveURL(/\/collections\/[^/]+\/imports\/[^/]+$/);
  const reportUrl = page.url();
  const collectionId = new URL(reportUrl).pathname.split('/')[2];
  expect(
    (await sql`select file_name from collection_import where collection_id=${collectionId}`)[0]
      ?.file_name,
  ).toBeNull();
  await expect(page.getByRole('heading', { name: 'Review import', exact: true })).toBeVisible();
  await expect(page.getByTestId('import-row-2')).toBeVisible();
  await expect(page.getByTestId('import-row-3')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rows for review', exact: true })).toBeVisible();
  await expect(page.getByTestId('import-row-2')).toContainText('2 + 1');
  expect((await page.getByTestId('import-row-2').boundingBox())!.height).toBeLessThan(100);
  await expect(
    page.getByTestId('import-row-2').getByRole('button', { name: /^Preview / }),
  ).toBeVisible();
  await page.getByTestId('import-row-2').getByRole('button', { name: '2 source rows' }).click();
  await expect(page.getByTestId('import-source-row-2')).toContainText('first');
  await expect(page.getByTestId('import-source-row-3')).toContainText('second');
  await page.getByTestId('import-row-2').getByRole('button', { name: '2 source rows' }).click();
  await expect(page.getByTestId('import-row-6')).toContainText('Original, details');
  await expect(page.getByTestId('import-row-5')).toContainText('571m');
  await expect(
    page.getByTestId('import-row-5').getByRole('link', { name: 'View card' }),
  ).toHaveAttribute('href', 'https://swudb.com/card/SEC/571m');
  await expect(
    page.getByTestId('import-row-6').getByRole('link', { name: 'View card' }),
  ).toHaveAttribute('href', 'https://swudb.com/card/UNKNOWN/001');
  const cards =
    await sql`select card_id,amount from collection_card where collection_id=${collectionId}`;
  expect(cards).toHaveLength(2);
  expect(cards.some(row => row.card_id === 'keeper-of-skara-nal--awoken')).toBe(false);
  expect(cards.find(row => row.card_id === 'bardottan-ornithopter')).toBeUndefined();
  await page
    .getByTestId('import-row-2')
    .getByRole('button', { name: 'Skip without adding' })
    .click();
  await expect(page.getByTestId('import-row-2')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('import-row-6')).toBeVisible();
  await expect(page.getByTestId('import-row-2')).toHaveCount(0);
  await page.getByLabel('Show', { exact: true }).selectOption('all');
  await expect(
    page.getByTestId('import-row-2').getByRole('button', { name: 'Reopen' }),
  ).toBeVisible();
  await page.route('**/api/collection/*/imports/*/rows/*', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary test failure' }),
    }),
  );
  await page.getByTestId('import-row-2').getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Temporary test failure' })).toBeVisible();
  await expect(
    page.getByTestId('import-row-2').getByRole('button', { name: 'Reopen' }),
  ).toBeVisible();
  await page.unroute('**/api/collection/*/imports/*/rows/*');
  await page.getByTestId('import-row-2').getByRole('button', { name: 'Reopen' }).click();
  await expect(
    page.getByTestId('import-row-2').getByRole('button', { name: 'Skip without adding' }),
  ).toBeVisible();
  const duplicateRow = page.getByTestId('import-row-2');
  await mkdir('.swubase/collection-import', { recursive: true });
  await page.screenshot({
    path: '.swubase/collection-import/review-desktop-pending.png',
    fullPage: true,
  });
  await duplicateRow.getByRole('spinbutton', { name: 'Final count for CSV lines 2, 3' }).fill('4');
  await page.route('**/resolve-duplicate', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Save test failure' }),
    }),
  );
  await duplicateRow.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(duplicateRow.getByRole('alert')).toContainText('Save test failure');
  expect(
    (
      await sql`select count(*)::int as count from collection_card where collection_id=${collectionId} and card_id='keeper-of-skara-nal--awoken'`
    )[0].count,
  ).toBe(0);
  await duplicateRow.getByRole('button', { name: 'Skip without adding' }).click();
  await expect(duplicateRow.getByRole('button', { name: 'Reopen' })).toBeVisible();
  await expect(duplicateRow.getByRole('alert')).toHaveCount(0);
  await duplicateRow.getByRole('button', { name: 'Reopen' }).click();
  await expect(duplicateRow.getByRole('button', { name: 'Skip without adding' })).toBeVisible();
  await page.unroute('**/resolve-duplicate');
  // Another tab saves while this page still has an editable count. A 409 must
  // refresh the report and display the saved value without another manual reload.
  await page.route('**/resolve-duplicate', async route => {
    const saved = await route.fetch();
    expect(saved.status()).toBe(200);
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'This group has already been saved.' }),
    });
  });
  await duplicateRow.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(duplicateRow).toContainText('4 added');
  await expect(duplicateRow.getByRole('alert')).toHaveCount(0);
  await page.unroute('**/resolve-duplicate');
  expect(
    (
      await sql`select amount from collection_card where collection_id=${collectionId} and card_id='keeper-of-skara-nal--awoken'`
    )[0].amount,
  ).toBe(4);
  await page.reload();
  await expect(duplicateRow).toHaveCount(0);
  await page.getByLabel('Show', { exact: true }).selectOption('all');
  await expect(duplicateRow).toContainText('4 added');
  await expect(duplicateRow.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  const floating = page.getByRole('complementary', { name: 'Add cards while reviewing' });
  await floating.getByRole('combobox').fill('Bardottan Ornithopter');
  await page.getByRole('option').filter({ hasText: 'Bardottan Ornithopter' }).click();
  await floating.getByLabel('Quantity', { exact: true }).fill('2');
  await floating.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        (
          await sql`select sum(amount) as amount from collection_card where collection_id=${collectionId} and card_id='bardottan-ornithopter'`
        )[0].amount,
      ),
    )
    .toBe(2);
  await floating.getByRole('button', { name: 'Collapse', exact: true }).click();
  await expect(floating.getByRole('combobox')).toHaveCount(0);
  await floating.getByRole('button', { name: 'Expand', exact: true }).click();
  await floating.getByRole('button', { name: 'Card number', exact: true }).click();
  await floating.getByLabel('Card set', { exact: true }).selectOption('sor');
  await floating.getByLabel('Card number', { exact: true }).fill('1');
  if (await floating.getByLabel('Choose matching card').isVisible()) {
    await floating.getByLabel('Choose matching card').selectOption({ index: 1 });
  }
  await expect(floating.getByLabel('Printing to add')).toBeVisible();
  await floating.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        (
          await sql`select sum(amount) as amount from collection_card where collection_id=${collectionId}`
        )[0].amount,
      ),
    )
    .toBe(11);
  await expect(floating.getByLabel('Card number', { exact: true })).toHaveValue('');
  await expect(floating.getByLabel('Card set', { exact: true })).toHaveValue('sor');
  await floating.getByLabel('Card set', { exact: true }).selectOption('sec');
  await floating.getByLabel('Card number', { exact: true }).fill('571');
  await expect(floating.getByLabel('Choose matching card')).toBeVisible();
  await expect(floating.getByRole('button', { name: 'Add card', exact: true })).toBeDisabled();
  await floating
    .getByLabel('Choose matching card')
    .selectOption({ label: 'Bardottan Ornithopter · Standard Foil' });
  await expect(floating.getByLabel('Foil', { exact: true })).toBeChecked();
  await expect(floating.getByRole('button', { name: 'Add card', exact: true })).toBeEnabled();
  await floating.getByRole('button', { name: 'Name', exact: true }).click();
  await mkdir('.swubase/collection-import', { recursive: true });
  await page.screenshot({ path: '.swubase/collection-import/review-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await dismissCookies.isVisible()) await dismissCookies.click();
  await floating.getByRole('button', { name: 'Collapse', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Rows for review', exact: true })
    .scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  await expect.poll(async () => (await floating.boundingBox())!.y).toBeLessThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.swubase/collection-import/review-mobile.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.toggle('dark'));
  // Wait for the table's color transition before inspecting the light theme.
  const foreground = await page.evaluate(() => getComputedStyle(document.body).color);
  await expect
    .poll(() => duplicateRow.evaluate(row => getComputedStyle(row).color))
    .toBe(foreground);
  await page.screenshot({ path: '.swubase/collection-import/review-theme.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('link', { name: 'Import history', exact: true }).click();
  await expect(page.getByLabel('Destination', { exact: true })).toHaveValue(collectionId);
  await expect(page.getByRole('link').filter({ hasText: 'Pasted CSV' })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'Pasted CSV' })).toContainText(
    '8 copies imported',
  );
  await page.getByLabel('CSV contents', { exact: true }).fill('SOR,001,1,False');
  await page.getByRole('button', { name: 'Import and review results', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All rows imported' })).toBeVisible();
  expect(new URL(page.url()).pathname.split('/')[2]).toBe(collectionId);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'All rows imported' })).toBeVisible();
  // Leave through the collection and resume the older, still unfinished import.
  await page.getByRole('link', { name: 'View collection', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Unfinished import reviews' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Continue import review', exact: true }),
  ).toHaveAttribute('href', new URL(reportUrl).pathname);
  await page.reload();
  await page.getByRole('link', { name: 'Continue import review', exact: true }).click();
  await expect(page).toHaveURL(reportUrl);
  await expect(page.getByTestId('import-row-6')).toBeVisible();
  await page.getByTestId('import-row-5').getByRole('button', { name: 'Mark completed' }).click();
  await page.getByTestId('import-row-6').getByRole('button', { name: 'Mark completed' }).click();
  await page.getByRole('link', { name: 'View collection', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Unfinished import reviews' })).toHaveCount(0);
  await page.goto(reportUrl);
  await page.getByLabel('Show', { exact: true }).selectOption('completed');
  await expect(page.getByTestId('import-row-2')).toContainText('4 added');
  await page.getByTestId('import-row-5').getByRole('button', { name: 'Reopen' }).click();
  await page.getByRole('link', { name: 'View collection', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Continue import review', exact: true }),
  ).toBeVisible();
  await sql`insert into collection_import (id, collection_id, request_hash, headers, total_rows, imported_rows, imported_copies, problem_rows, created_at, file_name)
    select gen_random_uuid(), ${collectionId}, 'browser-history', '[]'::jsonb, 0, 0, 0, 0, now() + n * interval '1 millisecond', 'History ' || n from generate_series(1, 105) as n`;
  await page.getByRole('link', { name: 'Imports & review', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'More imports', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Import history pages' })).toContainText(
    'Page 2',
  );
  await page.getByRole('button', { name: 'Previous imports', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Import history pages' })).toContainText(
    'Page 1',
  );
  expect(errors).toEqual([]);
  console.log(
    'Browser acceptance passed: grouped compact rows, source details, card previews, final-count saves, completion/reopen, floating card entry, error handling, history, and mobile layout.',
  );
} finally {
  await context.close();
  await browser.close();
  await sql`delete from collection_card where collection_id in (select id from collection where user_id=${userId})`;
  await sql`delete from collection where user_id=${userId}`;
  await sql`delete from session where user_id=${userId}`;
  await sql`delete from "user" where id=${userId}`;
  await sql.end();
}
