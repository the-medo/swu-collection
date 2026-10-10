// USER_DISPLAY_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-display.browser.ts
// Uses temporary identities and resources in the isolated worktree database.
/* global process, Buffer */
import { chromium, expect as baseExpect, type Locator } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { cardList } from '../../server/db/lists.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.USER_DISPLAY_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw Error('Enable only against an isolated development worktree.');

const sql = postgres(database.toString(), { max: 1 });
const suffix = crypto.randomUUID().slice(0, 8);
const viewer = `display-viewer-${suffix}`;
const owner = `display-owner-${suffix}`;
const applicant = `display-applicant-${suffix}`;
const name = `Display Pilot ${suffix}`;
const longName = `DisplayApplicant${suffix}${'LongName'.repeat(8)}`;
const viewerName = `Display Reviewer ${suffix}`;
const deckId = crypto.randomUUID();
const editorDeckId = crypto.randomUUID();
const collections = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const sourceId = crypto.randomUUID();
const teamId = crypto.randomUUID();
const eventId = crypto.randomUUID();
const matchId = crypto.randomUUID();
const reportId = crypto.randomUUID();
const deletedReportId = crypto.randomUUID();
const notificationId = crypto.randomUUID();
const queuedNotifications = [crypto.randomUUID(), crypto.randomUUID()];
const token = crypto.randomUUID();
const leader = Object.values(cardList).find(card => card?.type === 'Leader')!;
const base = Object.values(cardList).find(card => card?.type === 'Base')!;
const avatar =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#238b9a"/><circle cx="40" cy="30" r="15" fill="white"/><path d="M10 80Q10 45 40 45Q70 45 70 80" fill="white"/></svg>',
  ).toString('base64');
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
const screenshots = new URL('../../.swubase/user-display/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
let previewsLoaded = 0;
let releaseCatalog!: () => void;
const catalogGate = new Promise<void>(resolve => {
  releaseCatalog = resolve;
});
await page.route(`${origin}/api/cards`, async route => {
  await catalogGate;
  await route.continue();
});
page.on('request', request => {
  if (new URL(request.url()).pathname === `/api/user/${owner}/achievements`) previewsLoaded++;
});
const ownerButton = () => page.getByRole('button', { name: `View ${name}'s profile`, exact: true });
const preview = () => page.getByRole('dialog', { name: `${name}'s profile`, exact: true });
async function checkPreview(trigger: Locator, keyboard = false) {
  const before = new URL(page.url());
  if (keyboard) {
    await trigger.focus();
    await page.keyboard.press('Enter');
  } else await trigger.click();
  await expect(preview()).toBeVisible();
  await expect(preview().getByRole('link', { name: 'Open profile', exact: true })).toHaveAttribute(
    'href',
    `/users/${owner}`,
  );
  const after = new URL(page.url());
  expect(after.pathname).toBe(before.pathname);
  for (const [key, value] of before.searchParams) expect(after.searchParams.get(key)).toBe(value);
  expect(after.searchParams.get('reportId')).toBe(before.searchParams.get('reportId'));
  await page.keyboard.press('Escape');
  await expect(preview()).toBeHidden();
  await expect(trigger).toBeFocused();
}

try {
  for (const [id, label, image, role] of [
    [viewer, viewerName, null, 'admin'],
    [owner, name, avatar, 'user'],
    [applicant, longName, '/missing-avatar.png', 'user'],
  ] as const) {
    await sql`INSERT INTO "user" (id,name,display_name,image,email,email_verified,country,currency,role,created_at,updated_at)
      VALUES (${id},${label},${label},${image},${id + '@invalid.local'},false,'FR','USD',${role},now(),now())`;
  }
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at)
    VALUES (${crypto.randomUUID()},${token},now()+interval '1 hour',${viewer},now(),now())`;
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
  await sql`INSERT INTO deck (id,user_id,format,name,leader_card_id_1,base_card_id,public)
    VALUES (${deckId},${owner},1,${'Display deck ' + suffix},${leader.cardId},${base.cardId},1)`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
  await sql`INSERT INTO deck (id,user_id,format,name,public) VALUES (${editorDeckId},${viewer},1,'Display guide',1)`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${editorDeckId})`;
  for (const [index, id] of collections.entries()) {
    await sql`INSERT INTO collection (id,user_id,title,collection_type,public)
      VALUES (${id},${owner},${'Display list ' + index + ' ' + suffix},${index + 1},true)`;
  }
  await sql`INSERT INTO collection (id,user_id,title,collection_type,public)
    VALUES (${sourceId},${viewer},'Display source',1,true)`;
  await sql`INSERT INTO collection_source_collection (collection_id,source_collection_id) VALUES (${collections[2]!},${sourceId})`;
  await sql`INSERT INTO team (id,name,privacy) VALUES (${teamId},${'Display team ' + suffix},'public')`;
  await sql`INSERT INTO team_member (team_id,user_id,role) VALUES (${teamId},${viewer},'owner'),(${teamId},${owner},'member')`;
  await sql`INSERT INTO team_deck (team_id,deck_id) VALUES (${teamId},${deckId})`;
  await sql`INSERT INTO team_join_request (team_id,user_id,status) VALUES (${teamId},${applicant},'pending')`;
  const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await sql`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,days,date)
    VALUES (${eventId},${viewer},'pq','Paris','Europe','Display event',32,1,1,${eventDate})`;
  await sql`INSERT INTO user_tournament_save (user_id,tournament_id,status)
    VALUES (${owner},${eventId},'going'),(${viewer},${eventId},'maybe')`;
  for (const [userId, isWinner] of [
    [owner, true],
    [viewer, false],
  ] as const) {
    await sql`INSERT INTO game_result (user_id,deck_id,match_id,game_id,game_source,format,leader_card_id,base_card_key,opponent_leader_card_id,opponent_base_card_key,is_winner,other_data)
      VALUES (${userId},${deckId},${matchId},${crypto.randomUUID()},'manual','premier',${leader.cardId},${base.cardId},${leader.cardId},${base.cardId},${isWinner},'{"deckInfo":{"formatId":1}}')`;
  }
  await sql`INSERT INTO user_notification (id,recipient_user_id,actor_user_id,type,entity_type,entity_id,dedupe_key)
    VALUES (${notificationId},${viewer},${owner},'deck.favorite','deck',${editorDeckId},${notificationId})`;
  await sql`INSERT INTO user_report (id,reporter_user_id,reported_user_id,reporter_id_at_submission,reported_id_at_submission,reporter_display_name,reported_display_name,client_report_id,description,source)
    VALUES (${reportId},${owner},${applicant},${owner},${applicant},${name},${longName},${crypto.randomUUID()},'User display browser fixture','profile'),
    (${deletedReportId},NULL,NULL,'deleted-display-reporter','deleted-display-target','Deleted Reporter','Deleted Player',${crypto.randomUUID()},'Deleted identity fixture','profile')`;

  await page.goto(`${origin}/decks/public`);
  await expect(ownerButton().first()).toBeVisible();
  await expect(ownerButton().first().locator('img')).toHaveAttribute('src', avatar);
  expect(previewsLoaded).toBe(0);
  await ownerButton().first().focus();
  await page.keyboard.press('Enter');
  await expect(preview().getByRole('link', { name: 'Open profile', exact: true })).toHaveAttribute(
    'href',
    `/users/${owner}`,
  );
  releaseCatalog();
  await expect(page.getByAltText(`card-${leader.cardId}`, { exact: true }).first()).toBeVisible();
  await expect(preview()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ownerButton().first()).toBeFocused();
  await page.unroute(`${origin}/api/cards`);
  expect(previewsLoaded).toBeGreaterThan(0);
  await ownerButton().first().click();
  await page.screenshot({ path: screenshots + 'decks-desktop.png', animations: 'disabled' });
  await preview().getByRole('link', { name: 'Open profile', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/users/${owner}`));
  console.log('PASS: real avatar, lazy preview requests, keyboard/focus, full-profile navigation.');

  for (const path of [
    '/collections/public',
    '/wantlists/public',
    `/decks/${deckId}`,
    ...collections.map(id => `/collections/${id}`),
  ]) {
    await page.goto(origin + path);
    await checkPreview(ownerButton().first());
  }
  const cardDecks = await context.request.get(`${origin}/api/deck/card/${leader.cardId}`);
  expect(cardDecks.ok()).toBe(true);
  expect(
    (await cardDecks.json()).data.find((row: { deck: { id: string } }) => row.deck.id === deckId)
      ?.user.image,
  ).toBe(avatar);

  await page.goto(`${origin}/collections/${sourceId}`);
  const sourceBox = page.getByRole('button').filter({ hasText: 'Display list 2 ' + suffix });
  await expect(sourceBox).toHaveAttribute('aria-pressed', 'false');
  await checkPreview(
    sourceBox.getByRole('button', { name: `View ${name}'s profile`, exact: true }),
  );
  await expect(sourceBox).toHaveAttribute('aria-pressed', 'false');
  await sourceBox.getByText('Display list 2 ' + suffix, { exact: true }).click();
  await expect(sourceBox).toHaveAttribute('aria-pressed', 'true');
  await checkPreview(
    sourceBox.getByRole('button', { name: `View ${name}'s profile`, exact: true }),
  );
  await expect(sourceBox).toHaveAttribute('aria-pressed', 'true');
  console.log('PASS: deck/list tables and detail headers; source selection remains intact.');

  await page.goto(`${origin}/teams/${teamId}`);
  await checkPreview(ownerButton().first());
  await page.goto(`${origin}/teams/${teamId}?teamTab=members`);
  await checkPreview(ownerButton().first());
  const applicantButton = page.getByRole('button', {
    name: `View ${longName}'s profile`,
    exact: true,
  });
  await expect(applicantButton).toBeVisible();
  await expect(applicantButton).toContainText(longName.slice(0, 2).toUpperCase());
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeEnabled();
  console.log('PASS: team deck/member profiles and failed-avatar fallback.');

  await page.goto(`${origin}/teams/${teamId}?teamTab=events`);
  await checkPreview(ownerButton().first());
  await expect(
    page.getByRole('list', { name: 'Teammates at Display event', exact: true }),
  ).toContainText('Going');
  await expect(
    page.getByRole('link', { name: `View ${name}'s calendar`, exact: true }),
  ).toHaveAttribute('href', new RegExp(`/users/${owner}.*userTab=calendar`));
  await page.goto(
    `${origin}/teams/${teamId}/statistics/history?sDateRangeFrom=2020-01-01&sDateRangeTo=2099-01-01`,
  );
  await expect(ownerButton().first()).toBeVisible();
  const players = ownerButton().first().locator('..').locator('..');
  await expect(
    players.getByRole('button', { name: `View ${viewerName}'s profile`, exact: true }),
  ).toBeVisible();
  await checkPreview(ownerButton().first());
  console.log('PASS: team event attendees and both player identities in match history.');

  await page.goto(`${origin}/decks/${editorDeckId}?deckTab=article`);
  await page.getByRole('button', { name: 'Write guide', exact: true }).click();
  await page.locator('[contenteditable=true]').first().focus();
  await page.keyboard.type('/decklist', { delay: 20 });
  await expect(page.getByRole('option', { name: /^Decklist/ })).toBeVisible();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog', { name: 'Insert decklist', exact: true });
  await expect(picker).toBeVisible();
  await picker.getByRole('tab', { name: 'Public decks', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Insert decklist', exact: true })).toBeDisabled();
  await checkPreview(
    picker.getByRole('button', { name: `View ${name}'s profile`, exact: true }).first(),
  );
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Insert decklist', exact: true })).toBeDisabled();
  await picker.getByRole('button', { name: new RegExp('^Display deck ' + suffix) }).click();
  await expect(picker.getByRole('button', { name: 'Insert decklist', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  console.log('PASS: profile inside deck picker stays clickable and preserves deck selection.');

  await page.goto(`${origin}/notifications`);
  await checkPreview(ownerButton().first());
  expect(
    (await sql`SELECT read_at FROM user_notification WHERE id=${notificationId}`)[0]!.read_at,
  ).toBeNull();
  const bell = page.getByRole('button', { name: /^Notifications, 1 unread$/ });
  await bell.click();
  const inbox = page.getByRole('dialog', { name: 'Unread notifications', exact: true });
  await expect(inbox).toBeVisible();
  await checkPreview(inbox.getByRole('button', { name: `View ${name}'s profile`, exact: true }));
  await expect(inbox).toBeVisible();
  await inbox.getByRole('button', { name: `View ${name}'s profile`, exact: true }).click();
  await preview().getByRole('link', { name: 'Open profile', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/users/${owner}`));
  await expect(inbox).toBeHidden();
  await expect(preview()).toBeHidden();
  await expect
    .poll(
      async () =>
        (await sql`SELECT read_at FROM user_notification WHERE id=${notificationId}`)[0]!.read_at,
    )
    .not.toBeNull();
  console.log(
    'PASS: notification preview preserves unread state; full-profile navigation closes menus and marks read.',
  );

  for (const middleClick of [false, true]) {
    await sql`UPDATE user_notification SET read_at=NULL WHERE id=${notificationId}`;
    await page.goto(`${origin}/notifications`);
    await bell.click();
    await inbox.getByRole('button', { name: `View ${name}'s profile`, exact: true }).click();
    const newTab = context.waitForEvent('page');
    await preview()
      .getByRole('link', { name: 'Open profile', exact: true })
      .click(middleClick ? { button: 'middle' } : { modifiers: ['Control'] });
    const profileTab = await newTab;
    await expect(profileTab).toHaveURL(new RegExp(`/users/${owner}`));
    await expect(inbox).toBeVisible();
    await expect
      .poll(
        async () =>
          (await sql`SELECT read_at FROM user_notification WHERE id=${notificationId}`)[0]!.read_at,
      )
      .not.toBeNull();
    await expect(inbox.getByRole('link', { name: 'View all', exact: true })).toBeFocused();
    await profileTab.close();
  }
  console.log(
    'PASS: modifier/middle-click mark read, keep the menu open and restore keyboard focus.',
  );

  for (const [index, id] of queuedNotifications.entries()) {
    await sql`INSERT INTO user_notification (id,recipient_user_id,actor_user_id,type,entity_type,entity_id,dedupe_key,created_at)
      VALUES (${id},${viewer},${owner},'deck.favorite','deck',${editorDeckId},${id},${new Date(Date.now() + (2 - index) * 1000)})`;
  }
  for (const action of ['Mark read', 'Archive']) {
    await sql`UPDATE user_notification SET read_at=NULL,archived_at=NULL WHERE id IN (${queuedNotifications[0]!},${queuedNotifications[1]!})`;
    await page.goto(`${origin}/notifications`);
    await page.getByRole('button', { name: 'Notifications, 2 unread', exact: true }).click();
    const actionButton = inbox.getByRole('button', { name: action, exact: true }).first();
    await actionButton.focus();
    await page.keyboard.press('Enter');
    await expect(inbox.locator(`[data-notification-id="${queuedNotifications[0]}"]`)).toHaveCount(
      0,
    );
    await expect(actionButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(inbox.locator(`[data-notification-id="${queuedNotifications[1]}"]`)).toHaveCount(
      0,
    );
    await expect(inbox.getByRole('link', { name: 'View all', exact: true })).toBeFocused();
  }
  console.log('PASS: consecutive read/archive actions keep focus on the matching next-row action.');

  await page.goto(`${origin}/admin?page=credits`);
  const creditSearch = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/admin/credits' && url.searchParams.get('search') === name;
  });
  await page.getByRole('textbox', { name: 'Search users', exact: true }).fill(name);
  await creditSearch;
  await checkPreview(ownerButton().first());
  await page.goto(`${origin}/admin?page=crossfire-access`);
  const accessSearch = page.waitForResponse(response => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/admin/crossfire-access' && url.searchParams.get('search') === name
    );
  });
  await page.getByRole('textbox', { name: 'Search users', exact: true }).fill(name);
  await accessSearch;
  await checkPreview(ownerButton().first());
  await page.goto(`${origin}/admin?page=user-reports`);
  await checkPreview(ownerButton().first());
  const deleted = page.getByText('Deleted identity fixture').locator('..');
  await expect(deleted.getByRole('button')).toHaveCount(0);
  await page.goto(`${origin}/admin?page=user-reports&reportId=${reportId}`);
  await checkPreview(ownerButton().first());
  console.log('PASS: admin accounts and reports; deleted identities have no profile trigger.');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('vite-ui-theme', theme), theme);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/collections/public`);
      await expect
        .poll(() => page.locator('html').evaluate(element => element.classList.contains('dark')))
        .toBe(theme === 'dark');
      await ownerButton().first().click();
      await expect(
        preview().getByRole('link', { name: 'Open profile', exact: true }),
      ).toBeVisible();
      const box = await preview().boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (theme === 'dark' && width === 390)
        await page.screenshot({
          path: screenshots + 'collections-mobile.png',
          animations: 'disabled',
        });
      await page.keyboard.press('Escape');
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: desktop/mobile, light/dark, narrow-screen profile bounds and no runtime errors.',
  );
} catch (error) {
  await page.screenshot({ path: screenshots + 'failure.png', fullPage: true });
  console.error('Failure page:', page.url(), 'Runtime errors:', errors);
  console.error((await page.locator('main').innerText()).slice(-4000));
  throw error;
} finally {
  releaseCatalog();
  await browser.close();
  await sql`DELETE FROM user_report WHERE id IN (${reportId},${deletedReportId})`;
  await sql`DELETE FROM tournament WHERE id=${eventId}`;
  await sql`DELETE FROM team WHERE id=${teamId}`;
  await sql`DELETE FROM collection WHERE id IN (${sourceId},${collections[0]!},${collections[1]!},${collections[2]!})`;
  await sql`DELETE FROM deck_information WHERE deck_id IN (${deckId},${editorDeckId})`;
  await sql`DELETE FROM deck WHERE id IN (${deckId},${editorDeckId})`;
  await sql`DELETE FROM "user" WHERE id IN (${viewer},${owner},${applicant})`;
  await sql.end();
}
