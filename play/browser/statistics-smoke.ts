// Real local account/API/socket acceptance; no external notification endpoints.
import { chromium, expect, type BrowserContext, type Page } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { choose, ids } from '../testing/helpers.ts';
import { verifyHistory } from '../history/records.ts';
import { practiceCheckpoint } from '../history/practice.ts';
import { decodeState } from '../engine/checkpoint.ts';
import type { GameState } from '../engine/model.ts';
import type { GameResult } from '../../server/db/schema/game_result.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Select the running local worktree DB explicitly');
if (
  !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const browser = await chromium.launch();
const users = ['Alex', 'Nova'].map(name => ({
  name,
  userId: `statistics-browser-${randomUUID()}`,
  sessionId: randomUUID(),
  token: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b] = users as [(typeof users)[number], (typeof users)[number]];
const teams = [randomUUID(), randomUUID()];
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog),
  matches = new CrossfireMatches(sql, catalog),
  store = new PostgresGameStore(sql);
const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
const cookieName = getCookies({
  baseURL: origin,
  advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
}).sessionToken.name;
const contexts: BrowserContext[] = [],
  errors: string[] = [];
async function open(p: typeof a) {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  contexts.push(context);
  const signed = (
    await serializeSignedCookie(cookieName, p.token, process.env.BETTER_AUTH_SECRET!)
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
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on('pageerror', e => errors.push(e.message));
  const events: string[] = [];
  page.on('websocket', socket => {
    if (socket.url().includes('/ws/game-results'))
      socket.on('framereceived', ({ payload }) => events.push(String(payload)));
  });
  await page.goto(`${origin}/statistics/history`);
  const dismissCookies = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismissCookies.count()) await dismissCookies.click();
  await expect(page.getByText('No matches found.', { exact: true })).toBeVisible();
  await expect.poll(() => events.some(e => e.includes('game_results.connected'))).toBe(true);
  return { page, context, events };
}
async function verifyScoreReplays(page: Page) {
  const replays = page.getByRole('link', { name: /^Replay game \d+$/ });
  expect(await replays.count()).toBeGreaterThan(0);
  for (const replay of await replays.all()) {
    await expect(replay).toBeVisible();
    await expect(replay.locator('svg')).toHaveCount(1);
    const layout = await replay.evaluate(link => {
      const score = link.closest('h3')!;
      const card = score.closest('.overflow-hidden')!;
      const buttonBounds = link.getBoundingClientRect();
      const scoreBounds = score.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      return {
        visibleText: (link as HTMLElement).innerText.trim(),
        rightOfScore: buttonBounds.left >= scoreBounds.right,
        centeredOnScore:
          Math.abs(
            buttonBounds.top + buttonBounds.height / 2 - (scoreBounds.top + scoreBounds.height / 2),
          ) < 2,
        insideCard: buttonBounds.right <= cardBounds.right,
        centeredScore:
          Math.abs(
            scoreBounds.left + scoreBounds.width / 2 - (cardBounds.left + cardBounds.width / 2),
          ) < 2,
        originalNamePlacement: getComputedStyle(card.querySelector('.top-14')!).position,
      };
    });
    expect(layout).toEqual({
      visibleText: '',
      rightOfScore: true,
      centeredOnScore: true,
      insideCard: true,
      centeredScore: true,
      originalNamePlacement: 'absolute',
    });
  }
}
async function verifyDeckArtwork(page: Page, screenshot: string) {
  const card = page.locator('[class~="@container/deck-statistics-item"]').first();
  await expect(card).toBeVisible();
  await expect(card.locator('img[alt=""]')).toHaveCount(1);
  await card.evaluate(async card => {
    await Promise.all([...card.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
  });
  await card.screenshot({ path: `.swubase/crossfire-home/${screenshot}.png` });
  const artwork = await card.evaluate(card => {
    const leader = card.querySelector('img[alt=""]')!.parentElement!.getBoundingClientRect();
    const badge = card.querySelector('.rotate-25 > div')!.getBoundingClientRect();
    return {
      badgeHorizontalRatio: (badge.left + badge.width / 2 - leader.left) / leader.width,
      badgeVerticalRatio: (badge.top + badge.height / 2 - leader.top) / leader.height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  // The base badge belongs at the portrait's upper-right edge, not over its left/middle.
  expect(artwork.badgeHorizontalRatio).toBeGreaterThan(0.65);
  expect(artwork.badgeHorizontalRatio).toBeLessThan(1.1);
  expect(artwork.badgeVerticalRatio).toBeGreaterThan(0);
  expect(artwork.badgeVerticalRatio).toBeLessThan(0.25);
  expect(artwork.overflow).toBe(false);
}
async function finish(lobbyId: string, play = false) {
  const lobby = (await lobbies.get(principal(a), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, `statistics-browser-${randomUUID()}`, 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  const submit = async (input: ReturnType<typeof choose>) => {
    if (input.type === 'random') throw new Error('Player command expected');
    await host.submit(input.playerId, randomUUID(), input);
  };
  if (play) {
    await submit(choose(host.state, i => i.kind === 'initiative' && i.playerId === 'p1'));
    for (let i = 0; i < 2; i++)
      await submit(choose(host.state, i => i.kind === 'mulligan' && !i.take));
    for (let i = 0; i < 2; i++)
      await submit(
        choose(host.state, 'resource', host.state.execution.decision!.selection!.cards.slice(0, 2)),
      );
    await submit(choose(host.state, 'play'));
  }
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.release(lease);
  const child = Bun.spawn([process.execPath, 'play/history/finalizer-process.ts', lobby.gameId!], {
    env: { ...process.env, CROSSFIRE_FINALIZER_CHILD: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stderr).text()).toBe('');
}
async function fork(sourceLobbyId: string, early = false) {
  const sourceLobby = (await lobbies.get(principal(a), sourceLobbyId))!;
  const history = await store.readHistory(sourceLobby.gameId!);
  let target: GameState = decodeState(history.checkpoint.checkpoint);
  if (!early)
    verifyHistory(history, (before, after) => {
      if (after.result) target = before;
    });
  const gameId = `statistics-browser-practice-${randomUUID()}`,
    lobbyId = randomUUID();
  await store.create(practiceCheckpoint(target, gameId));
  const provenance = {
    kind: 'practice',
    sourceGameId: history.gameId,
    position: early ? 'setup-position' : 'late-position',
    branch: 'branch',
    sourceHash: 'private-fixture',
  };
  await sql`UPDATE play.games SET provenance = ${sql.json(provenance)} WHERE id = ${gameId}`;
  await sql`INSERT INTO play.lobbies(id,creator_user_id,game_id,status,versions)
    SELECT ${lobbyId},creator_user_id,${gameId},'started',versions FROM play.lobbies WHERE id = ${sourceLobbyId}`;
  await sql`INSERT INTO play.participants(lobby_id,seat,user_id,session_id,deck_snapshot)
    SELECT ${lobbyId},seat,user_id,session_id,deck_snapshot FROM play.participants WHERE lobby_id = ${sourceLobbyId}`;
  await finish(lobbyId, early);
  return lobbyId;
}
async function verifyLegacyCache(sourceContext: BrowserContext, playedDate: string) {
  const context = await browser.newContext();
  contexts.push(context);
  await context.addCookies(await sourceContext.cookies());
  const page = await context.newPage();
  await page.route('**/cache-upgrade-fixture', route =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>Cache fixture</body></html>' }),
  );
  await page.goto(`${origin}/cache-upgrade-fixture`);
  const rows: GameResult[] = await (await context.request.get(`${origin}/api/game-results`)).json();
  const legacy = rows.find(row => row.statisticsScope === 'practice')!;
  delete legacy.statisticsScope;
  legacy.updatedAt = '2026-01-01 00:00:00';
  await page.evaluate(
    async ({ row, scopeId }) => {
      // Native IndexedDB version 90 is Dexie version 9. Reproduce the prior schema.
      const schemas: Record<string, string> = {
        tournamentDecks: 'id',
        tournamentMatches: 'id',
        cardVariantPrices: 'id,cardId,variantId,sourceType,fetchedAt',
        cardVariantPriceFetchList: 'id,cardId,variantId,addedAt',
        userSettings: 'key',
        dailySnapshots: 'date',
        collections: 'id',
        collectionCards: 'collectionId',
        cardListCache: 'key',
        gameResults:
          '[scopeId+id],[scopeId+updatedAt],[scopeId+deckId],[scopeId+format],[scopeId+leaderCardId],[scopeId+leaderCardId+baseCardKey]',
      };
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('SwuBaseDB', 90);
        request.onupgradeneeded = () => {
          const keyPath = (key: string) =>
            key.startsWith('[') ? key.slice(1, -1).split('+') : key;
          for (const [name, schema] of Object.entries(schemas)) {
            const [primary, ...indices] = schema.split(',');
            const store = request.result.createObjectStore(name, { keyPath: keyPath(primary!) });
            for (const index of indices) store.createIndex(index, keyPath(index));
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('gameResults', 'readwrite');
        tx.objectStore('gameResults').put({ ...row, scopeId });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      database.close();
    },
    { row: legacy, scopeId: a.userId },
  );
  await page.route('**/api/game-results?*', route =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto(
    `${origin}/statistics/history?sDateRangeFrom=${playedDate}&sDateRangeTo=${playedDate}`,
  );
  await expect(page.getByText('No matches found.', { exact: true })).toBeVisible();
  await expect(page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await page.goto(
    `${origin}/statistics/dashboard?sDateRangeFrom=${playedDate}&sDateRangeTo=${playedDate}`,
  );
  await expect(page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/game-results?*');
  await page.goto(
    `${origin}/statistics/history?sDateRangeFrom=${playedDate}&sDateRangeTo=${playedDate}`,
  );
  await page.reload();
  await expect(page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await expect(page.getByText('2 - 0', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
}
try {
  for (const p of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role)
      VALUES (${p.userId},${p.name},${p.userId + '@invalid.local'},false,now(),now(),${p.name},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at)
      VALUES (${p.sessionId},${p.token},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id)
      VALUES (${p.deckId},${p.userId},${p.name + ' Crossfire deck'},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${p.deckId},${ids.marine},1,12)`;
    await sql`INSERT INTO deck_information(deck_id) VALUES (${p.deckId})`;
  }
  for (const [i, teamId] of teams.entries()) {
    await sql`INSERT INTO team(id,name) VALUES (${teamId},'Synthetic statistics team')`;
    for (const p of users)
      await sql`INSERT INTO team_member(team_id,user_id,auto_add_deck) VALUES (${teamId},${p.userId},${i === 0})`;
  }
  const lobby = await lobbies.create(principal(a), a.deckId, policy, 3);
  await lobbies.join(principal(b), lobby.id, b.deckId, policy, 3);
  const first = await open(a),
    second = await open(b);
  await finish(lobby.id, true);
  for (const tab of [first, second]) {
    await expect(tab.page.getByText('Crossfire · In progress', { exact: true })).toHaveCount(1);
    await expect(tab.page.locator('div').filter({ hasText: /^Bo3$/ })).toBeVisible();
    expect(tab.events.some(e => e.includes('game_results.changed'))).toBe(true);
  }
  const ready = {
    kind: 'next' as const,
    ready: true,
    mainboard: [{ cardId: ids.marine, quantity: 12 }],
  };
  await matches.ready(principal(a), lobby.id, ready);
  const next = (await matches.ready(principal(b), lobby.id, ready)).currentLobbyId;
  await finish(next);
  for (const [tab, p] of [
    [first, a],
    [second, b],
  ] as const) {
    await expect(tab.page.getByText('Crossfire · In progress', { exact: true })).toHaveCount(0);
    await expect(tab.page.getByText(p === a ? '2 - 0' : '0 - 2', { exact: true })).toBeVisible();
    const response = await tab.context.request.get(`${origin}/api/game-results`);
    expect(response.status()).toBe(200);
    const rows = await response.json();
    expect(rows).toHaveLength(2);
    expect(rows.every((r: any) => r.userId === p.userId && r.deckId === p.deckId)).toBe(true);
    expect(new Set(rows.map((r: any) => r.matchId)).size).toBe(1);
    await tab.page.reload();
    await expect(tab.page.getByText(p === a ? '2 - 0' : '0 - 2', { exact: true })).toBeVisible();
  }
  expect(
    await (await first.context.request.get(`${origin}/api/game-results?teamId=${teams[0]}`)).json(),
  ).toHaveLength(4);
  expect(
    await (await first.context.request.get(`${origin}/api/game-results?teamId=${teams[1]}`)).json(),
  ).toHaveLength(0);
  await mkdir('.swubase/crossfire-home', { recursive: true });
  for (const [view, path] of [
    ['list', '/statistics/decks'],
    ['detail', `/statistics/decks?sDeckId=${a.deckId}`],
  ]) {
    await first.page.goto(origin + path);
    await expect(
      first.page.getByText('Alex Crossfire deck', { exact: true }).first(),
    ).toBeVisible();
    for (const width of [1500, 900, 390]) {
      await first.page.setViewportSize({ width, height: 950 });
      for (const dark of [false, true]) {
        await first.page.evaluate(
          dark => document.documentElement.classList.toggle('dark', dark),
          dark,
        );
        await verifyDeckArtwork(
          first.page,
          `statistics-deck-${view}-${width}-${dark ? 'dark' : 'light'}`,
        );
      }
    }
  }
  await first.page.setViewportSize({ width: 1500, height: 950 });
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-deck.png',
    fullPage: true,
  });
  await second.page.screenshot({
    path: '.swubase/crossfire-home/statistics-history.png',
    fullPage: true,
  });
  // Cross the server's 25-row cursor boundary while revealing only ten at a time.
  for (let i = 0; i < 26; i++) await fork(lobby.id);
  await fork(lobby.id, true);
  await first.page.goto(`${origin}/statistics/history?sHistoryScope=practice`);
  await expect(first.page.getByText('2 - 0', { exact: true })).toBeVisible();
  await expect(first.page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await expect(first.page.getByRole('link', { name: 'Practice', exact: true })).toHaveCount(0);
  await expect(first.page.getByRole('combobox', { name: 'Games shown in history' })).toHaveCount(0);
  await expect(first.page.getByRole('link', { name: 'Replay game 1', exact: true })).toHaveCount(1);
  await expect(first.page.getByRole('link', { name: 'Replay game 2', exact: true })).toHaveCount(1);
  await verifyScoreReplays(first.page);
  await first.page.getByRole('link', { name: 'Replay game 1', exact: true }).click();
  await expect(first.page.getByLabel('Replay controls', { exact: true })).toBeVisible();
  await first.page.goBack();
  await first.page.reload();
  await expect(first.page.getByText('2 - 0', { exact: true })).toBeVisible();
  await first.page.goto(`${origin}/statistics/dashboard`);
  await expect(first.page.getByRole('link', { name: 'Replay game 1', exact: true })).toBeVisible();
  await verifyScoreReplays(first.page);
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-restored-dashboard.png',
    fullPage: true,
  });

  await first.page.goto(`${origin}/crossfire`);
  const recent = first.page.getByRole('region', { name: 'Recent games', exact: true });
  await expect(recent.locator('article')).toHaveCount(10);
  await recent.getByRole('button', { name: 'Load 10 more games', exact: true }).click();
  await expect(recent.locator('article')).toHaveCount(20);
  await first.page.route('**/api/crossfire/history?cursor=*', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"message":"Try again"}',
    }),
  );
  await recent.getByRole('button', { name: 'Load 10 more games', exact: true }).click();
  await expect(recent.getByRole('alert')).toContainText('Could not load more games', {
    timeout: 15_000,
  });
  await expect(recent.locator('article')).toHaveCount(20);
  await first.page.unroute('**/api/crossfire/history?cursor=*');
  await recent.getByRole('button', { name: 'Load 10 more games', exact: true }).click();
  await expect(recent.locator('article')).toHaveCount(29);
  await expect(recent.getByRole('button', { name: 'Load 10 more games', exact: true })).toHaveCount(
    0,
  );
  const replayLinks = await recent
    .getByRole('link', { name: 'Replay', exact: true })
    .evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(new Set(replayLinks).size).toBe(29);
  await first.page.reload();
  await expect(recent.locator('article')).toHaveCount(10);
  await first.page.evaluate(() => document.documentElement.classList.remove('dark'));
  await recent.screenshot({ path: '.swubase/crossfire-home/statistics-recent-games.png' });
  await first.page.setViewportSize({ width: 390, height: 844 });
  await first.page.evaluate(() => document.documentElement.classList.add('dark'));
  await recent.scrollIntoViewIfNeeded();
  expect(
    await first.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-recent-games-mobile.png',
  });
  await first.page.goto(`${origin}/statistics/history`);
  await expect(first.page.getByRole('link', { name: 'Replay game 1', exact: true })).toBeVisible();
  await verifyScoreReplays(first.page);
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-restored-mobile.png',
    fullPage: true,
  });
  expect(
    await first.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await first.page.setViewportSize({ width: 1500, height: 950 });
  await first.page.goto(`${origin}/teams/${teams[0]}/statistics/history`);
  await expect(first.page.getByText('2 - 0', { exact: true })).toBeVisible();
  await expect(first.page.getByText('0 - 2', { exact: true })).toBeVisible();
  await expect(first.page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await expect(first.page.getByRole('link', { name: 'Practice', exact: true })).toHaveCount(0);
  await expect(first.page.getByRole('link', { name: 'Replay game 1', exact: true })).toHaveCount(2);
  await verifyScoreReplays(first.page);
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-restored-team.png',
    fullPage: true,
  });
  await first.page.goto(`${origin}/teams/${teams[1]}/statistics/history`);
  await expect(first.page.getByText('No matches found.', { exact: true })).toBeVisible();

  // Later updates must not move standard games out of their played-date range.
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await sql`UPDATE game_result SET created_at = ${yesterday + ' 14:00:00'}, updated_at = clock_timestamp() AT TIME ZONE 'UTC' WHERE user_id = ${a.userId}`;
  await first.page.goto(
    `${origin}/statistics/history?sDateRangeFrom=${yesterday}&sDateRangeTo=${yesterday}`,
  );
  await expect(first.page.getByText('2 - 0', { exact: true })).toBeVisible();
  await expect(first.page.getByText('Practice from bookmark', { exact: true })).toHaveCount(0);
  await first.page.reload();
  await expect(first.page.getByText('2 - 0', { exact: true })).toBeVisible();
  await verifyLegacyCache(first.context, yesterday);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`${origin}/api/game-results`)).status()).toBe(401);
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(`${origin}/statistics/history`);
  await expect(
    anonymousPage.getByRole('button', { name: 'Sign in to see your statistics', exact: true }),
  ).toBeVisible();
  await anonymous.close();
  expect(errors).toEqual([]);
  console.log(
    'Statistics browser acceptance passed: practice excluded from personal/team statistics and history, replay buttons, ten-game pagination, mobile layout, historical ranges and legacy cache refresh.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const games =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${games.map(g => g.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM team WHERE id=ANY(${teams})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck_information WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${users.map(p => p.userId)})`;
  await sql.end();
}
