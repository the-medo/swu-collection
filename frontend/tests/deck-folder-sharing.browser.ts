// DECK_FOLDERS_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/deck-folder-sharing.browser.ts
// Set DECK_FOLDERS_BROWSER_BUILD=1 after building to test production assets against the same worktree API.
import { chromium, expect as baseExpect, type BrowserContext, type Page } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

const expect = baseExpect.configure({ timeout: 20_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.DECK_FOLDERS_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable sharing tests against an isolated worktree database.');
const sql = postgres(database.toString(), { max: 2 });
const userIds = Array.from({ length: 3 }, () => crypto.randomUUID());
const [rootId, childId, siblingId] = Array.from({ length: 3 }, () => crypto.randomUUID()) as [
  string,
  string,
  string,
];
const deckIds = Array.from({ length: 25 }, () => crypto.randomUUID());
const publicDeckId = crypto.randomUUID();
const allDeckIds = [...deckIds, publicDeckId];
const teamId = crypto.randomUUID();
const screenshots = new URL('../../.swubase/deck-folder-sharing-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const owner = await ownerContext.newPage();
const visitor = await visitorContext.newPage();
const errors: string[] = [];
for (const context of [ownerContext, visitorContext]) {
  if (process.env.DECK_FOLDERS_BROWSER_BUILD === '1') {
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && route.request().resourceType() === 'document') {
        await route.fulfill({ path: new URL('../dist/index.html', import.meta.url).pathname });
      } else if (url.origin === origin && url.pathname.startsWith('/assets/')) {
        await route.fulfill({ path: new URL(`../dist${url.pathname}`, import.meta.url).pathname });
      } else {
        await route.continue();
      }
    });
  }
  await context.addInitScript(() => {
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', localStorage.getItem('vite-ui-theme') ?? 'light');
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
}
owner.on('pageerror', error => errors.push(error.message));
visitor.on('pageerror', error => errors.push(error.message));

async function authenticate(context: BrowserContext, id: string) {
  const token = crypto.randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${id}, now(), now())`;
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (await serializeSignedCookie(name, token, process.env.BETTER_AUTH_SECRET!)).split(
    ';',
  )[0]!;
  await context.clearCookies();
  await context.addCookies([
    {
      name,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
}
async function sharingDialog() {
  await owner.getByRole('button', { name: 'Actions for Sharing fixture', exact: true }).click();
  await owner.getByText('Share folder', { exact: true }).click();
  const dialog = owner.getByRole('dialog', { name: 'Share Sharing fixture', exact: true });
  await expect(dialog.getByRole('button', { name: 'Save sharing', exact: true })).toBeEnabled();
  return dialog;
}
async function saveSharing() {
  await owner
    .getByRole('dialog')
    .getByRole('button', { name: 'Save sharing', exact: true })
    .click();
  await expect(owner.getByRole('dialog')).toHaveCount(0);
  await owner.getByRole('heading', { name: 'Your decks', exact: true }).click();
  await expect(owner.getByText('Share folder', { exact: true })).toBeHidden();
}
async function assertStatisticsRoutes(page: Page, signedIn: boolean) {
  const assertPage = async () => {
    await expect(
      signedIn
        ? page.getByRole('heading', { name: 'Your statistics', exact: true })
        : page.getByText('Sign in to see your statistics', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Not Found', { exact: true })).toHaveCount(0);
  };
  await page.goto(`${origin}/statistics`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/statistics\/dashboard\/?(?:\?.*)?$/);
  await assertPage();
  await page.waitForLoadState('load');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertPage();
  for (const path of ['dashboard', 'decks', 'history', 'leader-and-base', 'matchups', 'meta']) {
    await page.goto(`${origin}/statistics/${path}`, { waitUntil: 'domcontentloaded' });
    await assertPage();
  }
}
try {
  for (const [index, id] of userIds.entries()) {
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency)
      VALUES (${id},${`Sharing fixture ${index}`},${id + '@invalid.local'},false,now(),now(),${`Sharing fixture ${index}`},'USD')`;
  }
  await sql`INSERT INTO team (id,name) VALUES (${teamId}, 'Sharing fixture team')`;
  await sql`INSERT INTO team_member (team_id,user_id,role) VALUES (${teamId},${userIds[0]},'owner'),(${teamId},${userIds[1]},'member')`;
  await sql`INSERT INTO deck_folder (id,user_id,name) VALUES (${rootId},${userIds[0]},'Sharing fixture'),(${siblingId},${userIds[0]},'Private sibling')`;
  await sql`INSERT INTO deck_folder (id,user_id,parent_id,name) VALUES (${childId},${userIds[0]},${rootId},'Shared child')`;
  for (const [index, id] of deckIds.entries()) {
    await sql`INSERT INTO deck (id,user_id,format,name,public,leader_card_id_1,base_card_id,updated_at)
      VALUES (${id},${userIds[0]},1,${`Shared private deck ${index.toString().padStart(2, '0')}`},0,'sabine-wren--galvanized-revolutionary','command-center',${new Date(Date.now() - index * 1000)})`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
    await sql`INSERT INTO deck_folder_deck (deck_id,folder_id) VALUES (${id},${childId})`;
  }
  await sql`INSERT INTO deck (id,user_id,format,name,public,leader_card_id_1,base_card_id)
    VALUES (${publicDeckId},${userIds[0]},1,'Comparer public fixture',1,'sabine-wren--galvanized-revolutionary','command-center')`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${publicDeckId})`;
  await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity)
    VALUES (${publicDeckId},'fleet-lieutenant',1,2),(${deckIds[0]},'fleet-lieutenant',1,3)`;
  await assertStatisticsRoutes(visitor, false);
  await authenticate(ownerContext, userIds[0]!);
  await owner.goto(`${origin}/decks/your`, { waitUntil: 'domcontentloaded' });
  await expect(
    owner.getByRole('row', { name: 'Folder Sharing fixture', exact: true }),
  ).toBeVisible();
  let dialog = await sharingDialog();
  await expect(dialog.getByRole('button', { name: 'Copy folder link' })).toBeDisabled();
  await dialog.getByRole('switch', { name: 'Anyone with the link' }).click();
  await dialog.getByRole('checkbox', { name: 'Sharing fixture team' }).check();
  await saveSharing();
  await expect(
    owner
      .getByRole('row', { name: 'Folder Sharing fixture', exact: true })
      .getByText('Shared', { exact: true }),
  ).toBeVisible();
  await owner.getByRole('button', { name: 'Expand Sharing fixture', exact: true }).click();
  await expect(
    owner
      .getByRole('row', { name: 'Folder Shared child', exact: true })
      .getByText('Shared · inherited', { exact: true }),
  ).toBeVisible();
  dialog = await sharingDialog();
  await expect(dialog.getByRole('button', { name: 'Copy folder link' })).toBeEnabled();
  await expect(dialog.getByLabel('Folder link', { exact: true })).toHaveValue(
    `${origin}/decks/folder/${rootId}`,
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await owner.getByRole('heading', { name: 'Your decks', exact: true }).click();
  await expect(owner.getByText('Share folder', { exact: true })).toBeHidden();

  await visitor.goto(`${origin}/decks/folder/${rootId}`, { waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Sharing fixture', exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('row', { name: 'Folder Shared child', exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('row', { name: 'Folder Private sibling', exact: true }),
  ).toHaveCount(0);
  await expect(
    visitor.getByRole('button', { name: /^Actions for |^Move |^New deck in/ }),
  ).toHaveCount(0);
  await expect(visitor.getByRole('checkbox')).toHaveCount(0);
  await visitor.getByRole('button', { name: 'Expand Shared child', exact: true }).click();
  const deckRegion = visitor.getByRole('region', { name: 'Decks in Shared child', exact: true });
  await expect(deckRegion.getByRole('link', { name: /^Shared private deck/ })).toHaveCount(20);
  await deckRegion.getByRole('button', { name: 'Load more decks', exact: true }).click();
  await expect(deckRegion.getByRole('link', { name: /^Shared private deck/ })).toHaveCount(25);
  await visitor.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('button', { name: 'Collapse Shared child', exact: true }),
  ).toBeVisible();
  await visitor.screenshot({ path: `${screenshots}/shared-folder-light.png`, fullPage: true });
  await visitor.getByRole('button', { name: 'Collapse all folders', exact: true }).click();
  await visitor.reload({ waitUntil: 'domcontentloaded' });
  await expect(visitor.getByRole('row', { name: 'Folder Shared child', exact: true })).toHaveCount(
    0,
  );
  await expect(
    visitor.getByRole('button', { name: 'Expand Sharing fixture', exact: true }),
  ).toBeVisible();

  dialog = await sharingDialog();
  await dialog.getByRole('switch', { name: 'Anyone with the link' }).click();
  await saveSharing();
  await visitor.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Folder unavailable', exact: true }),
  ).toBeVisible();
  await authenticate(visitorContext, userIds[2]!);
  await visitor.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Folder unavailable', exact: true }),
  ).toBeVisible();
  await authenticate(visitorContext, userIds[1]!);
  await assertStatisticsRoutes(visitor, true);
  await visitor.goto(`${origin}/decks/folder/${rootId}`, { waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Sharing fixture', exact: true }),
  ).toBeVisible();
  await visitor.getByRole('button', { name: 'Expand Shared child', exact: true }).click();
  await expect(
    visitor.getByRole('link', { name: 'Shared private deck 00', exact: true }),
  ).toBeVisible();
  await visitor.getByRole('link', { name: 'Shared private deck 00', exact: true }).click();
  await expect(visitor.getByText('Shared private deck 00', { exact: true }).first()).toBeVisible();
  await expect(visitor.getByRole('button', { name: 'Edit deck', exact: true })).toHaveCount(0);
  await visitor.getByRole('button', { name: 'Account menu', exact: true }).click();
  await visitor.getByRole('menuitem', { name: 'Log out', exact: true }).click();
  await expect(visitor.getByRole('heading', { name: 'Deck not found', exact: true })).toBeVisible();
  await authenticate(visitorContext, userIds[1]!);
  await visitor.goto(`${origin}/decks/folder/${rootId}`, { waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Sharing fixture', exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('button', { name: 'Collapse Shared child', exact: true }),
  ).toBeVisible();
  await visitor.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await visitor.reload({ waitUntil: 'domcontentloaded' });
  await visitor.setViewportSize({ width: 390, height: 844 });
  await expect(
    visitor.getByRole('row', { name: 'Folder Shared child', exact: true }),
  ).toBeVisible();
  await visitor.screenshot({
    path: `${screenshots}/shared-folder-mobile-dark.png`,
    fullPage: true,
  });
  const overflow = await visitor.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await visitor.setViewportSize({ width: 1440, height: 1000 });
  await visitor.evaluate(
    ({ mainId, sharedId }) => {
      localStorage.setItem(
        'swu-comparer-state',
        JSON.stringify({
          mode: 'intersection',
          mainId,
          entries: [
            { id: mainId, dataType: 'deck', additionalData: { title: 'Comparer public fixture' } },
            { id: sharedId, dataType: 'deck', additionalData: { title: 'Shared private deck 00' } },
          ],
          settings: { diffDisplayMode: 'count_only', groupBy: 'card-type', viewMode: 'row_card' },
        }),
      );
    },
    { mainId: publicDeckId, sharedId: deckIds[0]! },
  );
  await visitor.goto(`${origin}/comparer/`, { waitUntil: 'domcontentloaded' });
  const comparedCard = visitor.getByRole('row').filter({ hasText: 'Fleet Lieutenant' });
  await expect(comparedCard.getByRole('cell').nth(1)).toHaveText('2');
  await expect(comparedCard.getByRole('cell').nth(2)).toHaveText('3');
  await visitor.evaluate(sharedId => {
    const state = JSON.parse(localStorage.getItem('swu-comparer-state')!);
    localStorage.setItem('swu-comparer-state', JSON.stringify({ ...state, mainId: sharedId }));
  }, deckIds[0]!);
  const sharedMainComparer = await visitorContext.newPage();
  await sharedMainComparer.goto(`${origin}/comparer/`, { waitUntil: 'domcontentloaded' });
  const sharedMainCard = sharedMainComparer
    .getByRole('row')
    .filter({ hasText: 'Fleet Lieutenant' });
  await expect(sharedMainCard.getByRole('cell').nth(1)).toHaveText('3');
  await expect(sharedMainCard.getByRole('cell').nth(2)).toHaveText('2');
  await sql`DELETE FROM team_member WHERE team_id=${teamId} AND user_id=${userIds[1]}`;
  await expect(comparedCard.getByRole('cell').nth(2)).toHaveText('0', { timeout: 45_000 });
  await expect(comparedCard.getByRole('cell').nth(1)).toHaveText('2');
  await expect(sharedMainCard.getByRole('cell').nth(1)).toHaveText('0', { timeout: 45_000 });
  await expect(sharedMainCard.getByRole('cell').nth(2)).toHaveText('2');
  await sharedMainComparer.close();
  await visitor.goto(`${origin}/decks/folder/${rootId}`, { waitUntil: 'domcontentloaded' });
  await expect(
    visitor.getByRole('heading', { name: 'Folder unavailable', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Statistics routes, root redirect and refresh for signed-out/signed-in viewers, sharing dialog, inherited badges, anonymous link access, team restrictions, private deck reads, pagination, persisted navigation, logout cache isolation, comparer revocation without reload, and responsive themes passed.',
  );
} catch (error) {
  await owner
    .screenshot({ path: `${screenshots}/owner-failure.png`, fullPage: true })
    .catch(() => {});
  await visitor.screenshot({ path: `${screenshots}/failure.png`, fullPage: true }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM deck_folder WHERE user_id IN ${sql(userIds)}`;
  await sql`DELETE FROM deck_card WHERE deck_id IN ${sql(allDeckIds)}`;
  await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(allDeckIds)}`;
  await sql`DELETE FROM deck WHERE id IN ${sql(allDeckIds)}`;
  await sql`DELETE FROM team WHERE id=${teamId}`;
  await sql`DELETE FROM session WHERE user_id IN ${sql(userIds)}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql(userIds)}`;
  await sql.end();
}
