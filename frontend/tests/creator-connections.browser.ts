// CREATOR_CONNECTIONS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-connections.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_CONNECTIONS_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable explicitly against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Use a development origin.');
const sql = postgres(database.toString(), { max: 2 });
const userId = `connections-${randomUUID()}`,
  otherId = `connections-${randomUUID()}`,
  token = randomUUID();
const deckIds = [randomUUID(), randomUUID(), randomUUID()];
const tournamentIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const pagingIds = Array.from({ length: 25 }, () => randomUUID());
const pagingName = `Connection paging ${userId.slice(-8)}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitor = await browser.newContext();
const page = await context.newPage(),
  publicPage = await visitor.newPage();
page.setDefaultTimeout(20_000);
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
for (const current of [page, publicPage]) {
  current.on('pageerror', error => errors.push(error.message));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
const screenshots = new URL('../../.swubase/connection-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const api = `${origin}/api/creator-hub`;
const section = page.getByRole('region', { name: 'Connect to SWUBASE', exact: true });
const type = (name: string) =>
  section
    .getByRole('group', { name: 'Connection type' })
    .getByRole('button', { name, exact: true })
    .click();
const connected = section.locator('[data-connection]');
try {
  for (const id of [userId, otherId])
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency) VALUES (${id}, 'Connection writer', ${id + '@invalid.local'}, false, now(), now(), ${'Writer ' + id.slice(-8)}, 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  for (let i = 0; i < deckIds.length; i++) {
    await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id) VALUES (${deckIds[i]}, ${i === 2 ? otherId : userId}, 1, ${['Connection Sabine deck', 'Connection private deck', 'Connection other deck'][i]}, ${i === 1 ? 0 : 1}, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${deckIds[i]})`;
  }
  const [local] = await sql`SELECT id FROM tournament_type WHERE major = 0 LIMIT 1`;
  for (let i = 0; i < tournamentIds.length; i++)
    await sql`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,days,date) VALUES (${tournamentIds[i]},${userId},${local.id},'Paris','Europe',${['Connection Open · Next week', 'Connection Open · Last week', 'Connection Open · Maybe', 'Connection Other saved event'][i]},32,1,1,CURRENT_DATE + ${[7, -7, -14, -21][i]}::int)`;
  for (const [i, id] of pagingIds.entries())
    await sql`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,days,date) VALUES (${id},${userId},${local.id},'Paris','Europe',${pagingName + ' ' + i},32,1,1,CURRENT_DATE - ${100 + i}::int)`;
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
  for (const [i, status] of ['going', 'saved', 'maybe'].entries()) {
    expect(
      (
        await page.request.put(`${origin}/api/user-tournament-saves/${tournamentIds[i]}`, {
          data: { status },
        })
      ).ok(),
    ).toBe(true);
  }
  await sql`INSERT INTO user_tournament_save (user_id, tournament_id, status) VALUES (${otherId}, ${tournamentIds[3]}, 'saved')`;
  await page.goto(`${origin}/creator-studio`);
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A guide to the next event');
  await page
    .getByLabel('Summary', { exact: true })
    .fill('Cards, decks and the events where we play them.');
  await page
    .locator('[contenteditable=true]')
    .first()
    .fill('Start with a plan and a deck you know.');
  const search = section.getByRole('combobox');
  await search.fill('Battlefield Marine');
  await page.getByRole('option').filter({ hasText: 'Battlefield Marine' }).first().click();
  await expect(connected).toHaveCount(1);
  await search.fill('Battlefield Marine');
  await page.getByRole('option').filter({ hasText: 'Battlefield Marine' }).first().click();
  await expect(connected).toHaveCount(1);
  await expect(section.getByRole('status')).toContainText('already added');
  await type('Leader');
  await section.getByRole('button', { name: 'Choose leader', exact: true }).focus();
  await page.keyboard.press('Enter');
  const leaderDialog = page.getByRole('dialog');
  await expect(leaderDialog.getByRole('heading', { name: 'Select a leader' })).toBeVisible();
  await leaderDialog.getByPlaceholder('Search', { exact: true }).fill('Sabine Wren');
  await leaderDialog.getByAltText('card-sabine-wren--galvanized-revolutionary').first().click();
  await leaderDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(connected).toHaveCount(2);
  await type('Base');
  await section.getByRole('button', { name: 'Choose base', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByPlaceholder('Search', { exact: true }).fill('Command Center');
  await page.getByRole('dialog').getByAltText('card-command-center').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(connected).toHaveCount(3);
  // Inspecting card/leader/base details must not navigate away or discard edits.
  const browserDialogs: string[] = [];
  page.on('dialog', async dialog => {
    browserDialogs.push(dialog.message());
    await dialog.dismiss();
  });
  for (const [kind, cardId] of [
    ['card', 'battlefield-marine'],
    ['leader', 'sabine-wren--galvanized-revolutionary'],
    ['base', 'command-center'],
  ]) {
    await page.getByLabel('Summary', { exact: true }).fill(`Unsaved ${kind} inspection`);
    const url = page.url();
    const open = section
      .locator(`[data-connection="${kind}:${cardId}"]`)
      .getByRole('button', { name: /^Open details:/ });
    await open.focus();
    await page.keyboard.press('Enter');
    const detail = page.getByRole('dialog', { name: /^Card details:/ });
    await expect(detail.getByRole('tab', { name: 'Card Details', exact: true })).toBeVisible();
    await detail.getByRole('tab', { name: /^Variants/ }).click();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
    await open.click();
    await expect(detail.getByRole('tab', { name: 'Card Details', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Escape');
    expect(page.url()).toBe(url);
    await expect(page.getByLabel('Summary', { exact: true })).toHaveValue(
      `Unsaved ${kind} inspection`,
    );
  }
  expect(browserDialogs).toEqual([]);
  await type('Deck');
  await section.getByLabel('Your public decks').fill('Connection');
  const deck = section.getByRole('button', {
    name: 'Connect deck: Connection Sabine deck',
    exact: true,
  });
  await expect(deck).toBeVisible();
  await expect(section.getByText('Connection other deck', { exact: true })).toHaveCount(0);
  await expect(section.getByText('Connection private deck', { exact: true })).toHaveCount(0);
  await section
    .getByRole('button', { name: 'View decklist: Connection Sabine deck', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(connected).toHaveCount(3);
  await deck.click();
  await expect(connected).toHaveCount(4);
  await expect(section.locator(`[data-connection="deck:${deckIds[0]}"]`)).toContainText(
    'Connection Sabine deck',
  );
  await type('Tournament');
  await expect(section.getByRole('tab', { name: 'My tournaments', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(section.getByRole('button', { name: /^Connect tournament:/ })).toHaveCount(3);
  await expect(section.getByText('Connection Other saved event', { exact: true })).toHaveCount(0);
  await expect(section.getByRole('button', { name: /^Connect tournament:/ }).first()).toContainText(
    'Next week',
  );
  await section.getByRole('tab', { name: 'All tournaments', exact: true }).click();
  await section.getByLabel('Find a tournament').fill(pagingName);
  await expect(section.getByRole('button', { name: /^Connect tournament:/ })).toHaveCount(12);
  await section.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(section.getByRole('button', { name: /^Connect tournament:/ })).toHaveCount(24);
  await section.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(section.getByRole('button', { name: /^Connect tournament:/ })).toHaveCount(25);
  await expect(section.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
  await section.getByLabel('Find a tournament').fill('Connection Open');
  const events = section.getByRole('button', { name: /^Connect tournament:/ });
  await expect(events).toHaveCount(3);
  await expect(events.first()).toContainText('Next week');
  await expect(events.first().locator('time')).toBeVisible();
  await expect(events.first()).toContainText('Upcoming');
  await expect(events.first()).toHaveAccessibleDescription(/Upcoming.*Paris/);
  let resolving = false;
  let releaseResolve: (() => void) | undefined;
  let finishResolve: (() => void) | undefined;
  const resolveFinished = new Promise<void>(resolve => {
    finishResolve = resolve;
  });
  await context.route(
    '**/api/creator-hub/subjects/resolve',
    async route => {
      resolving = true;
      await new Promise<void>(resolve => {
        releaseResolve = resolve;
      });
      await route.continue();
      finishResolve?.();
    },
    { times: 1 },
  );
  await events.first().click();
  await expect.poll(() => resolving).toBe(true);
  expect(await section.locator(`[data-connection="deck:${deckIds[0]}"]`).textContent()).toContain(
    'Connection Sabine deck',
  );
  releaseResolve?.();
  await resolveFinished;
  await type('Set');
  await section.getByLabel('Find a set').fill('Spark of Rebellion');
  await section
    .getByRole('button', { name: 'Connect set: Spark of Rebellion', exact: true })
    .click();
  await expect(connected).toHaveCount(6);
  await expect(section.getByText('Connection unavailable', { exact: true })).toHaveCount(0);
  for (const art of await connected.locator('img').all()) {
    await expect(art).toBeVisible();
    await expect
      .poll(() => art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
  // Each saved entity opens from inside its box in a new tab.
  for (const [kind, entityId] of [
    ['deck', deckIds[0]],
    ['tournament', tournamentIds[0]],
  ]) {
    const link = section.locator(`[data-connection="${kind}:${entityId}"]`).getByRole('link');
    await expect(link).toHaveAttribute('target', '_blank');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForURL(`${origin}/${kind === 'deck' ? 'decks' : 'tournaments'}/${entityId}`);
    await popup.close();
    await expect(connected).toHaveCount(6);
  }
  await type('Tournament');
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (
      !(await page.locator('html').evaluate((el, value) => el.classList.contains(value), theme))
    ) {
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1800 });
      await section.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      if (width === 1440) {
        const boxes = await connected.evaluateAll(elements =>
          elements.slice(0, 3).map(el => ({
            top: el.getBoundingClientRect().top,
            left: el.getBoundingClientRect().left,
            width: el.getBoundingClientRect().width,
          })),
        );
        expect(new Set(boxes.map(box => Math.round(box.top))).size).toBe(1);
        expect(boxes[0].left).toBeLessThan(boxes[1].left);
        expect(boxes[1].left).toBeLessThan(boxes[2].left);
        expect(boxes[0].width).toBeLessThan(340);
      }
      await section.screenshot({
        path: `${screenshots}/connections-${width}-${theme}.png`,
        style: '.sticky { position: static !important; }',
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  const article = (await (await page.request.get(`${api}/personal/articles`)).json()).data.items[0];
  await page.goto(`${origin}/creator-studio?creationId=${article.id}`);
  await expect(connected).toHaveCount(6);
  await expect(section.getByText('Connection Sabine deck', { exact: true })).toBeVisible();
  await expect(section.getByText('Connection Open · Next week', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('link', { name: /Connection Sabine deck/ })).toBeVisible();
  await expect(
    page
      .getByRole('link', { name: /^Open details: tournament Connection Open · Next week/ })
      .locator('time'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await publicPage.goto(`${origin}/content/${article.id}`);
  await expect(publicPage.getByRole('link', { name: /Connection Sabine deck/ })).toHaveAttribute(
    'target',
    '_blank',
  );
  await publicPage.getByRole('button', { name: /^Open details: card Battlefield Marine/ }).click();
  await expect(publicPage.getByRole('dialog', { name: /^Card details:/ })).toBeVisible();
  await publicPage.keyboard.press('Escape');
  await expect(
    publicPage
      .getByRole('link', { name: /^Open details: tournament Connection Open · Next week/ })
      .locator('time'),
  ).toBeVisible();
  const set = section.locator('[data-connection="set:sor"]');
  await set.getByRole('button', { name: /^Remove/ }).click();
  await expect(connected).toHaveCount(5);
  // Explicit failure and empty states; removing a connection must remain possible.
  await type('Tournament');
  await section.getByLabel('Find a tournament').fill('No matching connection fixture anywhere');
  await expect(section.getByText('No saved tournaments match this name.')).toBeVisible();
  await section.getByRole('tab', { name: 'All tournaments', exact: true }).click();
  await expect(section.getByText('No matches found. Try another name.')).toBeVisible();
  await context.route('**/api/creator-hub/subjects?*', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"message":"Fixture unavailable"}',
    }),
  );
  await section.getByLabel('Find a tournament').fill('Connection Open failure');
  await expect(section.getByRole('alert')).toContainText('Could not load choices');
  await context.unroute('**/api/creator-hub/subjects?*');
  await section.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(section.getByText('No matches found. Try another name.')).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Connection selection, owned decks, future dates, save/reload, preview/public cards, removal, error/empty states and responsive themes passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM tournament WHERE id IN ${sql([...tournamentIds, ...pagingIds])}`;
  await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck WHERE id IN ${sql(deckIds)}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql([userId, otherId])}`;
  await sql.end();
}
