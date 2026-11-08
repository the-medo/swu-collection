// LIVE_HOME_BROWSER_TEST=1 bun frontend/tests/live-home.browser.ts
// Built frontend + isolated HTTP/WebSocket fixtures. Does not mutate a database.
import { chromium, expect as baseExpect, type WebSocketRoute } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList, countryList } from '../../server/db/lists.ts';
import { getCardPoolMap } from '../../server/lib/card-pools/card-pool-map-by-set.ts';
import type {
  LiveTournamentHomeWatchedPlayer,
  LiveTournamentHomeWatchedMatch,
} from '../../types/TournamentWeekend.ts';
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
const history: LiveTournamentHomeWatchedMatch[] = Array.from({ length: 5 }, (_, index) => ({
  tournamentId: tournaments[0]!.tournament.id,
  roundNumber: index + 1,
  matchKey: `match-${index + 1}`,
  playerDisplayName: 'Ari Chen',
  opponentDisplayName:
    index === 0 ? null : ['', 'Mara Vega', 'Alexandria Longname', 'Quinn', 'Jules'][index]!,
  playerGameWins: index === 4 ? 0 : index === 2 ? 1 : 2,
  opponentGameWins: index === 0 ? null : index === 4 ? 0 : index === 2 ? 1 : 0,
  outcome: index === 0 ? 'bye' : index === 4 ? null : index === 2 ? 'draw' : 'win',
  updatedAt: index === 4 ? null : stamp,
  createdAt: stamp,
}));
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
          standing: { ...tournaments[0]!.undefeatedPlayers[0]!, matchRecord: '3-0-1', points: 10 },
          latestMatch: history[4]!,
          finalStanding: null,
        },
        {
          tournamentId: tournaments[2]!.tournament.id,
          standing: null,
          latestMatch: null,
          finalStanding: { placement: 1, matchRecord: '8-0-0', points: 24 },
        },
      ],
    },
  ] as LiveTournamentHomeWatchedPlayer[],
};
const secondName = 'Alexandria Longname';
const secondWatch = { ...watch, playerDisplayName: secondName };
detail.watchlist.push({ watch: secondWatch, displayName: secondName });
detail.watchedPlayerDisplayNames.push(secondName);
detail.watchedPlayers.push({
  displayName: secondName,
  watch: secondWatch,
  tournaments: [
    {
      tournamentId: tournaments[0]!.tournament.id,
      standing: {
        ...tournaments[0]!.undefeatedPlayers[0]!,
        playerDisplayName: secondName,
        roundNumber: 4,
        rank: 1,
        matchRecord: '2-2-0',
      },
      latestMatch: {
        ...history[3]!,
        playerDisplayName: secondName,
        opponentDisplayName: 'Mara Vega',
        outcome: 'loss',
        playerGameWins: 0,
        opponentGameWins: 2,
      },
      finalStanding: null,
    },
    {
      tournamentId: tournaments[2]!.tournament.id,
      standing: null,
      latestMatch: { ...history[3]!, playerDisplayName: secondName },
      finalStanding: { placement: 12, matchRecord: '10-2-1', points: 31 },
    },
  ],
});
let version = 1;
let state: 'ready' | 'empty' | 'error' = 'ready';
let signedIn = false;
let admin = false;
let delayLive = false;
let releaseLive = () => {};
const roundRequests = new Map<string, number>();
const roundRequestCount = (tournamentId: string, displayName = 'Ari Chen') =>
  roundRequests.get(`${tournamentId}:${displayName}`) ?? 0;
let roundsError = false;
let delayRounds = false;
let releaseRounds = () => {};
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
        meta: { generatedAt: stamp, version },
      });
    }
    if (pathname.endsWith('/watched-player-rounds')) {
      const tournamentId = pathname.split('/').at(-2)!;
      const displayName = new URL(request.url).searchParams.get('displayName')!;
      const key = `${tournamentId}:${displayName}`;
      roundRequests.set(key, (roundRequests.get(key) ?? 0) + 1);
      const data = structuredClone(
        tournamentId === tournaments[0]!.tournament.id && displayName === 'Ari Chen' ? history : [],
      );
      if (delayRounds)
        await new Promise<void>(resolve => {
          releaseRounds = resolve;
        });
      if (roundsError)
        return Response.json({ message: 'Round history unavailable' }, { status: 503 });
      return Response.json({ data });
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
  const watchPanel = await page.locator('.live-weekend-sidebar > div').first().boundingBox();
  expect(watchPanel!.y).toBeCloseTo(coverage!.y, 0);
  expect(streams!.y).toBeGreaterThan(watchPanel!.y + watchPanel!.height);
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
  for (const width of [1280, 1500, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.getByRole('button', { name: 'Close watch mode' }).click();
    const homeSidebarBox = (await page.locator('.live-weekend-sidebar').boundingBox())!;
    await page.getByRole('link', { name: 'Watch here', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Close watch mode' })).toBeVisible();
    await noOverflow();
    const mainBox = (await page.locator('main').boundingBox())!;
    const layoutBox = (await page.locator('.live-watch-layout').boundingBox())!;
    const sidebarBox = (await watchSidebar.boundingBox())!;
    const videoBox = (await video.boundingBox())!;
    // Only the normal page gutters should remain; the video fills the left column.
    expect(layoutBox.width).toBeGreaterThan(mainBox.width - 60);
    expect(sidebarBox.width).toBeCloseTo(homeSidebarBox.width, 0);
    expect(videoBox.x + videoBox.width).toBeCloseTo(sidebarBox.x - 27, 0);
    if (width === 1920) await screenshot('watch-mode-wide');
  }
  detail.tournaments = originalWatchTournaments;
  // Authenticated watchlist, admin controls, and existing live patch transport.
  signedIn = true;
  admin = true;
  await page.setViewportSize({ width: 1500, height: 1500 });
  await openLive();
  await expect(
    page.locator('.live-watched-group').first().getByText('Ari Chen', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pending (1)' })).toBeVisible();
  await expect.poll(() => subscribed).toBe(true);
  const liveWatch = page.getByRole('region', {
    name: `Watched players at ${tournaments[0]!.tournament.name}`,
    exact: true,
  });
  const finishedWatch = page.getByRole('region', {
    name: `Watched players at ${tournaments[2]!.tournament.name}`,
    exact: true,
  });
  await expect(liveWatch.getByRole('table')).toHaveCount(1);
  await expect(liveWatch.getByRole('button').first()).toHaveAttribute(
    'aria-label',
    'Show rounds for Ari Chen',
  );
  await expect(liveWatch.getByText('Round 5 · in progress')).toBeVisible();
  await expect(liveWatch.getByText('Pending', { exact: true })).toBeVisible();
  const standingsTable = liveWatch.getByRole('table');
  expect((await standingsTable.locator(':scope > thead').boundingBox())!.height).toBe(0);
  const playerCells = standingsTable.locator(':scope > tbody > tr').first().getByRole('cell');
  await expect(playerCells).toHaveCount(4);
  await expect(playerCells.nth(2)).toHaveText('3-0-1');
  await expect(playerCells.nth(3)).toContainText('Round 5');
  await expect(playerCells.nth(3)).toContainText('Pending');
  await expect(liveWatch.getByText('Select a player to see their rounds')).toHaveCount(0);
  expect(roundRequests.size).toBe(0);
  delayRounds = true;
  const expand = liveWatch.getByRole('button', { name: 'Show rounds for Ari Chen' });
  await expand.focus();
  await expand.press('Enter');
  await expect(liveWatch.getByRole('button', { name: 'Hide rounds for Ari Chen' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(liveWatch.getByRole('status')).toHaveText('Loading rounds…');
  await expect.poll(() => roundRequestCount(tournaments[0]!.tournament.id)).toBe(1);
  // A WebSocket update during the initial fetch must replace that older snapshot,
  // even when the homepage already has the event's public version.
  const releaseInitialRounds = releaseRounds;
  delayRounds = false;
  history[1]!.opponentDisplayName = 'Updated opponent';
  socket!.send(
    JSON.stringify({
      type: 'live_tournament.progress_updated',
      data: {
        weekendId,
        version,
        patch: { kind: 'tournament_summary', tournament: tournaments[0] },
      },
      at: stamp,
    }),
  );
  const historyTable = liveWatch.getByRole('table', { name: 'Round history for Ari Chen' });
  await expect(historyTable.getByText('Updated opponent', { exact: true })).toBeVisible();
  releaseInitialRounds();
  await expect(historyTable).toBeVisible();
  await expect(historyTable.getByText('Active round')).toBeVisible();
  await expect(historyTable.getByText('Bye', { exact: true })).toBeVisible();
  await expect(historyTable.getByText('Draw', { exact: true })).toBeVisible();
  await expect(historyTable.getByText('Pending', { exact: true })).toBeVisible();
  await expect(liveWatch.getByText(/Rank and record from|Scores are shown from/)).toHaveCount(0);
  await expect(finishedWatch.getByRole('img', { name: 'Champion' })).toBeVisible();
  await expect(finishedWatch.getByText('1st', { exact: true })).toBeVisible();
  await expect(finishedWatch.getByText('Final standings', { exact: true })).toBeVisible();
  const finishedSummaryRows = finishedWatch.locator('table > tbody > tr:not([hidden])');
  for (const row of await finishedSummaryRows.all()) {
    await expect(row.getByRole('cell')).toHaveCount(3);
    await expect(row.getByText(/Round 4|Won|Lost/)).toHaveCount(0);
  }
  await finishedWatch.getByRole('button', { name: 'Show rounds for Ari Chen' }).click();
  await expect(finishedWatch.getByText('Round details are not available yet.')).toBeVisible();
  for (const width of [1500, 1366, 1280, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 1300 });
    await noOverflow();
    expect(await liveWatch.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(
      await liveWatch.locator('.overflow-x-auto').evaluate(el => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await finishedWatch
        .locator('.overflow-x-auto')
        .evaluate(el => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    for (const table of [liveWatch, finishedWatch]) {
      expect(
        await table
          .locator('td')
          .evaluateAll(cells => cells.every(cell => cell.scrollWidth <= cell.clientWidth)),
      ).toBe(true);
    }
    const roundBox = (await playerCells.nth(3).getByText('Round 5').boundingBox())!;
    const resultBox = (await playerCells.nth(3).getByText('Pending').boundingBox())!;
    expect(roundBox.y + roundBox.height / 2).toBeCloseTo(resultBox.y + resultBox.height / 2, 0);
    expect(resultBox.x).toBeGreaterThan(roundBox.x + roundBox.width);
    const groupBox = (await liveWatch.boundingBox())!;
    expect(resultBox.x + resultBox.width).toBeLessThan(groupBox.x + groupBox.width);
    const watchBox = (await page.locator('.live-weekend-sidebar > div').first().boundingBox())!;
    const streamBox = (await page.locator('.live-streams-panel').boundingBox())!;
    expect(streamBox.y).toBeGreaterThan(watchBox.y + watchBox.height);
    if (width === 390 || width === 1500) {
      await page
        .locator('.live-weekend-sidebar > div')
        .first()
        .screenshot({ path: `${output}/watchlist-${width}-light.png`, animations: 'disabled' });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page
        .locator('.live-weekend-sidebar > div')
        .first()
        .screenshot({ path: `${output}/watchlist-${width}-dark.png`, animations: 'disabled' });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
    }
  }
  // A failed lazy request offers retry, without disturbing another player's open history.
  roundsError = true;
  await liveWatch.getByRole('button', { name: `Show rounds for ${secondName}` }).click();
  await expect(liveWatch.getByRole('alert')).toHaveText(/Couldn’t load rounds/);
  roundsError = false;
  await liveWatch.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(liveWatch.getByText('Round details are not available yet.')).toBeVisible();
  await liveWatch.getByRole('button', { name: `Hide rounds for ${secondName}` }).click();
  const beforeClosedPlayer = roundRequestCount(tournaments[0]!.tournament.id, secondName);
  const beforeOtherTournament = roundRequestCount(tournaments[2]!.tournament.id);
  const beforeOpenPlayer = roundRequestCount(tournaments[0]!.tournament.id);
  // A public progress update refetches private history without collapsing an open row.
  const updated = structuredClone(tournaments[0]!);
  updated.weekendTournament.matchesRemaining = 3;
  detail.tournaments[0] = updated;
  Object.assign(history[4]!, {
    outcome: 'win',
    playerGameWins: 2,
    opponentGameWins: 0,
    updatedAt: stamp,
  });
  version = 2;
  const beforePatch = requests;
  socket!.send(
    JSON.stringify({
      type: 'live_tournament.progress_updated',
      data: { weekendId, version, patch: { kind: 'tournament_summary', tournament: updated } },
      at: stamp,
    }),
  );
  await expect.poll(() => requests).toBeGreaterThan(beforePatch);
  await expect(liveWatch.getByText('3/48 matches remaining')).toBeVisible();
  await expect(historyTable).toBeVisible();
  await expect(historyTable.getByText('Pending', { exact: true })).toHaveCount(0);
  await expect(historyTable.getByText('Won', { exact: true })).toHaveCount(3);
  expect(roundRequestCount(tournaments[0]!.tournament.id)).toBeGreaterThan(beforeOpenPlayer);
  expect(roundRequestCount(tournaments[0]!.tournament.id, secondName)).toBe(beforeClosedPlayer);
  expect(roundRequestCount(tournaments[2]!.tournament.id)).toBe(beforeOtherTournament);
  updated.weekendTournament.matchesRemaining = 0;
  version = 3;
  socket!.send(
    JSON.stringify({
      type: 'live_tournament.progress_updated',
      data: { weekendId, version, patch: { kind: 'tournament_summary', tournament: updated } },
      at: stamp,
    }),
  );
  await expect(liveWatch.getByText('Round 5 · complete')).toBeVisible();
  await page.setViewportSize({ width: 1500, height: 1300 });
  const roundStatusBox = (await liveWatch.getByText('Round 5 · complete').boundingBox())!;
  const progressBox = (await liveWatch.getByText('0/48 matches remaining').boundingBox())!;
  expect(roundStatusBox.y).toBeCloseTo(progressBox.y, 0);
  expect(progressBox.x).toBeGreaterThan(roundStatusBox.x + roundStatusBox.width);
  await expect(historyTable.getByText('Active round')).toHaveCount(0);
  // Import completion uses the same refresh path and exposes the true final placement.
  updated.weekendTournament.status = 'finished';
  updated.tournament.imported = true;
  detail.watchedPlayers[0]!.tournaments[0]!.finalStanding = {
    placement: 3,
    matchRecord: '4-0-1',
    points: 13,
  };
  version = 4;
  socket!.send(
    JSON.stringify({
      type: 'tournament_import.finished',
      data: { weekendId, version, patch: { kind: 'tournament_summary', tournament: updated } },
      at: stamp,
    }),
  );
  await expect(liveWatch.getByText('3rd', { exact: true })).toBeVisible();
  await expect(liveWatch.getByText('Finished', { exact: true })).toBeVisible();
  await expect(historyTable).toBeVisible();
  await expect(playerCells).toHaveCount(3);
  await liveWatch.getByRole('button', { name: 'Hide rounds for Ari Chen' }).press('Space');
  await expect(historyTable).toHaveCount(0);
  // Personal updates at the current public version must also be accepted.
  const personal = structuredClone(detail.watchedPlayers);
  personal[0]!.tournaments[0]!.finalStanding!.placement = 2;
  personal[1]!.tournaments[1]!.finalStanding = {
    ...personal[1]!.tournaments[1]!.finalStanding!,
    placement: 0,
  };
  personal[1]!.tournaments[1]!.standing = {
    ...personal[1]!.tournaments[0]!.standing!,
    tournamentId: tournaments[2]!.tournament.id,
  };
  socket!.send(
    JSON.stringify({
      type: 'player_watch.updated',
      data: {
        weekendId,
        version,
        patch: {
          kind: 'watched_players',
          watchedPlayers: personal,
          watchlist: detail.watchlist,
          watchedPlayerDisplayNames: detail.watchedPlayerDisplayNames,
        },
      },
      at: stamp,
    }),
  );
  await expect(liveWatch.getByText('2nd', { exact: true })).toBeVisible();
  await expect(finishedWatch.getByRole('button').first()).toHaveAttribute(
    'aria-label',
    'Hide rounds for Ari Chen',
  );
  await expect(finishedWatch.getByText('Final standings · some placements pending')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 1300 });
  expect(
    await finishedWatch
      .locator('td')
      .evaluateAll(cells => cells.every(cell => cell.scrollWidth <= cell.clientWidth)),
  ).toBe(true);
  expect(
    await finishedWatch
      .locator('.overflow-x-auto')
      .evaluate(el => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  const beforeIrrelevant = requests;
  socket!.send(
    JSON.stringify({
      type: 'player_watch.updated',
      data: {
        weekendId: 'another-weekend',
        version,
        patch: {
          kind: 'watched_players',
          watchedPlayers: [],
          watchlist: [],
          watchedPlayerDisplayNames: [],
        },
      },
      at: stamp,
    }),
  );
  await expect(liveWatch.getByText('2nd', { exact: true })).toBeVisible();
  expect(requests).toBe(beforeIrrelevant);
  const beforeClosed = roundRequestCount(tournaments[0]!.tournament.id);
  const beforeGapRounds = roundRequestCount(tournaments[2]!.tournament.id);
  version = 6;
  const beforeGap = requests;
  socket!.send(
    JSON.stringify({
      type: 'live_tournament.progress_updated',
      data: { weekendId, version, patch: { kind: 'tournament_summary', tournament: updated } },
      at: stamp,
    }),
  );
  await expect.poll(() => requests).toBeGreaterThan(beforeGap);
  await expect(liveWatch.getByText('3rd', { exact: true })).toBeVisible();
  await expect
    .poll(() => roundRequestCount(tournaments[2]!.tournament.id))
    .toBeGreaterThan(beforeGapRounds);
  expect(roundRequestCount(tournaments[0]!.tournament.id)).toBe(beforeClosed);
  await liveWatch.getByRole('button', { name: 'Show rounds for Ari Chen' }).click();
  await expect
    .poll(() => roundRequestCount(tournaments[0]!.tournament.id))
    .toBeGreaterThan(beforeClosed);
  // Reconnect/resync refreshes open rows even without a new public version.
  const beforeReconnect = roundRequestCount(tournaments[0]!.tournament.id);
  socket!.send(JSON.stringify({ type: 'app.resync', v: 1 }));
  await expect
    .poll(() => roundRequestCount(tournaments[0]!.tournament.id))
    .toBeGreaterThan(beforeReconnect);
  expect(roundRequestCount(tournaments[0]!.tournament.id, secondName)).toBe(beforeClosedPlayer);
  delayLive = true;
  version = 7;
  socket!.send(
    JSON.stringify({
      type: 'live_weekend.replaced',
      data: {
        weekendId,
        version,
        patch: {
          kind: 'weekend_replace',
          detail: { ...detail, watchedPlayers: [], watchlist: [], watchedPlayerDisplayNames: [] },
        },
      },
      at: stamp,
    }),
  );
  const beforeReplacement = requests;
  await expect.poll(() => requests).toBeGreaterThan(beforeReplacement);
  await expect(historyTable).toBeVisible();
  await expect(
    page.getByText(
      'Add players to your watchlist to follow their standings and latest matches here.',
    ),
  ).toHaveCount(0);
  delayLive = false;
  releaseLive();
  await expect(historyTable).toBeVisible();
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
  releaseRounds();
  await browser.close();
  await server.stop(true);
}
