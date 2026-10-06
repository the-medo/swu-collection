// TEAM_BOOKMARK_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/team-bookmarks.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { MAX_TEAM_BOOKMARKS } from '../../types/ZTeamBookmark.ts';

const expect = baseExpect.configure({ timeout: 20_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.TEAM_BOOKMARK_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable this test only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');

const sql = postgres(database.toString(), { max: 2 });
const teamId = randomUUID();
const shortcut = `bookmarks-${teamId.slice(0, 8)}`;
const userIds = ['owner', 'member', 'visitor'].map(
  role => `bookmark-browser-${role}-${randomUUID()}`,
);
const browser = await chromium.launch();
const contexts: BrowserContext[] = [];
const errors: string[] = [];
const screenshots = new URL('../../.swubase/team-bookmarks-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });

async function pageFor(index?: number) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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

async function assertFits(page: Page) {
  const sizes = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: innerWidth,
    main: document.querySelector('main')!.scrollWidth,
    mainClient: document.querySelector('main')!.clientWidth,
  }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.main).toBeLessThanOrEqual(sizes.mainClient + 1);
}

try {
  for (const id of userIds) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
      VALUES (${id}, 'Bookmark tester', ${id + '@invalid.local'}, false, now(), now(), ${id}, 'USD')`;
  }
  await sql`INSERT INTO team (id, name, shortcut, privacy) VALUES (${teamId}, 'Rogue Squadron', ${shortcut}, 'public')`;
  await sql`INSERT INTO team_member (team_id, user_id, role) VALUES (${teamId}, ${userIds[0]}, 'owner'), (${teamId}, ${userIds[1]}, 'member')`;

  const member = await pageFor(1);
  await member.goto(`${origin}/teams/${shortcut}`);
  await member.getByRole('button', { name: 'Manage team bookmarks' }).click();
  const dialog = member.getByRole('dialog', { name: 'Team bookmarks', exact: true });
  await expect(
    dialog.getByText("No bookmarks yet. Add your team's first link below."),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await expect(dialog.getByText('Enter a label', { exact: true })).toBeVisible();
  await dialog.getByLabel('Label', { exact: true }).fill('Team Discord');
  await dialog.getByLabel('URL', { exact: true }).fill('javascript:alert(1)');
  await expect(dialog.getByText('Enter a valid http:// or https:// URL')).toBeVisible();
  await dialog.getByLabel('URL', { exact: true }).fill('https://discord.gg/example');
  await dialog.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Edit Team Discord' })).toBeVisible();
  await member.keyboard.press('Escape');
  const link = member.locator('header').getByRole('link', { name: 'Team Discord', exact: true });
  await expect(link).toHaveAttribute('href', 'https://discord.gg/example');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  const titleBox = await member
    .getByRole('heading', { name: 'Rogue Squadron', exact: true })
    .boundingBox();
  const linkBox = await link.boundingBox();
  expect(linkBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);

  const owner = await pageFor(0);
  await owner.goto(`${origin}/teams/${teamId}`);
  await expect(
    owner.locator('header').getByRole('link', { name: 'Team Discord', exact: true }),
  ).toBeVisible();
  await owner.getByRole('button', { name: 'Manage team bookmarks' }).click();
  const ownerDialog = owner.getByRole('dialog', { name: 'Team bookmarks', exact: true });
  await ownerDialog.getByRole('button', { name: 'Edit Team Discord' }).click();
  await ownerDialog.getByLabel('Label', { exact: true }).fill('Practice schedule');
  await ownerDialog.getByLabel('URL', { exact: true }).fill('https://example.com/practice');
  await ownerDialog.getByRole('button', { name: 'Save bookmark', exact: true }).click();
  await expect(ownerDialog.getByRole('button', { name: 'Edit Practice schedule' })).toBeVisible();
  await owner.keyboard.press('Escape');
  await member.reload();
  await expect(
    member.locator('header').getByRole('link', { name: 'Practice schedule', exact: true }),
  ).toBeVisible();
  console.log(
    'PASS: ordinary member creates, owner edits, header refreshes under UUID and shortcut URLs.',
  );

  for (const theme of ['light', 'dark']) {
    await member.evaluate(value => localStorage.setItem('vite-ui-theme', value), theme);
    await member.reload();
    await expect(member.locator('html')).toHaveClass(new RegExp(theme));
    for (const width of [1440, 768, 390, 320]) {
      await member.setViewportSize({ width, height: 1000 });
      await expect(
        member.locator('header').getByRole('link', { name: 'Practice schedule', exact: true }),
      ).toBeVisible();
      await assertFits(member);
      await member.screenshot({ path: `${screenshots}/${theme}-${width}.png` });
      await member.getByRole('button', { name: 'Manage team bookmarks' }).focus();
      await member.keyboard.press('Enter');
      await expect(dialog.getByLabel('Label', { exact: true })).toBeVisible();
      await assertFits(member);
      await member.keyboard.press('Escape');
    }
  }

  const visitor = await pageFor(2);
  const anonymous = await pageFor();
  for (const page of [visitor, anonymous]) {
    await page.goto(`${origin}/teams/${teamId}`);
    await expect(page.getByRole('heading', { name: 'Rogue Squadron', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manage team bookmarks' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Practice schedule', exact: true })).toHaveCount(0);
    expect((await page.request.get(`${origin}/api/teams/${teamId}/bookmarks`)).status()).toBe(
      page === visitor ? 403 : 401,
    );
  }

  await member.getByRole('button', { name: 'Manage team bookmarks' }).click();
  await dialog.getByRole('button', { name: 'Remove Practice schedule' }).click();
  await member
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(dialog.getByRole('button', { name: 'Edit Practice schedule' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Remove Practice schedule' }).click();
  await member
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remove bookmark', exact: true })
    .click();
  await expect(
    dialog.getByText("No bookmarks yet. Add your team's first link below."),
  ).toBeVisible();
  await member.keyboard.press('Escape');
  await expect(
    member.locator('header').getByRole('link', { name: 'Practice schedule', exact: true }),
  ).toHaveCount(0);

  await member.route('**/api/teams/*/bookmarks', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unavailable' }),
    }),
  );
  await member.reload();
  await member.getByRole('button', { name: 'Manage team bookmarks' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Unable to load team bookmarks.');
  await member.unroute('**/api/teams/*/bookmarks');
  await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(dialog.getByLabel('Label', { exact: true })).toBeVisible();
  await member.keyboard.press('Escape');
  for (let index = 0; index < MAX_TEAM_BOOKMARKS; index++) {
    await sql`INSERT INTO team_bookmark (team_id, label, url) VALUES (${teamId}, ${`Resource ${index}`}, 'https://example.com')`;
  }
  await member.reload();
  await member.getByRole('button', { name: 'Manage team bookmarks' }).click();
  await expect(
    dialog.getByText(
      `Teams can have up to ${MAX_TEAM_BOOKMARKS} bookmarks. Remove one to add another.`,
    ),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add bookmark', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Edit Resource 0', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Save bookmark', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel edit', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Add bookmark', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: responsive light/dark header, keyboard dialog, visitor privacy, delete confirmation, error/retry and no browser exceptions.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await sql`DELETE FROM team WHERE id=${teamId}`;
  for (const id of userIds) await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
