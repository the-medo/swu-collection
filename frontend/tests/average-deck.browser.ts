// Opt-in acceptance test against a running, isolated worktree; fixtures are removed in finally.
// AVERAGE_DECK_TEST=1 bun --env-file=.env.worktree frontend/tests/average-deck.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.AVERAGE_DECK_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Explicitly enable this test against a running isolated worktree.');

const sql = postgres(database.toString(), { max: 2 });
const expect = baseExpect.configure({ timeout: 20_000 });
const userId = crypto.randomUUID();
const token = crypto.randomUUID();
const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(20_000);
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, 'Average deck fixture', ${`${userId}@invalid.local`}, false, now(), now(), ${userId}, 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  for (const [index, id] of ids.entries()) {
    await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
      VALUES (${id}, ${userId}, 1, ${`Average fixture ${index}`}, 0, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity)
      VALUES (${id}, 'battlefield-marine', 1, ${index === 1 ? 2 : 3})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${id}, 'resupply', 2, 1)`;
  }
  await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES
    (${ids[0]!}, 'overwhelming-barrage', 1, 1), (${ids[0]!}, 'battlefield-marine', 2, 1)`;
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
  await context.addInitScript(ids => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', 'light');
    localStorage.setItem(
      'swu-comparer-state',
      JSON.stringify({
        mode: 'intersection',
        mainId: ids[0],
        entries: ids.map((id, i) => ({
          id,
          dataType: 'deck',
          additionalData: { title: `Average fixture ${i}` },
        })),
        settings: { viewMode: 'row_deck', groupBy: 'card-type', diffDisplayMode: 'count_and_diff' },
      }),
    );
  }, ids);
  await page.goto(`${origin}/comparer`);
  const launcher = page.getByRole('complementary', { name: 'Combine these decks' });
  await expect(launcher).toBeVisible();
  await expect(launcher.locator('img')).toHaveCount(3);
  await expect(
    launcher.locator('img[alt="card-sabine-wren--galvanized-revolutionary"]'),
  ).toBeVisible();
  await expect(launcher.locator('img[alt="card-battlefield-marine"]')).toBeVisible();
  await expect(launcher.locator('img[alt="card-resupply"]')).toBeVisible();
  await expect(async () => {
    expect(
      await launcher
        .locator('img')
        .evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)),
    ).toBe(true);
  }).toPass();
  await expect(
    page.getByRole('group', { name: 'Comparison settings', exact: true }).getByRole('switch'),
  ).toHaveCount(0);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(async () => {
    const tableBox = await page
      .getByRole('region', { name: 'Deck comparison table' })
      .boundingBox();
    const launcherBox = await launcher.boundingBox();
    expect(tableBox).not.toBeNull();
    expect(launcherBox).not.toBeNull();
    expect(launcherBox!.x).toBeGreaterThanOrEqual(tableBox!.x + tableBox!.width);
  }).toPass({ timeout: 20_000 });
  await page.screenshot({
    path: '.swubase/average-deck-launcher-light.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({
    path: '.swubase/average-deck-launcher-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(launcher).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '.swubase/average-deck-launcher-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Start combining', exact: true }).focus();
  await page.keyboard.press('Enter');
  const marine = page.getByRole('spinbutton', {
    name: 'Deck count for Battlefield Marine (main deck)',
    exact: true,
  });
  await expect(marine).toHaveValue('3');
  await expect(
    page.getByRole('spinbutton', { name: 'Deck count for Resupply (sideboard)' }),
  ).toHaveValue('1');
  await expect(page.getByRole('combobox', { name: 'Board for Resupply (sideboard)' })).toHaveValue(
    '2',
  );
  await expect(
    page.getByRole('spinbutton', { name: 'Deck count for Overwhelming Barrage (main deck)' }),
  ).toHaveValue('1');
  await expect(
    page.getByRole('combobox', { name: 'Board for Overwhelming Barrage (main deck)' }),
  ).toHaveValue('3');
  await expect(page.getByRole('button', { name: /View mode:/ })).toBeDisabled();
  const headers = await page.locator('thead th').allTextContents();
  expect(headers.slice(-2)).toEqual(['Average', 'Deck count']);
  const sidebar = page.getByRole('complementary', { name: 'Create combined deck' });
  await expect(sidebar).toContainText('Created as unlisted');
  await expect(sidebar.getByRole('heading', { name: 'Combined deck', exact: true })).toBeFocused();
  const deckName = sidebar.getByRole('textbox', { name: 'Deck name' });
  await expect(deckName).toHaveValue(
    'Comparer combined deck - Sabine Wren, Galvanized Revolutionary - Command Center',
  );
  await expect(
    sidebar.getByRole('button', { name: 'Choose leader', exact: true }).getByRole('img'),
  ).toBeVisible();
  await expect(
    sidebar.getByRole('button', { name: 'Choose base', exact: true }).getByRole('img'),
  ).toBeVisible();
  await sidebar.getByRole('button', { name: 'Choose leader', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await sidebar.getByRole('button', { name: 'Choose base', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(deckName).toHaveValue(
    'Comparer combined deck - Sabine Wren, Galvanized Revolutionary - Base',
  );
  await sidebar.getByRole('button', { name: 'Choose base', exact: true }).click();
  await page.getByRole('dialog').getByPlaceholder('Search', { exact: true }).fill('Command Center');
  // The historical fixture base is outside the current Premier rotation.
  await page.getByRole('dialog').getByRole('switch', { name: 'Premier only' }).uncheck();
  await page
    .getByRole('dialog')
    .getByRole('img', { name: 'card-command-center', exact: true })
    .first()
    .dblclick();
  await expect(deckName).toHaveValue(
    'Comparer combined deck - Sabine Wren, Galvanized Revolutionary - Command Center',
  );

  await marine.fill('1.5');
  await expect(sidebar.getByRole('button', { name: 'Create deck', exact: true })).toBeDisabled();
  await expect(sidebar.getByRole('alert')).toContainText('whole numbers');
  await marine.fill('3');
  await page
    .getByRole('combobox', { name: 'Board for Battlefield Marine (main deck)', exact: true })
    .selectOption('3');
  await page.getByRole('button', { name: /Group by:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Trait', exact: true }).click();
  const repeatedMarine = page.getByRole('spinbutton', {
    name: 'Deck count for Battlefield Marine (main deck)',
    exact: true,
  });
  await expect(repeatedMarine).toHaveCount(2);
  await repeatedMarine.first().fill('2');
  for (const input of await repeatedMarine.all()) await expect(input).toHaveValue('2');
  await repeatedMarine.first().fill('3');
  await page.getByRole('button', { name: /Group by:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Card Type', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Deck count for Overwhelming Barrage (main deck)' })
    .fill('0');
  await sidebar.getByRole('textbox', { name: 'Deck name' }).fill('Average acceptance deck');
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).click();
  await expect(page.getByRole('button', { name: /View mode:/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start combining', exact: true })).toBeFocused();
  await expect(page.getByRole('columnheader', { name: 'Deck count', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start combining', exact: true }).click();
  await expect(marine).toHaveValue('3');
  await expect(
    page.getByRole('combobox', { name: 'Board for Battlefield Marine (main deck)', exact: true }),
  ).toHaveValue('3');
  await expect(
    page.getByRole('spinbutton', { name: 'Deck count for Overwhelming Barrage (main deck)' }),
  ).toHaveValue('0');
  await expect(sidebar.getByRole('textbox', { name: 'Deck name' })).toHaveValue(
    'Average acceptance deck',
  );
  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    const widths = await page
      .locator('thead th')
      .evaluateAll(cells => cells.slice(1, -2).map(cell => cell.getBoundingClientRect().width));
    expect(widths).toHaveLength(3);
    widths.forEach(width => expect(width).toBeLessThanOrEqual(100.1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.swubase/average-deck-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: '.swubase/average-deck-dark.png', fullPage: true });
  await page.route(
    '**/api/deck/from-list',
    async route => {
      await route.fulfill({
        status: 429,
        json: { message: 'Please wait 30 seconds before creating another deck.' },
      });
    },
    { times: 1 },
  );
  await sidebar.getByRole('button', { name: 'Create deck', exact: true }).click();
  await expect(sidebar.getByRole('alert')).toContainText('Please wait 30 seconds');
  await expect(marine).toHaveValue('3');
  await expect(sidebar.getByRole('button', { name: 'Create deck', exact: true })).toBeEnabled();
  const createdResponse = page.waitForResponse(
    response =>
      response.url().endsWith('/api/deck/from-list') && response.request().method() === 'POST',
  );
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>(resolve => {
    releaseResponse = resolve;
  });
  let markCreated!: () => void;
  const requestCreated = new Promise<void>(resolve => {
    markCreated = resolve;
  });
  await page.route(
    '**/api/deck/from-list',
    async route => {
      const response = await route.fetch();
      markCreated();
      await responseGate;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await sidebar.getByRole('button', { name: 'Create deck', exact: true }).click();
  await requestCreated;
  // Closing the editor while saving must still notify and open the created deck.
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).click();
  releaseResponse();
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  const created = (await response.json()).data;
  await expect(page).toHaveURL(new RegExp(`/decks/${created.id}`));
  expect(created).toMatchObject({
    userId,
    public: 2,
    name: 'Average acceptance deck',
    leaderCardId1: 'sabine-wren--galvanized-revolutionary',
    baseCardId: 'command-center',
  });
  const rows =
    await sql`SELECT card_id, board, quantity FROM deck_card WHERE deck_id = ${created.id} ORDER BY card_id, board`;
  expect(Array.from(rows)).toEqual([
    { card_id: 'battlefield-marine', board: 3, quantity: 4 },
    { card_id: 'resupply', board: 2, quantity: 1 },
  ]);
  const anonymous = await browser.newContext();
  try {
    const detail = await anonymous.request.get(`${origin}/api/deck/${created.id}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).deck.public).toBe(2);
    const contents = await anonymous.request.get(`${origin}/api/deck/${created.id}/card`);
    expect(contents.status()).toBe(200);
    expect((await contents.json()).data).toHaveLength(2);
    const discovery = await anonymous.request.get(`${origin}/api/deck?userId=${userId}`);
    expect(discovery.status()).toBe(200);
    expect((await discovery.json()).data).toEqual([]);
  } finally {
    await anonymous.close();
  }
  const retry = await page.request.post(`${origin}/api/deck/from-list`, {
    data: {
      leaderCardId: created.leaderCardId1,
      baseCardId: created.baseCardId,
      cards: {},
    },
  });
  expect(retry.status()).toBe(429);
  expect(Number(retry.headers()['retry-after'])).toBeGreaterThan(0);
  await page.goto(`${origin}/comparer`);
  await page.getByRole('button', { name: 'Start combining', exact: true }).click();
  for (const index of [2, 1]) {
    await page
      .getByRole('button', { name: `Actions for Average fixture ${index}`, exact: true })
      .click();
    await page.getByRole('button', { name: 'Remove from comparer', exact: true }).click();
  }
  await expect(page.getByRole('complementary', { name: 'Create combined deck' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /View mode:/ })).toBeEnabled();
  expect(errors).toEqual([]);
  console.log(
    'PASS: launcher artwork, average defaults, integer validation, board merging, selectors, responsive column widths, unlisted creation and access, navigation, and cooldown.',
  );
} catch (error) {
  await page.screenshot({ path: '.swubase/average-deck-failure.png', fullPage: true });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  const decks = await sql`SELECT id FROM deck WHERE user_id = ${userId}`;
  const cleanupIds = decks.map(row => row.id);
  if (cleanupIds.length) {
    await sql`DELETE FROM deck_card WHERE deck_id IN ${sql(cleanupIds)}`;
    await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(cleanupIds)}`;
    await sql`DELETE FROM deck WHERE id IN ${sql(cleanupIds)}`;
  }
  await sql`DELETE FROM session WHERE user_id = ${userId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
