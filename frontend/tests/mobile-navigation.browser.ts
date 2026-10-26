// MOBILE_NAVIGATION_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/mobile-navigation.browser.ts
import { chromium, expect as baseExpect, type BrowserContext } from 'playwright/test';
import postgres from 'postgres';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.MOBILE_NAVIGATION_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
) {
  throw new Error('Enable mobile navigation tests against an isolated worktree database.');
}
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 1 });
const userId = crypto.randomUUID();
const deckId = crypto.randomUUID();
const screenshots = new URL('../../.swubase/mobile-navigation-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
});
await context.route('**/*amplitude*', route => route.abort());
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const tabs = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
const more = tabs.getByRole('button', { name: 'More', exact: true });
const menu = page.getByRole('dialog', { name: 'More on SWUBASE', exact: true });
const notice = page.getByRole('region', { name: 'Cookie notice' });

async function authenticate(target: BrowserContext) {
  const token = crypto.randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await target.clearCookies();
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

async function expectShellFits() {
  const tabBox = (await tabs.boundingBox())!;
  const mainBox = (await page.locator('main').boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(Math.abs(tabBox.y + tabBox.height - height)).toBeLessThan(2);
  expect(mainBox.y + mainBox.height).toBeLessThanOrEqual(tabBox.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of await tabs.locator('a,button').all()) {
    const box = (await control.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    await expect
      .poll(() =>
        control.evaluate(el => {
          const b = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
        }),
      )
      .toBe(true);
  }
}

async function capture(name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshots}/${name}.png`, animations: 'disabled' });
}

try {
  await page.goto(origin);
  await expect(tabs).toBeVisible();
  await expect(tabs.locator('a,button')).toHaveText(['Home', 'Meta', 'Decks', 'Cards', 'More']);
  await expect(notice).toBeVisible();
  await expectShellFits();
  const noticeBox = (await notice.boundingBox())!;
  const tabBox = (await tabs.boundingBox())!;
  expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(tabBox.y + 1);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expectShellFits();
    const cookieBounds = (await notice.boundingBox())!;
    expect(cookieBounds.y + cookieBounds.height).toBeLessThanOrEqual(
      (await tabs.boundingBox())!.y + 1,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // A first-time visitor can still open More and sign in while the notice is visible.
  await more.click();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('animation-name', 'none');
  await expect(menu.locator('a[href="/decks/favorite"]')).toHaveCount(0);
  const tournamentShortcuts = menu.getByRole('list', { name: 'Tournaments shortcuts', exact: true });
  await expect(
    tournamentShortcuts.getByRole('link', { name: 'Planetary Qualifiers', exact: true }),
  ).toBeVisible();
  await expect(
    tournamentShortcuts.getByRole('link', { name: 'Tournament map', exact: true }),
  ).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Tournament map', exact: true })).toHaveCount(1);
  await menu.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sign In', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  await capture('home-cookie');
  await notice.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(notice).toBeHidden();
  await capture('home-light');

  for (const [label, path] of [
    ['Meta', '/meta'],
    ['Decks', '/decks/public'],
    ['Cards', '/cards/search'],
  ] as const) {
    await tabs.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
    await expect(tabs.locator('[aria-current="page"]')).toHaveText(label);
    await expectShellFits();
  }
  await page.goBack();
  await expect(tabs.locator('[aria-current="page"]')).toHaveText('Decks');
  await page.goto(`${origin}/cards/search?name=Luke`);
  await expect(page.getByRole('heading', { name: /Search Results/ })).toBeVisible();
  const resultsViewport = page.locator('main [data-radix-scroll-area-viewport]:visible').last();
  await expect(resultsViewport).toBeVisible();
  expect((await resultsViewport.boundingBox())!.height).toBeLessThan(
    (await page.locator('main').boundingBox())!.height,
  );
  await page.reload();
  await expect(tabs.locator('[aria-current="page"]')).toHaveText('Cards');
  await tabs.getByRole('link', { name: 'Meta', exact: true }).click();
  await capture('meta-light');
  await more.click();
  await menu.getByRole('link', { name: 'Tournaments', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/tournaments(?:\/featured)?(\?|$)/);
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(tabs.locator('[aria-current="page"]')).toHaveCount(0);
  for (const [label, path] of [
    ['Planetary Qualifiers', '/tournaments/planetary-qualifiers'],
    ['Tournament map', '/tournaments/map'],
  ]) {
    await more.click();
    await tournamentShortcuts.getByRole('link', { name: label, exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
  }

  // The 1024px transition uses the same breakpoint in CSS and the sidebar state.
  for (const width of [1024, 1023, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    if (width >= 1024) {
      await expect(tabs).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    } else {
      await expect(tabs).toBeVisible();
      await expectShellFits();
    }
  }
  await more.click();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(menu).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(more).toHaveAttribute('aria-expanded', 'false');

  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role)
    VALUES (${userId}, 'Mobile navigation', ${userId + '@invalid.local'}, false, now(), now(), ${'Mobile navigation ' + userId}, 'USD', 'user')`;
  await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
    VALUES (${deckId}, ${userId}, 1, 'Mobile navigation fixture', 0, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
  await authenticate(context);
  await page.goto(`${origin}/decks/your`);
  await expect(
    page.locator('header.mobile-navigation').getByRole('link', { name: 'My profile' }),
  ).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Decks' })).toHaveAttribute('href', '/decks/your');
  await page
    .getByRole('checkbox', { name: 'Select Mobile navigation fixture', exact: true })
    .check();
  const selection = page.getByRole('region', { name: 'Selected decks', exact: true });
  await expect(selection).toBeVisible();
  const selectionBox = (await selection.boundingBox())!;
  expect(selectionBox.y + selectionBox.height).toBeLessThan((await tabs.boundingBox())!.y);
  await expectShellFits();
  // The offset follows the notice's actual height, including when consent is still pending.
  await page.evaluate(() => localStorage.removeItem('cookie-consent'));
  await page.reload();
  await page
    .getByRole('checkbox', { name: 'Select Mobile navigation fixture', exact: true })
    .check();
  await expect(notice).toBeVisible();
  const selectionWithCookie = (await selection.boundingBox())!;
  expect(selectionWithCookie.y + selectionWithCookie.height).toBeLessThan(
    (await notice.boundingBox())!.y,
  );
  await expectShellFits();
  await notice.getByRole('button', { name: 'Accept', exact: true }).click();
  await selection.getByRole('button', { name: 'Clear selection' }).click();
  await more.click();
  await expect(menu.getByRole('link', { name: 'Your collections', exact: true })).toBeVisible();
  for (const [list, shortcut] of [
    ['Your collections', 'Public collections'],
    ['Your wantlists', 'Public wantlists'],
  ]) {
    await expect(menu.getByRole('link', { name: shortcut, exact: true })).toHaveCount(1);
    await expect(
      menu
        .getByRole('list', { name: `${list} shortcuts`, exact: true })
        .getByRole('link', { name: shortcut, exact: true }),
    ).toBeVisible();
  }
  await expect(menu.getByRole('link', { name: 'Crossfire', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('link', { name: /Creators/ })).toHaveCount(0);
  await menu.getByRole('button', { name: 'Add Deck', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Build a deck' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/settings(\?|$)/);

  await page.goto(`${origin}/messages`);
  await expect(page.getByRole('heading', { name: 'Conversations', exact: true })).toBeVisible();
  await expectShellFits();

  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto(`${origin}/decks/${deckId}/edit?deckbuilder=true`);
  const filters = page.getByRole('region', { name: 'Card search filters', exact: true });
  await expect(filters).toBeVisible();
  expect((await filters.boundingBox())!.height).toBeLessThan(
    (await page.locator('main').boundingBox())!.height,
  );
  await expectShellFits();
  await page.setViewportSize({ width: 390, height: 844 });

  await sql`UPDATE "user" SET role = 'user,admin,crossfire' WHERE id = ${userId}`;
  await authenticate(context);
  await page.goto(origin);
  await more.click();
  await expect(menu.getByRole('link', { name: 'Crossfire', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Creators', exact: true })).toBeVisible();
  await expect(menu.locator('a[href="/decks/favorite"]')).toHaveCount(0);
  await expect(menu.getByRole('link', { name: 'Tournament map', exact: true })).toHaveCount(1);
  await expect(
    tournamentShortcuts.getByRole('link', { name: 'Your calendar', exact: true }),
  ).toBeVisible();
  await capture('more-signed-in');

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    // Crossing the breakpoint closes the modal; remaining mobile keeps it open.
    if (!(await menu.isVisible())) await more.click();
    const box = (await menu.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    const navigation = menu.getByRole('navigation', { name: 'More navigation' });
    expect(await navigation.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await menu.getByRole('link', { name: 'Open comparer' }).scrollIntoViewIfNeeded();
    await expect(menu.getByRole('link', { name: 'Open comparer' })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
    await expectShellFits();
  }

  // Immersive game/replay routes retain their own full-screen shell, even on error/loading views.
  await page.evaluate(() => localStorage.removeItem('cookie-consent'));
  await page.goto(`${origin}/crossfire/replay/${crypto.randomUUID()}`);
  await expect(tabs).toHaveCount(0);
  await expect(page.locator('header.mobile-navigation')).toHaveCount(0);
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page.getByRole('link', { name: 'Back to Crossfire', exact: true }).click();
  await expect(tabs).toBeVisible();
  await expect(notice).toBeHidden();
  await page.goBack();
  await expect(tabs).toHaveCount(0);
  await expect(notice).toBeHidden();
  await page.evaluate(() => localStorage.setItem('cookie-consent', 'true'));

  await context.clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await expect(
    page.locator('header.mobile-navigation').getByRole('button', { name: 'Sign in' }),
  ).toBeVisible();
  await more.click();
  await capture('more-light');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    localStorage.setItem('vite-ui-theme', 'dark');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await capture('home-dark');
  await more.click();
  await capture('more-dark');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(tabs).toBeHidden();
  await capture('desktop-dark');
  expect(errors).toEqual([]);
  console.log(
    'Mobile tabs, cookie clearance and dismissal, floating selection panels, card-search/deckbuilder sizing, route history, nested dialogs, account navigation, role gates, responsive menus, messenger, immersive routes, and both themes passed.',
  );
} catch (error) {
  await capture('failure').catch(() => {});
  console.error('Browser errors:', errors, 'Page:', page.url());
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM deck_information WHERE deck_id = ${deckId}`;
  await sql`DELETE FROM deck WHERE id = ${deckId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
