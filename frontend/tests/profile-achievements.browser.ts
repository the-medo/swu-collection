// USER_ACHIEVEMENTS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/profile-achievements.browser.ts
// Uses a temporary account and tournament fixtures in the isolated worktree database.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.USER_ACHIEVEMENTS_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw Error('Enable only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 1 });
const id = `achievement-browser-${crypto.randomUUID()}`;
const token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const profileUrl = `${origin}/users/${id}?userTab=calendar`;
const apiUrl = `${origin}/api/user/${id}/achievements`;
const group = page.getByRole('group', { name: 'Player achievements', exact: true });
const screenshots = new URL('../../.swubase/profile-achievements/', import.meta.url).pathname;
const events: { id: string; name: string; placement: number; attendance: number }[] = [];
const getAchievements = async () => (await (await context.request.get(apiUrl)).json()).data;
await mkdir(screenshots, { recursive: true });

try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${id}, 'Profile Champion', 'Profile Champion', ${id + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${id}, now(), now())`;
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
  await page.goto(profileUrl);
  const empty = group.getByRole('button', { name: 'Add achievement 1', exact: true });
  await expect(empty).toBeVisible();
  expect((await getAchievements()).achievementLimit).toBe(1);
  expect(await empty.evaluate(el => getComputedStyle(el).borderStyle)).toBe('dashed');
  await empty.focus();
  await page.keyboard.press('Enter');
  let dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText('Connect your Melee account to showcase your tournament results.'),
  ).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Connect Melee account' })).toHaveAttribute(
    'href',
    /page=integrations/,
  );
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(empty).toBeFocused();
  console.log('Default dashed slot, Melee prerequisite and keyboard focus passed.');

  let releaseAchievements!: () => void;
  const achievementGate = new Promise<void>(resolve => {
    releaseAchievements = resolve;
  });
  await page.route(apiUrl, async route => {
    if (route.request().method() === 'GET') await achievementGate;
    await route.continue();
  });
  try {
    await page.reload();
    await expect(page.getByLabel('Loading achievements', { exact: true })).toBeVisible();
    await page
      .getByRole('group', { name: 'Player favorites', exact: true })
      .getByRole('button', { name: 'Edit favorite aspects: Not set', exact: true })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    releaseAchievements();
    await expect(empty).toBeVisible({ timeout: 3000 });
  } finally {
    releaseAchievements();
    await page.unroute(apiUrl);
  }
  console.log('Saving favorites preserves in-flight achievement loading.');

  await sql`INSERT INTO melee_connection (user_id, melee_user_id, username, display_name) VALUES (${id}, ${crypto.randomUUID()}, ${id}, 'Profile Champion')`;
  await page.reload();
  await empty.click();
  await expect(
    page.getByRole('dialog').getByText(/No completed results with a placement yet/),
  ).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Refresh your results on the Tournaments tab.' })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Tournaments', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  for (const [index, name, type, placement, attendance, status] of [
    [0, 'Sector Qualifier · Paris 2026', 'sq', 8, 256, 4],
    [1, 'Planetary Qualifier · Lyon 2026', 'pq', 1, 96, 4],
    [2, 'Unfinished tournament', 'sq', 1, 100, 2],
  ] as const) {
    const eventId = crypto.randomUUID();
    const meleeId = 1_600_000_000 + Math.floor(Math.random() * 100_000_000) + index;
    await sql`INSERT INTO tournament (id, user_id, type, location, continent, name, attendance, melee_id, format, days, date)
      VALUES (${eventId}, ${id}, ${type}, 'Test', 'Europe', ${name}, ${attendance}, ${String(meleeId)}, 1, 2, '2026-01-02')`;
    events.push({ id: eventId, name, placement, attendance });
    await sql`INSERT INTO user_melee_tournaments (user_id, melee_id, tournament_id, melee_placement, name, date, attendance, status, refreshed_at)
      VALUES (${id}, ${meleeId}, ${eventId}, ${placement}, ${name}, '2026-01-02', ${attendance}, ${status}, now())`;
  }
  await page.goto(profileUrl);
  await empty.click();
  dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('group', { name: 'Tournament results' }).getByRole('button'),
  ).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: /Unfinished tournament/ })).toHaveCount(0);
  await dialog.getByRole('textbox', { name: 'Search achievement results' }).fill('nothing-matches');
  await expect(dialog.getByText('No matching tournament results.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Search achievement results' }).fill('Paris');
  await dialog.getByRole('button', { name: `${events[0]!.name}: #8 of 256`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  const featured = group.getByRole('button', {
    name: `Edit achievement 1: ${events[0]!.name}`,
    exact: true,
  });
  await expect(featured).toBeVisible();
  await expect(featured).toBeFocused();
  await expect(featured.getByText('#8', { exact: true })).toBeVisible();
  await expect(featured.getByText('256 players', { exact: true })).toBeVisible();
  await expect(featured.getByRole('img', { name: 'Sector Qualifier' })).toBeVisible();
  expect((await getAchievements()).achievements[0].tournamentId).toBe(events[0]!.id);
  await page.reload();
  await expect(featured).toBeVisible();
  console.log('Eligibility, searching, selection, persistence and compact result contents passed.');

  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => localStorage.setItem('vite-ui-theme', theme), theme);
    await page.reload();
    await expect(featured).toBeVisible();
    for (const width of [1440, 1100, 800, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.locator('main').evaluate(main => main.scrollWidth <= main.clientWidth + 1),
      ).toBe(true);
      const bounds = await featured.boundingBox();
      const nameRow = await page
        .getByRole('heading', { name: 'Profile Champion', exact: true })
        .locator('..')
        .boundingBox();
      expect(Math.abs(bounds!.x + bounds!.width - (nameRow!.x + nameRow!.width - 16))).toBeLessThan(
        2,
      );
      if (width === 1440) {
        const name = await page
          .getByRole('heading', { name: 'Profile Champion', exact: true })
          .boundingBox();
        expect(bounds!.x).toBeGreaterThan(name!.x + name!.width);
      }
      if (theme === 'dark' && [1440, 390].includes(width))
        await page.screenshot({
          path: `${screenshots}${width === 1440 ? 'desktop' : 'mobile'}.png`,
        });
    }
  }
  console.log('Right alignment, desktop/mobile layouts and both themes passed.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await featured.click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: `${events[1]!.name}: #1 of 96`, exact: true }).click();
  await page.route(apiUrl, route =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Please try again.' }),
        })
      : route.continue(),
  );
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Could not save achievement', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  expect((await getAchievements()).achievements[0].tournamentId).toBe(events[0]!.id);
  await page.unroute(apiUrl);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  const replacement = group.getByRole('button', {
    name: `Edit achievement 1: ${events[1]!.name}`,
    exact: true,
  });
  await expect(replacement).toBeFocused();
  await replacement.click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(empty).toBeFocused();
  expect((await getAchievements()).achievements).toEqual([]);
  console.log('Failed-save recovery, replacement, clearing and focus restoration passed.');

  await sql`UPDATE user_profile SET achievement_limit = 3 WHERE user_id = ${id}`;
  await page.reload();
  await expect(group.getByRole('button')).toHaveCount(3);
  for (const [index, event] of events.slice(0, 2).entries()) {
    await group.getByRole('button', { name: `Add achievement ${index + 1}`, exact: true }).click();
    dialog = page.getByRole('dialog');
    if (index === 1)
      await expect(dialog.getByRole('button', { name: /already showcased/ })).toBeDisabled();
    await dialog
      .getByRole('button', {
        name: `${event.name}: #${event.placement} of ${event.attendance}`,
        exact: true,
      })
      .click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      group.getByRole('button', {
        name: `Edit achievement ${index + 1}: ${event.name}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.locator('main').evaluate(main => main.scrollWidth <= main.clientWidth + 1),
    ).toBe(true);
  }
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(profileUrl);
  const publicGroup = publicPage.getByRole('group', { name: 'Player achievements', exact: true });
  await expect(publicGroup.getByRole('link')).toHaveCount(2);
  await expect(publicGroup.getByRole('button')).toHaveCount(0);
  await expect(publicGroup.getByRole('link').first()).toHaveAttribute(
    'href',
    `/tournaments/${events[0]!.id}`,
  );
  expect(
    (
      await visitor.request.patch(apiUrl, {
        data: { slot: 1, tournamentId: null },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await context.request.patch(`${origin}/api/user/swubase/achievements`, {
        data: { slot: 1, tournamentId: events[0]!.id },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.patch(apiUrl, {
        data: { slot: 1, tournamentId: events[0]!.id, achievementLimit: 99 },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(400);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/settings?page=integrations`);
  await page.getByRole('button', { name: 'Disconnect Melee', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Disconnect', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Connect Melee', exact: true })).toBeVisible();
  await page.goto(profileUrl);
  await expect(group.getByRole('button', { name: /^Add achievement/ })).toHaveCount(3);
  await publicPage.reload();
  await expect(publicGroup).toHaveCount(0);
  expect((await getAchievements()).achievements).toEqual([]);
  await visitor.close();
  expect(errors).toEqual([]);
  console.log(
    'Extra slots, duplicate prevention, public visibility, authorization and unlink cache invalidation passed.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM tournament WHERE user_id = ${id}`;
  await sql`DELETE FROM "user" WHERE id = ${id}`;
  await sql.end();
}
