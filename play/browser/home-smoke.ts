import { versions } from '../engine/model.ts';
// Opt-in real API acceptance for the Crossfire play desk. No report endpoint calls or external notifications.
import { chromium, expect } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || url !== process.env.DATABASE_URL)
  throw new Error('Select the running worktree DB explicitly');
const db = new URL(url),
  origin = process.env.BETTER_AUTH_URL!;
if (db.hostname !== '127.0.0.1' || !db.pathname.startsWith('/swubase_'))
  throw new Error('Refusing non-worktree DB');
if (
  !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Refusing non-development origin');
const sql = postgres(url, { max: 3 });
const browser = await chromium.launch();
const prefix = `crossfire-home-${randomUUID()}`;
const users = ['Alex', 'Nova', 'Kai', 'Tess'].map(name => ({
  name,
  userId: `${prefix}-${name}`,
  sessionId: `${prefix}-${name}-session`,
  token: randomUUID(),
}));
const [host, guest] = users;
const decks: string[] = [];
const teamId = randomUUID();
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const service = new CrossfireLobbies(sql, catalog);
const screenshots = '.swubase/crossfire-home';
const { mkdir, copyFile, writeFile } = await import('node:fs/promises');
await mkdir(screenshots, { recursive: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1050 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
await page.addLocatorHandler(
  page.getByRole('button', { name: 'Dismiss', exact: true }),
  async () => {
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  },
);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const cookieName = getCookies({
  baseURL: origin,
  advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
}).sessionToken.name;
async function addDeck(
  name: string,
  owner: string,
  visibility = 0,
  leader = 'ahsoka-tano--trust-in-the-force',
  base = 'command-center',
) {
  const id = randomUUID();
  decks.push(id);
  await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id) VALUES (${id}, ${owner}, 1, ${name}, ${visibility}, ${leader}, ${base})`;
  await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${id}, 'battlefield-marine', 1, 12)`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
  return id;
}
async function theme(dark: boolean) {
  if ((await page.evaluate(() => document.documentElement.classList.contains('dark'))) === dark)
    return;
  const viewport = page.viewportSize()!;
  if (viewport.width < 1000) await page.setViewportSize({ width: 1600, height: 1050 });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /light/);
  if (viewport.width < 1000) await page.setViewportSize(viewport);
}
async function shot(name: string, target = page) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.querySelectorAll<HTMLImageElement>('.cf-home img')).map(img =>
        img.decode().catch(() => {}),
      ),
    );
  });
  await target.screenshot({
    path: `${screenshots}/${name}.png`,
    fullPage: target.viewportSize()!.width > 740,
    animations: 'disabled',
  });
}
async function layout() {
  const metrics = await page.locator('.cf-home').evaluate(home => {
    const picker = home.querySelector('.cf-deck-picker')!.getBoundingClientRect();
    const panel = home.querySelector('.cf-play-desk')!.getBoundingClientRect();
    const headers = [...home.querySelectorAll('.cf-deck-group > h3')].map(n =>
      n.getBoundingClientRect(),
    );
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      launchOverflow: (() => {
        const launch = home.querySelector('.cf-deck-launch')!;
        return launch.scrollHeight - launch.clientHeight;
      })(),
      deckBesideArt: (() => {
        const info = home.querySelector('.cf-selected-deck')!.getBoundingClientRect();
        const art = home.querySelector('.cf-selected-art')!.getBoundingClientRect();
        return (
          info.right <= art.left &&
          Math.abs((info.top + info.bottom) / 2 - (art.top + art.bottom) / 2) < 2
        );
      })(),
      gutter: home.closest('main')!.clientWidth - home.getBoundingClientRect().width,
      width: picker.width / panel.width,
      visible: headers.every(r => r.top >= picker.top && r.bottom <= picker.bottom),
      height: Math.abs(panel.height - picker.height),
    };
  });
  expect(metrics.overflow).toBe(false);
  expect(metrics.launchOverflow).toBeLessThanOrEqual(2);
  expect(metrics.deckBesideArt).toBe(true);
  expect(metrics.gutter).toBeLessThanOrEqual(16);
  expect(metrics.visible).toBe(true);
  expect(metrics.width).toBeGreaterThanOrEqual(0.5);
  if (page.viewportSize()!.width > 740) expect(metrics.height).toBeLessThan(3);
}
try {
  for (const user of users) {
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${user.userId},${user.name + ' private account name'},${user.userId + '@invalid.local'},false,now(),now(),${user.name},'USD', 'crossfire')`;
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${user.sessionId},${user.token},now()+interval '1 hour',${user.userId},now(),now())`;
  }
  await sql`INSERT INTO team (id, name) VALUES (${teamId}, 'Crossfire test team')`;
  await sql`INSERT INTO team_member (team_id, user_id) VALUES (${teamId}, ${host!.userId}), (${teamId}, ${guest!.userId}), (${teamId}, ${users[2]!.userId})`;
  const main = await addDeck('Ahsoka • A little unconventional', host!.userId);
  const sabine = await addDeck(
    'Sabine • Fast company',
    host!.userId,
    0,
    'sabine-wren--galvanized-revolutionary',
    'command-center',
  );
  const rival = await addDeck(
    'Vader • Imperial command',
    guest!.userId,
    0,
    'darth-vader--dark-lord-of-the-sith',
    'command-center',
  );
  await addDeck('Public explorer ' + prefix, guest!.userId, 1);
  const unlisted = await addDeck('Shared tactics ' + prefix, guest!.userId, 2);
  for (let i = 0; i < 22; i++)
    await addDeck(`Training ${String(i + 1).padStart(2, '0')}`, host!.userId);
  const unsupported = await addDeck('Missing leader', host!.userId, 0, 'not-a-real-leader');
  await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${unsupported},'another-unknown-card',1,2),(${unsupported},'command-center',1,1)`;
  const oldDeck = await addDeck('Older deck, recently edited', users[2]!.userId);
  const newDeck = await addDeck('Newest created deck', users[2]!.userId);
  await sql`UPDATE deck SET created_at = now() - interval '1 day', updated_at = now() + interval '1 day' WHERE id = ${oldDeck}`;
  const lobby = await service.create({ userId: host!.userId, sessionId: host!.sessionId }, main, {
    allowSpectators: true,
    handsToPlayers: false,
    handsToSpectators: false,
  });
  await service.join({ userId: guest!.userId, sessionId: guest!.sessionId }, lobby.id, rival, {
    allowSpectators: true,
    handsToPlayers: false,
    handsToSpectators: false,
  });
  // List-only activity fixtures; no report notification row or outbound delivery.
  const gameId = (await service.get(
    { userId: host!.userId, sessionId: host!.sessionId },
    lobby.id,
  ))!.gameId!;
  const position = 'a'.repeat(32),
    branch = 'b'.repeat(32);
  await sql`INSERT INTO play.bookmarks(id,user_id,game_id,position,branch,label) VALUES (${randomUUID()},${host!.userId},${gameId},${position},${branch},'Before the decisive attack')`;
  await sql`INSERT INTO play.practice_requests(id,source_game_id,requester_id,opponent_id,position,branch,label,game_id,lobby_id,expires_at)
    VALUES (${randomUUID()},${gameId},${host!.userId},${guest!.userId},${position},${branch},'Try another opening',${'practice-' + randomUUID()},${randomUUID()},now()+interval '1 hour')`;
  await sql`INSERT INTO play.problem_reports(id,user_id,game_id,position,branch,label,description,status)
    VALUES (${randomUUID()},${host!.userId},${gameId},${position},${branch},'Attack target highlight','Synthetic screenshot fixture for an earlier targeting issue.','resolved')`;
  const signed = (
    await serializeSignedCookie(cookieName, host!.token, process.env.BETTER_AUTH_SECRET!)
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
  await page.goto(origin + '/crossfire');
  await expect(page.getByText('Ready for Crossfire practice.', { exact: true })).toBeVisible();
  await expect(page.locator('.cf-selected-deck strong')).toHaveText(
    'Ahsoka • A little unconventional',
  );
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await expect(
    page.getByRole('link', { name: 'Return to game against Nova', exact: true }).first(),
  ).toHaveAttribute('href', '/crossfire/' + lobby.id);
  await expect(page.locator('.cf-deck-row')).toHaveCount(1);
  await layout();
  for (const dark of [true, false]) {
    await theme(dark);
    await shot(dark ? 'desktop-dark' : 'desktop-light');
  }
  await theme(true);
  await expect(page.locator('.cf-running-list .cf-game-artwork img')).toHaveCount(2);
  for (const [tab, screenshot] of [
    ['Bookmarks', 'saved-positions'],
    ['Bug reports', 'reports'],
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.locator('.cf-saved-activity .cf-game-artwork img')).toHaveCount(2);
    await shot(screenshot!);
  }
  await page.getByRole('tab', { name: 'Bookmarks', exact: true }).click();
  await page.getByRole('button', { name: 'Your decks', exact: true }).click();
  await expect(page.locator('.cf-deck-row')).toHaveCount(20);
  await page.getByRole('button', { name: 'Load more decks', exact: true }).click();
  await expect(page.locator('.cf-deck-row')).toHaveCount(25);
  await layout();
  const search = page.getByRole('searchbox', { name: 'Search decks or paste a deck link' });
  await search.fill('Sabine');
  await expect(page.locator('.cf-deck-row')).toHaveCount(1);
  const deckControls = await page.locator('.cf-deck-option').evaluate(row => {
    const eye = row.querySelector('.cf-deck-preview-button')!.getBoundingClientRect();
    const check = row.querySelector('.cf-deck-row-check')!.getBoundingClientRect();
    return { eyeRight: eye.right, checkLeft: check.left };
  });
  expect(deckControls.eyeRight).toBeLessThan(deckControls.checkLeft);
  await page
    .getByRole('button', { name: 'View decklist: Sabine • Fast company', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Battlefield Marine');
  const deckDialog = page.getByRole('dialog', { name: 'Decklist', exact: true });
  await expect(deckDialog.getByRole('heading', { name: 'Sabine • Fast company' })).toBeVisible();
  for (const cardId of ['sabine-wren--galvanized-revolutionary', 'command-center']) {
    const cardImage = deckDialog.getByRole('img', { name: `card-${cardId}`, exact: true }).first();
    await expect(cardImage).toBeVisible();
    expect((await cardImage.boundingBox())!.width).toBeGreaterThanOrEqual(280);
  }
  await expect(page.locator('.cf-selected-deck strong')).toHaveText(
    'Ahsoka • A little unconventional',
  );
  await shot('deck-preview');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await deckDialog.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
  await shot('deck-preview-mobile');
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'View decklist: Sabine • Fast company', exact: true }),
  ).toBeFocused();
  await page.locator('.cf-deck-row').click();
  await expect(page.locator('.cf-deck-row')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Sabine • Fast company');
  await page.getByRole('button', { name: 'Your decks', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Public decks', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await search.fill(prefix);
  await expect(page.locator('.cf-deck-row')).toHaveCount(1);
  await expect(page.locator('.cf-deck-row')).toContainText('Public explorer');
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Sabine • Fast company');
  await page.locator('.cf-deck-row').click();
  await expect(page.getByText('Ready for Crossfire practice.', { exact: true })).toBeVisible();
  await search.fill('no-result-' + prefix);
  await expect(page.getByText('No matching decks', { exact: true })).toBeVisible();
  await layout();
  await search.fill('');
  await search.evaluate(
    (input, link) => {
      const data = new DataTransfer();
      data.setData('text/plain', link);
      input.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    },
    'https://swubase.com/decks/' + unlisted + '?source=' + 'x'.repeat(200),
  );
  await expect(search).toHaveValue('');
  await expect(page.locator('.cf-deck-group[data-state="open"]')).toHaveCount(0);
  await expect(page.locator('.cf-linked-deck .cf-deck-row')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Shared tactics ' + prefix);
  await expect(page.getByText('Ready for Crossfire practice.', { exact: true })).toBeVisible();
  await page.goto(origin + '/decks/' + sabine);
  const play = page.getByRole('link', { name: 'Play', exact: true });
  await expect(play).toHaveAttribute('href', '/crossfire?cfDeck=' + sabine);
  await expect(play.locator('[data-crossfire-logo]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Image', exact: true })).toBeVisible();
  await shot('deck-detail-play');
  await play.click();
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Sabine • Fast company');
  await expect(page.locator('.cf-linked-deck .cf-deck-row')).toContainText('Sabine • Fast company');
  await expect(page.locator('.cf-deck-group[data-state="open"]')).toHaveCount(0);
  await layout();
  await shot('linked-deck');
  await page.reload();
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Sabine • Fast company');
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Sabine • Fast company');
  // An inaccessible explicit URL must not silently substitute an automatic deck.
  await page.goto(origin + '/crossfire?cfDeck=' + rival);
  await expect(page.locator('.cf-selected-deck strong')).toHaveText('Deck unavailable');
  await expect(page.getByRole('button', { name: 'Create invitation', exact: true })).toBeDisabled();
  for (const user of users.slice(2)) {
    const other = await browser.newContext();
    const signed = (
      await serializeSignedCookie(cookieName, user.token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0]!;
    await other.addCookies([
      {
        name: cookieName,
        value: signed.slice(signed.indexOf('=') + 1),
        url: origin,
        httpOnly: true,
        secure: origin.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
    const otherPage = await other.newPage();
    await otherPage.goto(origin + '/crossfire');
    await expect(otherPage.locator('.cf-selected-deck strong')).toHaveText(
      user.name === 'Kai' ? 'Newest created deck' : 'Choose a deck to begin.',
    );
    if (user.name === 'Kai') {
      await expect(
        otherPage.getByText('Ready for Crossfire practice.', { exact: true }),
      ).toBeVisible();
      const requested = await otherPage.request.get(origin + '/api/crossfire/decks?source=mine');
      expect((await requested.json()).data[0].id).toBe(newDeck);
    } else
      await expect(
        otherPage.getByRole('button', { name: 'Create invitation', exact: true }),
      ).toBeDisabled();
    await other.close();
  }
  // Unsupported deck never enables creation; a fresh selection gets a fresh readiness query.
  await page.goto(origin + '/crossfire?cfDeck=' + unsupported);
  const warning = page.getByRole('button', { name: 'Deck needs attention', exact: true });
  const launch = page.getByRole('button', { name: 'Create invitation', exact: true });
  await expect(warning).toBeVisible();
  const warningBox = await warning.boundingBox(),
    launchBox = await launch.boundingBox();
  expect(Math.abs(warningBox!.y - launchBox!.y)).toBeLessThan(2);
  await shot('deck-attention');
  await warning.click();
  await expect(page.locator('[data-deck-issue="unknown-card"] li')).toHaveCount(2);
  await expect(page.locator('[data-deck-issue="wrong-role"] li')).toHaveCount(1);
  await expect(page.locator('[data-deck-check-summary]')).toContainText('3 distinct cards');
  await shot('deck-check');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toBeInViewport();
  await shot('deck-check-mobile');
  await page.setViewportSize({ width: 1600, height: 1050 });
  await expect(page.getByRole('dialog')).toContainText(/not a real leader/i);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create invitation', exact: true })).toBeDisabled();
  await page.goto(origin + '/crossfire?cfDeck=' + main);
  await expect(page.getByText('Ready for Crossfire practice.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Game settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Game settings', exact: true })).toBeVisible();
  const bestOfOne = page.getByRole('radio', { name: 'Best of 1', exact: true });
  const bestOfThree = page.getByRole('radio', { name: 'Best of 3', exact: true });
  await expect(bestOfOne).toBeChecked();
  await page.getByText('Best of 1', { exact: true }).click();
  await expect(bestOfOne).toBeChecked();
  await bestOfOne.focus();
  // Radix defers the focus move; keep the key down until that move selects the radio.
  await page.keyboard.down('ArrowRight');
  await expect(bestOfThree).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await expect(bestOfOne).not.toBeChecked();
  await expect(page.locator('.cf-format-description')).toContainText('Sideboarding');
  await page.getByRole('checkbox', { name: 'Let spectators see both hands', exact: true }).check();
  await page
    .getByRole('checkbox', { name: 'Allow spectators (only with invitation link)', exact: true })
    .uncheck();
  await expect(
    page.getByRole('checkbox', { name: 'Let spectators see both hands', exact: true }),
  ).toBeDisabled();
  await shot('game-settings');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(bestOfThree).toBeChecked();
  for (const name of ['Bookmarks', 'Bug reports']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  for (const width of [1024, 740, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await layout();
    if (width === 320) {
      for (const name of ['Bookmarks', 'Bug reports']) {
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(page.locator('.cf-saved-activity .cf-game-row')).toBeVisible();
        await layout();
      }
    }
    if (width === 390) {
      for (const dark of [true, false]) {
        await theme(dark);
        await page.locator('.cf-deck-picker').scrollIntoViewIfNeeded();
        await shot(dark ? 'mobile-dark' : 'mobile-light');
        await page
          .getByRole('button', { name: 'Create invitation', exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          page.getByRole('button', { name: 'Create invitation', exact: true }),
        ).toBeInViewport();
        await shot(dark ? 'mobile-play-dark' : 'mobile-play-light');
      }
    }
  }
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await touch.addCookies(await context.cookies());
  const touchPage = await touch.newPage();
  await touchPage.goto(origin + '/crossfire?cfDeck=' + main);
  await expect(touchPage.getByText('Ready for Crossfire practice.', { exact: true })).toBeVisible();
  const touchDismiss = touchPage.getByRole('button', { name: 'Dismiss', exact: true });
  if (await touchDismiss.isVisible()) await touchDismiss.tap();
  await touchPage.getByText('Best of 3', { exact: true }).tap();
  await expect(touchPage.getByRole('radio', { name: 'Best of 3', exact: true })).toBeChecked();
  await touchPage.getByText('Best of 1', { exact: true }).tap();
  await expect(touchPage.getByRole('radio', { name: 'Best of 1', exact: true })).toBeChecked();
  await touchPage.getByRole('button', { name: 'Your decks', exact: true }).tap();
  await expect(touchPage.locator('.cf-deck-source-panel .cf-deck-row')).toHaveCount(20);
  await touchPage.getByRole('button', { name: 'Public decks', exact: true }).tap();
  await expect(
    touchPage.getByRole('button', { name: 'Public decks', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await touch.close();
  await page.setViewportSize({ width: 1600, height: 1050 });
  // Browser submission still goes through ordinary lobby admission with the selected policy.
  const sent = page.waitForRequest(
    r => r.method() === 'POST' && new URL(r.url()).pathname === '/api/crossfire/lobbies',
  );
  await page.getByRole('button', { name: 'Create invitation', exact: true }).click();
  const body = (await sent).postDataJSON();
  expect(body).toEqual({
    deckId: main,
    bestOf: 3,
    showLeader: true,
    policy: { allowSpectators: false, handsToPlayers: false, handsToSpectators: false },
  });
  await expect(
    page.getByRole('heading', { name: 'Waiting for your opponent', exact: true }),
  ).toBeVisible();

  // Real site-wide sockets, two accounts and a second recipient tab. No Discord calls.
  const guestContext = await browser.newContext({ viewport: { width: 1600, height: 1050 } });
  const guestCookie = (
    await serializeSignedCookie(cookieName, guest!.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await guestContext.addCookies([
    {
      name: cookieName,
      value: guestCookie.slice(guestCookie.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  const guestPage = await guestContext.newPage();
  const otherTab = await guestContext.newPage();
  const frames: string[] = [],
    otherFrames: string[] = [];
  for (const [target, received] of [
    [guestPage, frames],
    [otherTab, otherFrames],
  ] as const) {
    await target.addInitScript(() => {
      const Native = window.WebSocket;
      const sockets: WebSocket[] = [];
      (window as unknown as { invitationTestSockets: WebSocket[] }).invitationTestSockets = sockets;
      window.WebSocket = class extends Native {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          sockets.push(this);
        }
      };
    });
    await target.addLocatorHandler(
      target.getByRole('button', { name: 'Dismiss', exact: true }),
      async () => {
        await target.getByRole('button', { name: 'Dismiss', exact: true }).click();
      },
    );
    target.on('pageerror', error => errors.push(error.message));
    target.on('websocket', socket => {
      if (socket.url().includes('/api/ws/invitations/crossfire'))
        socket.on('framereceived', frame => received.push(String(frame.payload)));
    });
    await target.goto(origin + '/crossfire?cfDeck=' + rival);
    const dismiss = target.getByRole('button', { name: 'Dismiss', exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    await expect.poll(() => received.some(f => f.includes('crossfire.connected'))).toBe(true);
  }
  const connectedBefore = otherFrames.filter(f => f.includes('crossfire.connected')).length;
  await otherTab.evaluate(() => {
    const sockets = (window as unknown as { invitationTestSockets: WebSocket[] })
      .invitationTestSockets;
    for (const socket of sockets)
      if (socket.url.includes('/api/ws/invitations/crossfire')) socket.close();
  });
  await expect
    .poll(() => otherFrames.filter(f => f.includes('crossfire.connected')).length)
    .toBeGreaterThan(connectedBefore);
  await guestPage.goto(origin + '/decks/your');
  await expect(
    guestPage.getByText('Vader • Imperial command', { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('region', { name: 'Waiting for your opponent', exact: true })
    .getByRole('button', { name: 'Cancel invitation', exact: true })
    .click();
  await page.goto(origin + '/crossfire?cfDeck=' + main);
  await expect(
    page.getByRole('checkbox', { name: 'Show my leader before game', exact: true }),
  ).toBeChecked();
  await page.getByText('Best of 3', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Best of 3', exact: true })).toBeChecked();
  const teammateSection = page.getByRole('region', { name: 'Invitations and teammates' });
  await expect(teammateSection).toContainText('Nova');
  await expect(teammateSection).not.toContainText('private account name');
  const teammateButton = page.getByRole('button', { name: 'Select teammate Nova', exact: true });
  const otherTeammate = page.getByRole('button', { name: 'Select teammate Kai', exact: true });
  await expect(teammateButton).toHaveText('Nova');
  await expect(teammateButton).toHaveAttribute('aria-pressed', 'false');
  await teammateSection.getByRole('button', { name: 'Info', exact: true }).click();
  await expect(page.getByText(/Nothing is sent until you confirm/)).toBeVisible();
  await page.keyboard.press('Escape');
  const sentBeforeDraft =
    await sql`SELECT id FROM play.lobbies WHERE creator_user_id = ${host!.userId}`;
  // Drafting works before deck readiness too: an invalid linked deck cannot accidentally be sent.
  const deckSearch = page.getByRole('searchbox', { name: 'Search decks or paste a deck link' });
  await deckSearch.fill(randomUUID());
  await teammateButton.click();
  await expect(teammateButton).toBeFocused();
  await expect(teammateButton).toHaveAttribute('aria-pressed', 'true');
  await expect(teammateButton.locator('.cf-deck-row-check svg')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Invite Nova', exact: true })).toHaveCount(0);
  const sendInvitation = page.getByRole('button', { name: 'Send invitation to Nova', exact: true });
  await expect(sendInvitation).toBeDisabled();
  await otherTeammate.click();
  await expect(otherTeammate).toHaveAttribute('aria-pressed', 'true');
  await expect(teammateButton).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByRole('button', { name: 'Send invitation to Kai', exact: true }),
  ).toBeDisabled();
  await otherTeammate.click();
  await expect(otherTeammate).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Create invitation', exact: true })).toBeVisible();
  await teammateButton.focus();
  await page.keyboard.press('Enter');
  // Change the deck AFTER choosing the teammate, then explicitly send the reviewed selection.
  await deckSearch.fill(main);
  await expect(sendInvitation).toBeEnabled();
  await expect(teammateButton).toHaveCSS(
    'border-color',
    await page
      .locator('.cf-deck-row[aria-pressed="true"]')
      .evaluate(row => getComputedStyle(row).borderColor),
  );
  await shot('teammate-invitation-draft');
  await page.setViewportSize({ width: 390, height: 844 });
  await teammateButton.click();
  await expect(teammateButton).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  await expect(teammateButton).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot('teammate-invitation-draft-mobile');
  await page.setViewportSize({ width: 1600, height: 1050 });
  const sentAfterDraft =
    await sql`SELECT id FROM play.lobbies WHERE creator_user_id = ${host!.userId}`;
  expect(sentAfterDraft).toEqual(sentBeforeDraft);
  await sendInvitation.click();
  const popup = guestPage.getByRole('dialog', { name: 'Crossfire invitation', exact: true });
  await expect(popup).toBeVisible({ timeout: 5000 });
  await expect(popup).toContainText('Alex');
  await expect(popup).not.toContainText('private account name');
  const [sentDeck] = await sql`SELECT p.deck_snapshot->>'sourceDeckId' AS deck_id, l.best_of
    FROM play.lobbies l JOIN play.participants p ON p.lobby_id = l.id AND p.seat = 'p1'
    JOIN play.invitations i ON i.lobby_id = l.id
    WHERE l.creator_user_id = ${host!.userId} AND i.recipient_user_id = ${guest!.userId}
      AND l.status = 'waiting'`;
  expect(sentDeck).toMatchObject({ deck_id: main, best_of: 3 });
  await expect(popup.locator('.cf-invite-portraits img')).toHaveCount(2);
  await expect(otherTab.getByLabel('1 Crossfire invitations', { exact: true })).toBeVisible({
    timeout: 5000,
  });
  await shot('incoming-invitation', guestPage);
  await shot('invitation-count', otherTab);
  await shot('host-waiting');
  await popup.getByRole('link', { name: 'Open invitation', exact: true }).click();
  await expect(
    guestPage.getByRole('heading', { name: 'Choose your deck', exact: true }),
  ).toBeVisible();
  await expect(
    guestPage.getByRole('checkbox', { name: 'Play with open hands', exact: true }),
  ).toBeDisabled();
  await expect(guestPage.getByRole('radio', { name: 'Best of 3', exact: true })).toBeDisabled();
  await expect(guestPage.locator('.cf-lobby-banner')).toContainText(
    'Alex invited you to Crossfire',
  );
  await expect(
    guestPage.getByRole('button', { name: 'Accept invitation and play', exact: true }),
  ).toBeEnabled();
  await shot('accept-invitation', guestPage);
  const beforeAccept = otherFrames.length;
  await guestPage.getByRole('button', { name: 'Accept invitation and play', exact: true }).click();
  await expect(guestPage).toHaveURL(/\/crossfire\/[0-9a-f-]{36}$/);
  await expect(page).toHaveURL(/\/crossfire\/[0-9a-f-]{36}$/, { timeout: 5000 });
  await expect(otherTab.getByLabel('1 Crossfire invitations', { exact: true })).toHaveCount(0, {
    timeout: 5000,
  });
  expect(otherFrames.slice(beforeAccept).some(f => f.includes('crossfire.invitation'))).toBe(true);
  // Expire a hidden-leader invite in PostgreSQL while recipient tabs stay open.
  await page.goto(origin + '/crossfire?cfDeck=' + main);
  await page.getByRole('checkbox', { name: 'Show my leader before game', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Select teammate Nova', exact: true }).click();
  await page.getByRole('button', { name: 'Send invitation to Nova', exact: true }).click();
  await expect(
    otherTab.getByRole('dialog', { name: 'Crossfire invitation', exact: true }),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    otherTab.getByRole('dialog', { name: 'Crossfire invitation', exact: true }).locator('img'),
  ).toHaveCount(2); // two theme logos, no leader/base
  const response = await otherTab.request.get(origin + '/api/crossfire/invitations');
  const hidden = (await response.json()).data.find(
    (i: { direction: string }) => i.direction === 'incoming',
  );
  expect(hidden).not.toHaveProperty('leaderId');
  expect(hidden).not.toHaveProperty('baseId');
  await shot('hidden-leader-invitation', otherTab);
  const beforeExpire = otherFrames.length;
  await sql`UPDATE play.lobbies SET expires_at = clock_timestamp() - interval '1 second' WHERE id = ${hidden.lobbyId}`;
  await expect(otherTab.getByLabel('1 Crossfire invitations', { exact: true })).toHaveCount(0, {
    timeout: 5000,
  });
  await expect(
    otherTab.getByRole('dialog', { name: 'Crossfire invitation', exact: true }),
  ).toHaveCount(0);
  expect(otherFrames.slice(beforeExpire).some(f => f.includes('crossfire.invitation'))).toBe(true);
  await expect(page.getByText('This invitation has expired.', { exact: true })).toBeVisible({
    timeout: 5000,
  });
  for (const frame of [...frames, ...otherFrames]) {
    expect(frame).not.toContain(main);
    expect(frame).not.toContain('battlefield-marine');
    expect(frame).not.toContain('ahsoka-tano');
    expect(frame).not.toContain('command-center');
  }
  // Existing direct links use the same deck picker, and a stale link cannot join.
  await otherTab.goto(origin + '/crossfire/' + hidden.lobbyId);
  await expect(otherTab.getByText('This invitation has expired.', { exact: true })).toBeVisible();

  // Close a legacy incompatible game from its stopped screen; the other account
  // must lose the running-game row through its account socket without reloading.
  await sql`UPDATE play.games SET versions = ${sql.json({ ...versions, engine: 'legacy-browser-fixture' })} WHERE id = ${gameId}`;
  await sql`DELETE FROM play.matches WHERE id = ${lobby.id}`;
  await otherTab.goto(origin + '/crossfire');
  const guestRunning = otherTab.locator('.cf-running-games');
  await expect(guestRunning.locator(`a[href="/crossfire/${lobby.id}"]`)).toBeVisible();
  await page.goto(origin + '/crossfire/' + lobby.id);
  await expect(
    page.getByText('This game uses an older Crossfire version and cannot be resumed.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.cf-header-phase')).toHaveText('Disconnected');
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toHaveCount(0);
  await shot('unavailable-game');
  await page.getByRole('button', { name: 'Leave game', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toContainText('no winner');
  await shot('close-game-confirmation');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot('close-game-mobile');
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.getByRole('button', { name: 'Close game', exact: true }).click();
  await expect(page).toHaveURL(origin + '/crossfire');
  await expect(guestRunning.locator(`a[href="/crossfire/${lobby.id}"]`)).toHaveCount(0);
  await expect(page.getByText('Abandoned — incompatible version')).toBeVisible();
  await shot('closed-game-history');

  // The accepted BO3 remains on the guest board. Conceding just this game keeps
  // the match open; leaving during sideboarding then forfeits the match.
  const matchUrl = guestPage.url();
  await page.goto(matchUrl);
  await expect(page.locator('.cf-connection')).toHaveText('Connected');
  await page.getByRole('button', { name: 'Leave game', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Concede current game', exact: true }),
  ).toBeVisible();
  await shot('leave-match-options');
  await page.getByRole('button', { name: 'Concede current game', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your opponent won this game', exact: true }),
  ).toBeVisible();
  await expect(
    guestPage.getByRole('heading', { name: 'You won this game', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ready for next game', exact: true })).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Leave game', exact: true }).click();
  await page.getByRole('button', { name: 'Leave match', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your opponent won the match', exact: true }),
  ).toBeVisible();
  await expect(
    guestPage.getByRole('heading', { name: 'You won the match', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('You forfeited the match. Your game history and replays are saved.', {
      exact: true,
    }),
  ).toBeVisible();
  await shot('forfeited-match');
  await page.getByRole('link', { name: 'Back to Crossfire', exact: true }).last().click();
  // Home rows offer the same exit without opening a board or connecting a game socket.
  const homeLobby = await service.create(
    { userId: host!.userId, sessionId: host!.sessionId },
    main,
    {
      allowSpectators: true,
      handsToPlayers: false,
      handsToSpectators: false,
    },
  );
  await service.join({ userId: guest!.userId, sessionId: guest!.sessionId }, homeLobby.id, rival, {
    allowSpectators: true,
    handsToPlayers: false,
    handsToSpectators: false,
  });
  await page.reload();
  await otherTab.reload();
  const homeRow = page
    .locator('.cf-running-games article')
    .filter({ has: page.locator(`a[href="/crossfire/${homeLobby.id}"]`) });
  await homeRow.getByRole('button', { name: 'Leave game', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave game', exact: true }).click();
  await expect(page.locator(`.cf-running-games a[href="/crossfire/${homeLobby.id}"]`)).toHaveCount(
    0,
  );
  await expect(
    otherTab.locator(`.cf-running-games a[href="/crossfire/${homeLobby.id}"]`),
  ).toHaveCount(0);
  await shot('finished-games');
  await sql`UPDATE session SET expires_at = now() - interval '1 second' WHERE id = ${guest!.sessionId}`;
  const rejectedCode = await otherTab.evaluate(
    () =>
      new Promise<number>(resolve => {
        const url = new URL('/api/ws/invitations/crossfire', location.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(url);
        ws.onclose = event => resolve(event.code);
        setTimeout(() => {
          ws.close();
          resolve(-1);
        }, 5000);
      }),
  );
  expect(rejectedCode).toBe(4401);
  await guestContext.close();
  expect(errors).toEqual([]);
  const gallery = [
    ['teammate-invitation-draft', 'Teammate invitation · Review before sending'],
    ['teammate-invitation-draft-mobile', 'Teammate invitation · Mobile review'],
    ['unavailable-game', 'Older game · Clear connection error'],
    ['close-game-confirmation', 'Close an incompatible game'],
    ['close-game-mobile', 'Close game · Mobile'],
    ['closed-game-history', 'Abandoned game retained in history'],
    ['leave-match-options', 'BO3 · Concede a game or leave the match'],
    ['forfeited-match', 'Forfeited match · Result and replay'],
    ['finished-games', 'Finished games · Both accounts updated'],
    ['incoming-invitation', 'Incoming invitation anywhere on SWUBASE'],
    ['accept-invitation', 'Accept invitation · Choose your deck'],
    ['host-waiting', 'Host · Waiting for your opponent'],
    ['invitation-count', 'Live invitations and sidebar count'],
    ['hidden-leader-invitation', 'Hidden leader and base'],
    ['desktop-dark', 'Desktop · Dark'],
    ['desktop-light', 'Desktop · Light'],
    ['linked-deck', 'Selected linked deck'],
    ['deck-attention', 'Deck needs attention'],
    ['deck-check', 'Grouped deck check'],
    ['deck-check-mobile', 'Deck check · Mobile'],
    ['saved-positions', 'Saved positions'],

    ['reports', 'Problem reports'],
    ['deck-preview', 'Decklist preview'],
    ['deck-preview-mobile', 'Full decklist preview · Mobile'],
    ['deck-detail-play', 'Play from deck detail'],
    ['game-settings', 'Inline game settings'],
    ['mobile-dark', 'Mobile · Deck selector'],
    ['mobile-play-dark', 'Mobile · Play and running games'],
    ['mobile-light', 'Mobile · Light'],
    ['mobile-play-light', 'Mobile · Play in light mode'],
  ];
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crossfire · Play desk screenshots</title>
    <style>body{background:#0b1119;color:#eef6f6;font:15px system-ui;padding:24px;max-width:1400px;margin:auto}a{color:#7adbd1}nav{display:flex;flex-wrap:wrap;gap:16px}section{padding:16px;border:1px solid #2b3945;border-radius:12px;margin:24px 0}h2{font-size:17px}img{display:block;max-width:100%;height:auto;margin:auto;border-radius:7px}.mobile img{max-width:min(100%,390px)}</style>
    <h1>Crossfire · Play desk</h1><p>The real local SWUBASE page with synthetic decks and activity.</p><p><a href="/crossfire">Open Crossfire</a></p>
    <nav>${gallery.map(([name, title]) => `<a href="#${name}">${title}</a>`).join('')}</nav>
    ${gallery.map(([name, title]) => `<section id="${name}" class="${name!.includes('mobile') ? 'mobile' : 'desktop'}"><h2>${title}</h2><a href="${name}.png" target="_blank"><img src="${name}.png" alt="${title}" loading="lazy"></a></section>`).join('')}</html>`;
  await writeFile(`${screenshots}/index.html`, html);
  // Development-only directory outside public/; never included in production builds.
  const served = `frontend/${screenshots}`;
  await mkdir(served, { recursive: true });
  await copyFile(`${screenshots}/index.html`, `${served}/index.html`);
  await Promise.all(
    gallery.map(([name]) => copyFile(`${screenshots}/${name}.png`, `${served}/${name}.png`)),
  );
  console.log(
    'Crossfire home: linked selection, deck checks, activity artwork, search, paging, responsive layouts, settings and invitation passed.',
  );
} catch (error) {
  await shot('failure');
  console.error((await page.locator('body').innerText()).slice(-2000));
  throw error;
} finally {
  await browser.close();
  const lobbies =
    await sql`SELECT id, game_id FROM play.lobbies WHERE creator_user_id = ANY(${users.map(u => u.userId)})`;
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbies.map(l => l.id)})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${lobbies.flatMap(l => (l.game_id ? [l.game_id] : []))})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck_information WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck WHERE id = ANY(${decks})`;
  await sql`DELETE FROM team WHERE id = ${teamId}`;
  await sql`DELETE FROM session WHERE user_id = ANY(${users.map(u => u.userId)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${users.map(u => u.userId)})`;
  await sql.end();
}
