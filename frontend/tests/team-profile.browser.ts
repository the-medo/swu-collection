// Opt-in acceptance test against a running isolated worktree. Fixtures are removed in finally.
// TEAM_PROFILE_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/team-profile.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const expect = baseExpect.configure({ timeout: 20_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.TEAM_PROFILE_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable this test against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 2 });
const teamId = randomUUID();
const shortcut = `profile-${teamId.slice(0, 8)}`;
const userIds = ['owner', 'member', 'visitor'].map(role => `team-profile-${role}-${randomUUID()}`);
const deckId = randomUUID();
const browser = await chromium.launch();
const contexts: BrowserContext[] = [];
const errors: string[] = [];
const screenshotDir = new URL('../../.swubase/team-statistics-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshotDir, { recursive: true });

async function pageFor(index?: number) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  contexts.push(context);
  if (index !== undefined) {
    const token = randomUUID();
    await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
      VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userIds[index]}, now(), now())`;
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
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return page;
}

function sections(page: Page) {
  return page.getByRole('navigation', { name: 'Team sections', exact: true });
}
function statistics(page: Page) {
  return page.getByRole('navigation', { name: 'Statistics sections', exact: true });
}
function statisticsLink(page: Page) {
  return page
    .getByRole('complementary', { name: 'Team sidebar' })
    .getByRole('link', { name: 'Team statistics', exact: true });
}
async function assertFits(page: Page) {
  const sizes = await page.evaluate(() => {
    const main = document.querySelector('main')!;
    return {
      body: document.body.scrollWidth,
      viewport: innerWidth,
      main: main.scrollWidth,
      mainClient: main.clientWidth,
    };
  });
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.main).toBeLessThanOrEqual(sizes.mainClient + 1);
}

try {
  for (const [index, id] of userIds.entries()) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
      VALUES (${id}, ${['Profile owner', 'Profile member', 'Profile visitor'][index]}, ${id + '@invalid.local'}, false, now(), now(), ${['Profile owner', 'Profile member', 'Profile visitor'][index]}, 'USD')`;
  }
  await sql`INSERT INTO team (id, name, shortcut, description, privacy)
    VALUES (${teamId}, 'Rogue Squadron', ${shortcut}, 'Sharing decks, preparing for tournaments, and finding our next winning line.', 'public')`;
  await sql`INSERT INTO team_member (team_id, user_id, role) VALUES (${teamId}, ${userIds[0]}, 'owner'), (${teamId}, ${userIds[1]}, 'member')`;
  await sql`INSERT INTO team_join_request (team_id, user_id, status) VALUES (${teamId}, ${userIds[2]}, 'pending')`;
  await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
    VALUES (${deckId}, ${userIds[0]}, 1, 'Team profile test deck', 1, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
  await sql`INSERT INTO team_deck (team_id, deck_id) VALUES (${teamId}, ${deckId})`;
  await sql`INSERT INTO game_result (user_id, deck_id, game_id, game_source, leader_card_id, base_card_key, opponent_leader_card_id, opponent_base_card_key, is_winner, other_data)
    VALUES (${userIds[0]}, ${deckId}, ${randomUUID()}, 'manual', 'sabine-wren--galvanized-revolutionary', '30g', 'darth-vader--dark-lord-of-the-sith', '30r', true, '{"deckInfo":{"name":"Team profile test deck","formatId":1}}')`;

  const owner = await pageFor(0);
  await owner.goto(`${origin}/teams/${shortcut}`);
  await expect(owner.getByRole('heading', { name: 'Rogue Squadron', exact: true })).toBeVisible();
  await expect(sections(owner).getByRole('link', { name: 'Decks', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(sections(owner).getByRole('link', { name: /Members/ })).toContainText('1');
  await owner.getByRole('button', { name: 'Copy invite link', exact: true }).click();
  await expect
    .poll(() => owner.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${origin}/teams/${teamId}`);
  const heading = await owner
    .getByRole('heading', { name: 'Rogue Squadron', exact: true })
    .elementHandle();
  await statisticsLink(owner).click();
  await expect(owner).toHaveURL(/statistics\/dashboard/);
  await expect(statisticsLink(owner)).toHaveAttribute('aria-current', 'page');
  await expect(owner.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  expect(await heading!.evaluate(element => element.isConnected)).toBe(true);
  await expect(
    sections(owner).getByRole('link', { name: 'Decks', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page');
  expect((await owner.request.get(`${origin}/api/game-results?teamId=${teamId}`)).status()).toBe(
    200,
  );

  await owner.goto(
    `${origin}/teams/${shortcut}/statistics?sFormatId=1&sDateRangeFrom=2025-01-01&maDisplayMode=winrate`,
  );
  await expect(owner).toHaveURL(/statistics\/dashboard/);
  await expect(owner).toHaveURL(/sFormatId=1/);
  await expect(owner).toHaveURL(/sDateRangeFrom=2025-01-01/);
  await expect(owner).toHaveURL(/maDisplayMode=winrate/);
  for (const label of [
    'Match History',
    'Decks',
    'Leader & Bases',
    'Matchups',
    'Opponent Meta',
    'Members',
    'Dashboard',
  ]) {
    await statistics(owner).getByRole('link', { name: label, exact: true }).click();
    await expect(statistics(owner).getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(owner).toHaveURL(/sFormatId=1/);
    await expect(owner).toHaveURL(/sDateRangeFrom=2025-01-01/);
    await expect(statisticsLink(owner)).toHaveAttribute('aria-current', 'page');
  }
  await statistics(owner).getByRole('link', { name: 'Match History', exact: true }).click();
  await owner.reload();
  await expect(
    statistics(owner).getByRole('link', { name: 'Match History', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await owner.goBack();
  await expect(
    statistics(owner).getByRole('link', { name: 'Dashboard', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await owner.goForward();
  await expect(
    statistics(owner).getByRole('link', { name: 'Match History', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await sections(owner)
    .getByRole('link', { name: /Members/ })
    .click();
  await expect(owner.getByText('Join Requests', { exact: true })).toBeVisible();
  await statisticsLink(owner).click();
  await expect(owner).toHaveURL(/sFormatId=1/);
  await owner.getByRole('switch', { name: 'In-team only:' }).click();
  await expect(owner).toHaveURL(/sInTeam=true/);
  await owner.getByRole('switch', { name: 'In-team only:' }).click();
  await expect(owner).not.toHaveURL(/sInTeam=/);
  console.log(
    'PASS: shared profile persists, statistics routes/filters/history/refresh and invite copy work.',
  );

  await owner.goto(`${origin}/teams/${teamId}/events`);
  await expect(owner).toHaveURL(/teamTab=events/);
  await expect(
    sections(owner).getByRole('link', { name: 'Team events', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await sections(owner).getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(owner.getByRole('button', { name: 'Save Settings', exact: true })).toBeVisible();
  await statisticsLink(owner).focus();
  await owner.keyboard.press('Enter');
  await expect(owner.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  for (const theme of ['dark', 'light']) {
    await owner.evaluate(value => localStorage.setItem('vite-ui-theme', value), theme);
    await owner.reload();
    await expect(owner.locator('html')).toHaveClass(new RegExp(theme));
    for (const width of [1440, 1100, 900, 768, 390, 320]) {
      await owner.setViewportSize({ width, height: 1100 });
      await expect(owner.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
      await assertFits(owner);
      await owner.screenshot({ path: `${screenshotDir}/${theme}-${width}.png` });
    }
  }
  await owner.setViewportSize({ width: 1100, height: 1100 });
  for (const label of [
    'Match History',
    'Decks',
    'Leader & Bases',
    'Matchups',
    'Opponent Meta',
    'Members',
  ]) {
    await statistics(owner).getByRole('link', { name: label, exact: true }).click();
    await assertFits(owner);
  }
  // These responsive components are shared with personal statistics.
  await owner.goto(`${origin}/statistics/dashboard`);
  await expect(owner.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  await expect(owner.getByRole('complementary', { name: 'Team sidebar' })).toHaveCount(0);
  await assertFits(owner);
  await owner.setViewportSize({ width: 1440, height: 1100 });
  const activity = await owner
    .getByRole('heading', { name: 'Activity', exact: true })
    .locator('..')
    .boundingBox();
  const recentLeaders = await owner
    .getByRole('region', { name: 'Recent leaders and bases' })
    .boundingBox();
  expect(activity).not.toBeNull();
  expect(recentLeaders).not.toBeNull();
  expect(recentLeaders!.x).toBeGreaterThanOrEqual(activity!.x + activity!.width);
  await owner.screenshot({ path: `${screenshotDir}/personal-desktop.png` });
  await owner.setViewportSize({ width: 1280, height: 1100 });
  await assertFits(owner);
  console.log(
    'PASS: events alias, settings, keyboard links, light/dark, narrow/wide and personal statistics.',
  );

  const member = await pageFor(1);
  await member.goto(`${origin}/teams/${teamId}/statistics/dashboard`);
  await expect(statisticsLink(member)).toHaveAttribute('aria-current', 'page');
  await expect(sections(member).getByRole('link', { name: 'Settings', exact: true })).toHaveCount(
    0,
  );
  await member.goto(`${origin}/teams/${teamId}?teamTab=settings`);
  await expect(member).not.toHaveURL(/teamTab=settings/);
  await expect(sections(member).getByRole('link', { name: 'Decks', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const visitor = await pageFor(2);
  await visitor.goto(`${origin}/teams/${teamId}/statistics/dashboard`);
  await expect(visitor.getByText('Request pending', { exact: true })).toBeVisible();
  await expect(statistics(visitor)).toHaveCount(0);
  expect((await visitor.request.get(`${origin}/api/game-results?teamId=${teamId}`)).status()).toBe(
    403,
  );
  const anonymous = await pageFor();
  await anonymous.goto(`${origin}/teams/${teamId}/statistics/dashboard`);
  await expect(anonymous.getByText('Sign in to request to join this team.')).toBeVisible();
  await expect(statistics(anonymous)).toHaveCount(0);
  expect(
    (await anonymous.request.get(`${origin}/api/game-results?teamId=${teamId}`)).status(),
  ).toBe(401);
  await anonymous.goto(`${origin}/teams/${randomUUID()}/statistics/dashboard`);
  await expect(anonymous.getByText('Team not found', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: owner/member/visitor/anonymous access, missing team and no browser exceptions.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await sql`DELETE FROM team WHERE id=${teamId}`;
  await sql`DELETE FROM deck_information WHERE deck_id=${deckId}`;
  await sql`DELETE FROM deck WHERE id=${deckId}`;
  for (const id of userIds) await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
