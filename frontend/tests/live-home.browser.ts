// LIVE_HOME_BROWSER_TEST=1 bun frontend/tests/live-home.browser.ts
// Built frontend + isolated HTTP/WebSocket fixtures. Does not mutate a database.
import { chromium, expect as baseExpect, type WebSocketRoute } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList, countryList } from '../../server/db/lists.ts';
import { getCardPoolMap } from '../../server/lib/card-pools/card-pool-map-by-set.ts';
import { SwuSet } from '../../types/enums.ts';

if (process.env.LIVE_HOME_BROWSER_TEST !== '1') throw new Error('Enable LIVE_HOME_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const output = resolve(import.meta.dir, '../../.swubase/homepage-live-redesign');
await mkdir(output, { recursive: true });
const stamp = '2026-10-10T12:00:00.000Z';
const weekendId = '11111111-1111-4111-8111-111111111111';
const leaders = getCardPoolMap(SwuSet.HMW).leaders.Common.slice(0, 6);
const baseId = Object.values(cardList).find(
  card => card?.type === 'Base' && card.set === SwuSet.HMW && card.rarity === 'Common',
)!.cardId;
const configs = [
  ['Paris · Planetary Qualifier', 'running', 'FR'],
  ['Prague · Planetary Qualifier', 'running', 'CZ'],
  ['Berlin · Planetary Qualifier', 'finished', 'DE'],
  ['Vienna · Planetary Qualifier', 'finished', 'AT'],
  ['London · Planetary Qualifier', 'upcoming', 'GB'],
  ['Madrid · Planetary Qualifier', 'unknown', 'ES'],
] as const;
const tournaments = configs.map(([name, status, location], index) => {
  const id = `22222222-2222-4222-8222-22222222222${index}`;
  const standing = {
    tournamentId: id,
    playerDisplayName: index === 2 ? 'Mara Vega' : 'Ari Chen',
    roundNumber: 5,
    rank: 1,
    points: 15,
    gameRecord: '10-1',
    matchRecord: '5-0-0',
    updatedAt: stamp,
  };
  return {
    tournament: {
      id,
      name,
      type: 'pq',
      location,
      continent: 'Europe',
      attendance: 96 + index * 8,
      meleeId: String(123456 + index),
      format: 1,
      days: 1,
      dayTwoPlayerCount: null,
      date: '2026-10-10',
      imported: index === 2,
      meta: null,
      bracketInfo: null,
    },
    tournamentType: { id: 'pq', name: 'Planetary Qualifier', sortValue: 200, major: 1 },
    weekendTournament: {
      tournamentWeekendId: weekendId,
      tournamentId: id,
      status,
      hasDecklists: status === 'finished',
      additionalData: null,
      roundNumber: 5,
      roundName: index === 1 ? 'Semifinals' : 'Round 5',
      matchesTotal: 48,
      matchesRemaining: 12,
      exactStart: '2026-10-11T09:00:00Z',
      lastUpdatedAt: stamp,
      isLiveCheckEnabled: true,
    },
    winningDeck:
      status === 'finished'
        ? {
            deck: {
              id: `33333333-3333-4333-8333-33333333333${index}`,
              leaderCardId1: leaders[index],
              baseCardId: baseId,
            },
            tournamentDeck: { meleePlayerUsername: standing.playerDisplayName },
          }
        : null,
    championStanding: status === 'finished' ? standing : null,
    undefeatedPlayers: status === 'running' ? [standing] : [],
    hasBracketMatches: index === 1 || index === 2,
  };
});
const resources = Array.from({ length: 4 }, (_, index) => ({
  id: `44444444-4444-4444-8444-44444444444${index}`,
  tournamentId: tournaments[index]!.tournament.id,
  resourceType: 'stream',
  resourceUrl: `https://www.youtube.com/watch?v=abcdefghij${index}`,
  title: 'Feature match coverage',
  approved: true,
  createdAt: stamp,
  updatedAt: stamp,
}));
const watch = { userId: 'live-fixture-user', playerDisplayName: 'Ari Chen', createdAt: stamp };
const detail = {
  weekend: {
    id: weekendId,
    name: 'The October circuit',
    date: '2026-10-10',
    isLive: true,
    tournamentsRunning: 2,
    tournamentsFinished: 2,
    tournamentsUpcoming: 1,
    tournamentsUnknown: 1,
    createdAt: stamp,
    updatedAt: stamp,
  },
  tournaments,
  resources,
  tournamentGroups: [
    {
      leaderBase: leaders.map((leaderCardId, i) => ({
        tournamentGroupId: 'fixture-group',
        leaderCardId,
        baseCardId: baseId,
        total: 80 - i * 10,
        top8: 8 - i,
        winner: i === 0 ? 2 : 0,
      })),
    },
  ],
  watchlist: [{ watch, displayName: 'Ari Chen' }],
  watchedPlayerDisplayNames: ['Ari Chen'],
  watchedPlayers: [
    {
      displayName: 'Ari Chen',
      watch,
      tournaments: [
        {
          tournamentId: tournaments[0]!.tournament.id,
          standing: tournaments[0]!.undefeatedPlayers[0],
          latestMatch: {
            tournamentId: tournaments[0]!.tournament.id,
            roundNumber: 5,
            matchKey: 'match-5',
            playerDisplayName: 'Ari Chen',
            opponentDisplayName: 'Alexandria Longname',
            playerGameWins: 2,
            opponentGameWins: 1,
            outcome: 'win',
            updatedAt: stamp,
            createdAt: stamp,
          },
        },
      ],
    },
  ],
};
let state: 'ready' | 'empty' | 'error' = 'ready';
let signedIn = false;
let admin = false;
let delayLive = false;
let releaseLive = () => {};
let bracketRequests = 0;
let requests = 0;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/tournament-weekends/live') {
      requests++;
      if (delayLive)
        await new Promise<void>(resolve => {
          releaseLive = resolve;
        });
      if (state === 'error')
        return Response.json({ message: 'Coverage is temporarily unavailable.' }, { status: 503 });
      return Response.json({
        data:
          state === 'empty'
            ? null
            : {
                ...detail,
                watchlist: signedIn ? detail.watchlist : [],
                watchedPlayers: signedIn ? detail.watchedPlayers : [],
              },
        meta: { generatedAt: stamp, version: 1 },
      });
    }
    if (pathname.endsWith('/bracket')) {
      bracketRequests++;
      return Response.json({
        data: {
          weekendId,
          tournamentId: tournaments[1]!.tournament.id,
          rounds: [],
          topStandings: [],
        },
      });
    }
    if (pathname.endsWith('/resources'))
      return Response.json({
        data: admin
          ? [
              {
                resource: resources[0],
                tournament: tournaments[0]!.tournament,
                submitterName: 'Fixture',
              },
            ]
          : [],
      });
    if (pathname === '/api/world/countries') return Response.json({ countries: countryList });
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'live-home-fixture', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'live-home-fixture', cards: {} },
        karabast_unimplemented: {},
      });
    if (pathname === '/api/auth/get-session')
      return Response.json(
        signedIn
          ? {
              user: {
                id: watch.userId,
                name: 'Fixture viewer',
                displayName: 'Fixture viewer',
                email: 'viewer@invalid.local',
                emailVerified: true,
                role: admin ? 'admin' : 'user',
                currency: 'USD',
                image: null,
                createdAt: stamp,
                updatedAt: stamp,
              },
              session: {
                id: 'live-fixture-session',
                userId: watch.userId,
                token: 'fixture',
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              },
            }
          : null,
      );
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/application-configuration')
      return Response.json({ homepageMode: 'live' });
    if (pathname.startsWith('/api/')) return Response.json({ data: [] });
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1500 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
await context.route('https://www.youtube-nocookie.com/**', route =>
  route.fulfill({
    contentType: 'text/html; charset=utf-8',
    body: '<body style="margin:0;background:#17221c;color:#b9d4a8;display:grid;place-content:center;height:100vh;font:14px system-ui;text-align:center"><div style="font-size:32px;margin-bottom:12px">▷</div>Feature match coverage</body>',
  }),
);
let socket: WebSocketRoute | undefined;
let subscribed = false;
await context.routeWebSocket('**/api/ws/events', ws => {
  socket = ws;
  ws.onMessage(message => {
    const event = JSON.parse(String(message));
    if (event.type === 'subscribe' && event.subscription.topic === 'live-tournaments')
      subscribed = true;
    if (event.type === 'ping') ws.send(JSON.stringify({ type: 'app.pong', v: 1 }));
  });
  ws.send(JSON.stringify({ type: 'app.connected', v: 1 }));
});
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const openLive = () => page.goto(`${server.url}?homeMode=live`);
const noOverflow = async () => {
  // Responsive charts settle after the ResizeObserver callback on viewport changes.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await expect
    .poll(() => page.locator('.live-home').evaluate(el => el.scrollWidth <= el.clientWidth))
    .toBe(true);
};
const screenshot = async (name: string) => {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>('.live-home img')].map(img =>
        img.decode().catch(() => {}),
      ),
    );
  });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' });
};
try {
  await openLive();
  await expect(page.getByRole('heading', { name: 'The October circuit' })).toBeVisible();
  await expect(page.locator('.live-event-card')).toHaveCount(6);
  await expect(page.locator('.live-weekend-stat strong')).toHaveText(['2', '2', '2']);
  await expect(page.locator('.live-event-winner .compact-deck-title')).toHaveText([
    'Mara Vega',
    'Ari Chen',
  ]);
  const coverage = await page.locator('.live-weekend-hero').boundingBox();
  const streams = await page.locator('.live-streams-panel').boundingBox();
  expect(streams!.y).toBeCloseTo(coverage!.y, 0);
  expect(streams!.x).toBeGreaterThan(coverage!.x + coverage!.width);
  for (const card of await page.locator('.live-event-card').all()) {
    const box = (await card.boundingBox())!;
    const title = (await card.locator('.live-event-title').boundingBox())!;
    const menu = (await card.getByRole('button', { name: 'Tournament actions' }).boundingBox())!;
    expect(title.y).toBeLessThan(menu.y + menu.height);
    expect(title.x + title.width).toBeLessThan(menu.x);
    const status = (await card.locator('.live-event-actions .live-event-status').boundingBox())!;
    expect(box.x + box.width - status.x - status.width).toBeLessThan(20);
    expect(box.y + box.height - status.y - status.height).toBeLessThan(20);
  }
  const winner = page.locator('.live-event-winner').first();
  await expect(winner.locator('img')).toHaveCount(2);
  await expect(winner.getByRole('link', { name: 'View Mara Vega’s deck' })).toHaveAttribute(
    'href',
    `/decks/${tournaments[2]!.winningDeck!.deck.id}`,
  );
  const winnerBox = (await winner.boundingBox())!;
  const leaderArt = (await winner.locator('.compact-deck-card-leader').boundingBox())!;
  const baseArt = (await winner.locator('.compact-deck-card-base').boundingBox())!;
  expect(leaderArt.y).toBeLessThan(winnerBox.y);
  expect(leaderArt.x + leaderArt.width).toBeGreaterThan(baseArt.x);
  await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '36');
  await expect(page.getByText('Sign in to follow players.')).toBeVisible();
  expect(bracketRequests).toBe(0);
  await screenshot('live-light');
  await noOverflow();
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await screenshot('live-dark');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });
  // Layout is a browser preference. Rows retain the same event actions and filters.
  const layoutSwitch = page.getByRole('group', { name: 'Tournament layout' });
  const rowOption = layoutSwitch.getByRole('radio', { name: 'Rows', exact: true });
  const boxOption = layoutSwitch.getByRole('radio', { name: 'Boxes', exact: true });
  await expect(boxOption).toHaveAttribute('aria-checked', 'true');
  await boxOption.focus();
  await boxOption.press('ArrowRight');
  await rowOption.press('Space');
  await expect(rowOption).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.live-event-card[data-layout="rows"]')).toHaveCount(6);
  expect(await page.evaluate(() => localStorage.getItem('swubase.live-tournament-layout'))).toBe(
    'rows',
  );
  await page.reload();
  await expect(rowOption).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.live-event-card[data-layout="rows"]')).toHaveCount(6);
  const rows = await page
    .locator('.live-tournament-group[data-status="running"] .live-event-card')
    .all();
  const firstRow = (await rows[0]!.boundingBox())!;
  const secondRow = (await rows[1]!.boundingBox())!;
  expect(firstRow.x).toBeCloseTo(secondRow.x, 0);
  expect(secondRow.y).toBeGreaterThan(firstRow.y + firstRow.height);
  expect(firstRow.height).toBeLessThan(90);
  await expect(winner.getByRole('link', { name: 'View Mara Vega’s deck' })).toHaveAttribute(
    'href',
    `/decks/${tournaments[2]!.winningDeck!.deck.id}`,
  );
  const finishedRow = page
    .locator('.live-event-card[data-layout="rows"][data-status="finished"]')
    .first();
  await expect(finishedRow.locator('.compact-deck-meta')).toHaveCSS('gap', '3px');
  await expect(page.locator('.live-row-info .live-event-start')).toHaveCSS('font-size', '10px');
  // Check settled hover colours, not a transition's matching initial frame.
  const hoverStyles = await page.addStyleTag({
    content: '.live-event-card button, .live-event-filters button { transition: none !important; }',
  });
  for (const name of ['Top 8 bracket', 'Detail']) {
    const button = finishedRow.getByRole('button', { name, exact: true });
    await button.hover();
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  const liveFilter = page.getByRole('radio', { name: /^Live now \d+/ });
  const filterBackground = await liveFilter.evaluate(el => getComputedStyle(el).backgroundColor);
  await liveFilter.hover();
  await expect(liveFilter).toHaveCSS('background-color', filterBackground);
  await hoverStyles.evaluate(el => el.remove());
  const finishedBox = (await finishedRow.boundingBox())!;
  const rowWinner = (await finishedRow.locator('.live-event-winner').boundingBox())!;
  const rowTitle = (await finishedRow.locator('.live-event-title').boundingBox())!;
  const bracketButton = (await finishedRow
    .getByRole('button', { name: 'Top 8 bracket' })
    .boundingBox())!;
  const detailButton = (await finishedRow
    .getByRole('button', { name: 'Detail', exact: true })
    .boundingBox())!;
  const rowInfo = (await finishedRow.locator('.live-row-info > .live-event-info').boundingBox())!;
  const rowStatus = (await finishedRow.locator('.live-event-status').boundingBox())!;
  const rowMenu = (await finishedRow
    .getByRole('button', { name: 'Tournament actions' })
    .boundingBox())!;
  expect(finishedBox.height).toBeLessThanOrEqual(72);
  expect(rowWinner.x).toBeLessThan(rowTitle.x);
  expect(rowWinner.x - finishedBox.x).toBeLessThan(15);
  expect(bracketButton.x).toBeGreaterThan(rowTitle.x + rowTitle.width);
  expect(
    Math.abs(bracketButton.y + bracketButton.height / 2 - rowTitle.y - rowTitle.height / 2),
  ).toBeLessThan(2);
  expect(detailButton.x).toBeGreaterThan(rowInfo.x + rowInfo.width);
  expect(
    Math.abs(detailButton.y + detailButton.height / 2 - rowInfo.y - rowInfo.height / 2),
  ).toBeLessThan(2);
  expect(
    Math.abs(rowStatus.y + rowStatus.height / 2 - rowMenu.y - rowMenu.height / 2),
  ).toBeLessThan(2);
  await expect(finishedRow.locator('footer')).toHaveCount(0);
  await finishedRow.getByRole('button', { name: 'Tournament actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Open tournament detail' })).toHaveAttribute(
    'href',
    `/tournaments/${tournaments[2]!.tournament.id}`,
  );
  await page.keyboard.press('Escape');
  await screenshot('live-rows-light');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await screenshot('live-rows-dark');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  for (const [label, statuses] of [
    ['Live now', ['running']],
    ['Finished', ['finished']],
    ['Upcoming', ['upcoming', 'unknown']],
  ] as const) {
    await page.getByRole('radio', { name: new RegExp(`^${label} \\d+`) }).click();
    await expect(page.locator('.live-event-card')).toHaveCount(2);
    expect(
      await page
        .locator('.live-event-card')
        .evaluateAll(cards => cards.map(card => card.getAttribute('data-status'))),
    ).toEqual(statuses.length === 1 ? [statuses[0], statuses[0]] : [...statuses]);
  }
  await page.getByRole('radio', { name: /^All events \d+$/ }).click();
  await page.getByRole('button', { name: 'Top 8 bracket', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => bracketRequests).toBe(1);
  await expect(page.getByText('No bracket matches are available yet.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'View all 4 streams' }).click();
  await expect(page.getByRole('dialog', { name: 'All streams' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Watch here', exact: true }).first().click();
  await expect(page).toHaveURL(/streamId=/);
  await expect(page.getByRole('navigation', { name: 'Homepage sections' })).toHaveCount(0);
  await expect(page.locator('.live-watch-layout iframe')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Close watch mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch stream', exact: true }).click();
  await page.getByRole('button', { name: 'Switch here' }).first().click();
  await expect(page).toHaveURL(new RegExp(resources[1]!.id));
  await page.getByRole('button', { name: 'Close watch mode' }).click();
  await expect(page).not.toHaveURL(/streamId=/);
  await expect(page.getByRole('navigation', { name: 'Homepage sections' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit stream or Melee ID' }).click();
  await expect(page.getByRole('dialog', { name: 'Submit Stream or Melee ID' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Manage watched players' }).click();
  await expect(page.getByRole('dialog', { name: 'Watched Players' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.live-field-leaders li')).toHaveCount(5);
  await page.getByRole('button', { name: 'View all 6 combinations' }).click();
  await page
    .locator('.live-field-panel')
    .screenshot({ path: `${output}/live-meta.png`, animations: 'disabled' });
  await expect(page.locator('.live-field-leaders li')).toHaveCount(6);
  for (const width of [1100, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1300 });
    await noOverflow();
    await expect(rowOption).toHaveAttribute('aria-checked', 'true');
    if (width === 390) await screenshot('live-rows-mobile');
    if (width === 390) await screenshot('live-mobile');
    await page.getByRole('link', { name: 'Watch here', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Close watch mode' })).toBeVisible();
    await noOverflow();
    await page.getByRole('button', { name: 'Close watch mode' }).click();
  }
  // Long tournament sidebars scroll independently, keeping the stream on screen.
  const originalWatchTournaments = detail.tournaments;
  detail.tournaments = [
    ...originalWatchTournaments,
    ...Array.from({ length: 6 }, (_, index) => ({
      ...tournaments[0]!,
      tournament: {
        ...tournaments[0]!.tournament,
        id: `watch-event-${index}`,
        name: `Running event ${index}`,
      },
    })),
  ];
  await page.setViewportSize({ width: 1500, height: 850 });
  await page.goto(`${server.url}?homeMode=live&streamId=${resources[0]!.id}`);
  const watchSidebar = page.locator('.live-watch-sidebar');
  await expect(watchSidebar.locator('.live-event-card')).toHaveCount(8);
  await expect(watchSidebar).toHaveCSS('position', 'sticky');
  const video = page.locator('.live-watch-layout iframe');
  const videoBefore = await video.boundingBox();
  await watchSidebar.hover();
  await page.mouse.wheel(0, 650);
  await expect.poll(() => watchSidebar.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(video).toBeInViewport();
  expect((await video.boundingBox())!.y).toBeCloseTo(videoBefore!.y, 0);
  detail.tournaments = originalWatchTournaments;
  // Authenticated watchlist, admin controls, and existing live patch transport.
  signedIn = true;
  admin = true;
  await page.setViewportSize({ width: 1500, height: 1500 });
  await openLive();
  await expect(
    page.locator('.live-watched-group').getByText('Ari Chen', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pending (1)' })).toBeVisible();
  await expect.poll(() => subscribed).toBe(true);
  const updated = structuredClone(tournaments[0]!);
  updated.weekendTournament.matchesRemaining = 3;
  const beforePatch = requests;
  socket!.send(
    JSON.stringify({
      type: 'live_tournament.progress_updated',
      data: { weekendId, version: 2, patch: { kind: 'tournament_summary', tournament: updated } },
      at: stamp,
    }),
  );
  await expect(page.getByText('3/48 matches remaining')).toBeVisible();
  expect(requests).toBe(beforePatch);
  await screenshot('live-watchlist');
  // Unavailable or corrupt storage must not prevent either layout from working.
  await page.evaluate(() => localStorage.setItem('swubase.live-tournament-layout', 'invalid'));
  await page.reload();
  await expect(boxOption).toHaveAttribute('aria-checked', 'true');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await rowOption.click();
  await expect(page.locator('.live-event-card[data-layout="rows"]')).toHaveCount(6);
  await page.reload();
  await expect(boxOption).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 320, height: 1200 });
  await noOverflow();
  // More than ten events can still all be reached.
  signedIn = false;
  admin = false;
  const originalTournaments = [...detail.tournaments];
  detail.tournaments = Array.from({ length: 12 }, (_, index) => ({
    ...tournaments[2]!,
    tournament: {
      ...tournaments[2]!.tournament,
      id: `long-list-${index}`,
      name: `Finished event ${index}`,
    },
  }));
  await openLive();
  await expect(page.locator('.live-event-card')).toHaveCount(10);
  await page.getByRole('button', { name: 'Show all 12 events' }).click();
  await expect(page.locator('.live-event-card')).toHaveCount(12);
  detail.tournaments = originalTournaments;
  // Empty, failed, loading, and recovery states remain useful.
  state = 'empty';
  await openLive();
  await expect(page.getByRole('heading', { name: 'Between weekends.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try the daily sealed pool' })).toHaveAttribute(
    'href',
    '/?homeMode=today',
  );
  await screenshot('live-empty');
  state = 'error';
  await openLive();
  await expect(page.getByRole('alert')).toContainText('We couldn’t load this weekend.');
  state = 'ready';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'The October circuit' })).toBeVisible();
  delayLive = true;
  await openLive();
  await expect(page.getByRole('status', { name: 'Loading live weekend' })).toBeVisible();
  delayLive = false;
  releaseLive();
  await expect(page.getByRole('heading', { name: 'The October circuit' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(`Live Weekend browser checks passed. Screenshots: ${output}`);
} catch (error) {
  console.error('Browser errors:', errors);
  console.error(
    'Geometry:',
    await page.evaluate(() => {
      const home = document.querySelector('.live-home')!;
      const right = home.getBoundingClientRect().right;
      return {
        width: innerWidth,
        homeWidth: home.clientWidth,
        scrollWidth: home.scrollWidth,
        overflow: [...home.querySelectorAll('*')]
          .filter(el => el.getBoundingClientRect().right > right + 1)
          .slice(0, 15)
          .map(el => ({
            tag: el.tagName,
            class: el.className,
            right: el.getBoundingClientRect().right,
            text: el.textContent?.slice(0, 80),
          })),
      };
    }),
  );
  console.error('Visible page:', (await page.locator('body').innerText()).slice(0, 1500));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  releaseLive();
  await browser.close();
  await server.stop(true);
}
