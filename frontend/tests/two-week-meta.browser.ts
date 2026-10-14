// TWO_WEEK_META_BROWSER_TEST=1 bun frontend/tests/two-week-meta.browser.ts
// Build first. Serves synthetic snapshots locally; does not read or modify a database.
import { chromium, expect as baseExpect, type Page } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import { getCardPoolMap } from '../../server/lib/card-pools/card-pool-map-by-set.ts';
import { SwuSet } from '../../types/enums.ts';
import { countBaseDistribution } from '../../server/lib/daily-snapshots/section/base-distribution-counts.ts';

if (process.env.TWO_WEEK_META_BROWSER_TEST !== '1')
  throw new Error('Enable TWO_WEEK_META_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
if (!(await Bun.file(resolve(dist, 'index.html')).exists())) throw new Error('Build first.');
const output = resolve(import.meta.dir, '../../.swubase/two-week-meta');
await mkdir(output, { recursive: true });
const leaders = getCardPoolMap(SwuSet.HMW).leaders.Common.slice(0, 6);
const bases = Object.values(cardList)
  .filter(c => c?.type === 'Base' && c.rarity === 'Common' && c.set === SwuSet.HMW)
  .slice(0, 2);
const cards = Object.values(cardList)
  .filter(c => c?.type === 'Unit' && c.set === SwuSet.HMW)
  .slice(0, 5);
const stamp = '2026-10-05T18:00:00.000Z';
const groupId = '11111111-1111-4111-8111-111111111111';
const ext = (name: string) => ({
  tournamentGroup: {
    id: groupId,
    name,
    metaId: 19,
    position: 0,
    description: null,
    visible: false,
  },
  tournamentGroupStats: {
    tournamentGroupId: groupId,
    totalTournaments: 12,
    importedTournaments: 10,
    tournamentsWithData: 10,
    totalDecks: 1170,
    attendance: 1250,
  },
});
const twoWeeks = ext('Two-week snapshot');
const week1 = ext('Weekend 26–27 September');
const week2 = ext('Weekend 3–4 October');
function tournament(index: number, name: string, type: string, date: string, format = 1) {
  return {
    id: `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`,
    userId: 'fixture',
    name,
    type,
    date,
    format,
    location: 'FR',
    continent: 'Europe',
    attendance: 64,
    days: 1,
    dayTwoPlayerCount: 0,
    meleeId: '',
    meta: 19,
    imported: true,
    createdAt: stamp,
    updatedAt: stamp,
    bracketInfo: 'none',
    coordinates: null,
    additionalInfo: null,
  };
}
const events = [
  tournament(1, 'Galactic Championship', 'gc', '2026-09-20T00:00:00Z'),
  tournament(2, 'Sector Open — Paris', 'open', '2026-09-27T00:00:00Z', 3),
  tournament(3, 'PQ - Eternal table', 'pq', '2026-10-04T00:00:00Z', 6),
  tournament(4, 'PQ - Premier table', 'pq', '2026-10-04T00:00:00Z', 1),
  { ...tournament(5, 'PQ - Earlier event', 'pq', '2026-09-27T00:00:00Z'), imported: false },
];
const laterEvents = [
  tournament(6, 'Sector Qualifier — Copenhagen', 'sq', '2026-11-07T00:00:00Z'),
  tournament(7, 'PQ - Later tournament', 'pq', '2026-10-25T00:00:00Z'),
  tournament(8, 'PQ - Earlier tournament', 'pq', '2026-10-18T00:00:00Z'),
  tournament(9, 'Weekend Open', 'open', '2026-10-18T00:00:00Z'),
];
const points = leaders.map((leaderCardId, i) => ({
  leaderCardId,
  baseCardId: bases[i % 2]!.cardId,
  total: [420, 310, 180, 120, 80, 60][i],
  top8: [12, 28, 8, 4, 6, 2][i],
  winners: [1, 3, 0, 0, 2, 0][i],
}));
const split = (force: number, nonforce: number) => ({
  total: { force, nonforce },
  top8: { force: 30, nonforce: 30 },
  champions: { force: 3, nonforce: 3 },
});
let state: 'ready' | 'legacy-sections' | 'empty-sections' | 'empty' | 'error' | 'loading' = 'ready';
let releaseLoading: (() => void) | undefined;
function snapshot() {
  const empty = state === 'empty-sections';
  const zero = {
    total: { force: 0, nonforce: 0 },
    top8: { force: 0, nonforce: 0 },
    champions: { force: 0, nonforce: 0 },
  };
  const sections = {
    'recent-tournaments': {
      tournamentGroupId: groupId,
      tournamentGroupExt: twoWeeks,
      tournaments: empty
        ? []
        : events.map((tournament, i) => ({
            tournament,
            deck:
              i === 2 || i === 4
                ? null
                : {
                    id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
                    leaderCardId1: leaders[i],
                    leaderCardId2: null,
                    baseCardId: bases[i % 2]!.cardId,
                  },
            winningTournamentDeck:
              i === 2 || i === 4 ? null : { meleePlayerUsername: 'Fixture champion' },
          })),
    },
    'meta-share-2-weeks': { tournamentGroupExt: twoWeeks, dataPoints: empty ? [] : points },
    'force-vs-nonforce': {
      twoWeeks: empty ? zero : split(560, 610),
      week1: empty ? zero : split(240, 320),
      week2: empty ? zero : split(320, 290),
      twoWeeksGroupExt: twoWeeks,
      week1GroupExt: week1,
      week2GroupExt: week2,
    },
    'base-distribution': {
      twoWeeks: countBaseDistribution(
        empty
          ? []
          : [
              ['otoh-gunga', 100, 20, 3],
              ['daimyo-s-palace', 40, 5, 1],
              ['lake-country', 10, 2, 1],
              ['nightsister-lair', 20, 2, 0],
              ['shield-generator-complex', 30, 3, 1],
              ['kachirho', 10, 0, 0],
              ['tarkintown', 20, 2, 0],
              ['massassi-temple', 10, 0, 0],
            ].map(([baseCardId, total, top8, winner]) => ({
              baseCardId: baseCardId as string,
              leaderCardId: 'doctor-hemlock--emotion-has-no-place-here',
              total: total as number,
              top8: top8 as number,
              winner: winner as number,
            })),
        cardList,
      ),
      twoWeeksGroupExt: twoWeeks,
    },
    'weekly-change': {
      week1Ext: week1,
      week2Ext: week2,
      dataPoints: empty
        ? []
        : points.map((p, i) => ({
            ...p,
            week1: { total: 80 - i * 10, top8: 10 - i, champions: i % 2 },
            week2: { total: 20 + i * 8, top8: 2 + i, champions: (i + 1) % 2 },
          })),
    },
    'most-played-cards': {
      tournamentGroupId: groupId,
      tournamentGroupExt: twoWeeks,
      dataPoints: empty
        ? []
        : cards.map((card, i) => ({
            cardId: card!.cardId,
            deckCount: 220 - i * 15,
            countMd: 480 - i * 20,
            countSb: 35 + i * 5,
          })),
    },
    'upcoming-tournaments': {
      tournamentGroupId: groupId,
      tournamentGroupExt: twoWeeks,
      dataPoints: empty ? [] : laterEvents.slice(1),
      upcomingMajorTournaments: empty ? [] : [laterEvents[0], laterEvents[3]],
    },
  };
  return {
    data: {
      dailySnapshot: { date: '2026-10-05', tournamentGroupId: groupId, updatedAt: stamp },
      sections:
        state === 'empty'
          ? []
          : Object.entries(sections)
              .filter(([section]) => state !== 'legacy-sections' || section !== 'base-distribution')
              .map(([section, data]) => ({
                date: '2026-10-05',
                section,
                updatedAt: stamp,
                data: JSON.stringify({ id: section, title: section, data }),
              })),
    },
  };
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/daily-snapshot') {
      if (state === 'loading')
        await new Promise<void>(resolve => {
          releaseLoading = resolve;
        });
      if (state === 'error') return Response.json({ message: 'Fixture error' }, { status: 404 });
      return Response.json(snapshot());
    }
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'meta-browser-fixture', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'meta-browser-fixture', cards: {} },
        karabast_unimplemented: {},
      });
    if (pathname === '/api/auth/get-session') return Response.json(null);
    if (pathname === '/api/application-configuration')
      return Response.json({ homepageMode: 'snapshot' });
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/tournament-weekends/live') return Response.json({ data: null });
    if (pathname === '/api/world/countries') return Response.json({ countries: {} });
    if (pathname === '/api/deck')
      return Response.json({ data: [], pagination: { hasMore: false } });
    const detail = [...events, ...laterEvents].find(t => pathname === `/api/tournament/${t.id}`);
    if (detail)
      return Response.json({
        tournament: detail,
        tournamentType: { name: 'Planetary Qualifier' },
        decks: [],
      });
    if (pathname.startsWith('/api/')) return Response.json({ data: [] });
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 15_000 });
const errors: string[] = [];
async function newPage(theme: 'light' | 'dark' = 'light') {
  const context = await browser.newContext({
    viewport: { width: 1680, height: 1250 },
    reducedMotion: 'reduce',
  });
  await context.addInitScript(theme => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', theme);
  }, theme);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    const expectedFailure =
      state === 'error' && url.includes('/api/daily-snapshot') && message.text().includes('404');
    const remoteImageFailure =
      message.text().startsWith('Failed to load resource:') &&
      /^(https:\/\/images\.swubase\.com|https:\/\/placehold\.co)\//.test(url);
    if (!expectedFailure && !remoteImageFailure) errors.push(message.text());
  });
  await page.route('https://images.swubase.com/tournament/**', route =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto(`${server.url}?homeMode=snapshot`);
  return page;
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `Page overflow at ${(await page.viewportSize())!.width}px`,
  ).toBe(true);
  await expect
    .poll(() => page.locator('.meta-home').evaluate(el => el.scrollWidth <= el.clientWidth), {
      message: `Meta panel overflow at ${(await page.viewportSize())!.width}px`,
    })
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), {
      message: 'Only the main content scrolls; no blank document space below the footer',
    })
    .toBe(true);
  const main = page.locator('main');
  const previousScrollTop = await main.evaluate(el => {
    const previous = el.scrollTop;
    el.scrollTop = el.scrollHeight;
    return previous;
  });
  await expect(main.locator(':scope > footer')).toBeInViewport();
  expect(
    await main.evaluate(el => {
      const bottom = el.querySelector(':scope > footer')!.getBoundingClientRect().bottom;
      const expected =
        el.getBoundingClientRect().bottom - parseFloat(getComputedStyle(el).paddingBottom);
      return el.scrollHeight > el.clientHeight
        ? Math.abs(expected - bottom)
        : Math.max(0, bottom - expected);
    }),
    'Scrolling to the end stops at the footer',
  ).toBeLessThan(2);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await main.evaluate((el, top) => {
    el.scrollTop = top;
  }, previousScrollTop);
}
async function cardsFitTiles(page: Page) {
  const overflow = await page.locator('.meta-popular-card').evaluateAll(tiles =>
    tiles.some(tile => {
      const bounds = tile.getBoundingClientRect();
      return Array.from(tile.querySelectorAll('img')).some(img => {
        const image = img.getBoundingClientRect();
        return image.width > 0 && (image.left < bounds.left || image.right > bounds.right);
      });
    }),
  );
  expect(overflow, 'Card art stays within each gallery tile').toBe(false);
}
async function baseColors(page: Page) {
  return page
    .locator('#s-base-distribution [role="img"] path')
    .evaluateAll(paths => paths.map(path => getComputedStyle(path).fill));
}
const ids = [
  'meta-share-2-weeks',
  'weekly-change',
  'base-distribution',
  'recent-tournaments',
  'upcoming-tournaments',
  'most-played-cards',
];
async function checkPlacements(page: Page, columns: number) {
  // Read the full grid in one frame, including while responsive charts resize.
  const boxes = await page.evaluate(
    ids =>
      ids.map(id => {
        const { x, y, width, height } = document.getElementById(`s-${id}`)!.getBoundingClientRect();
        return { x, y, width, height };
      }),
    ids,
  );
  const [meta, weekly, force, recent, upcoming, cards] = boxes.map(b => b!);
  const sameRow = (a: typeof meta, b: typeof meta) => expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  if (columns === 1) {
    for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
  } else {
    expect(weekly.y).toBeGreaterThanOrEqual(meta.y + meta.height);
    sameRow(weekly, force);
    expect(force.x).toBeGreaterThan(weekly.x);
    const grid = await page.locator('#s-weekly-change').evaluate(el => {
      const style = getComputedStyle(el.parentElement!);
      return {
        widths: style.gridTemplateColumns.split(' ').map(parseFloat),
        gap: parseFloat(style.columnGap),
      };
    });
    const baseColumn = columns === 2 ? 1 : 2;
    const originalWeeklyWidth =
      grid.widths.slice(0, baseColumn).reduce((sum, width) => sum + width, 0) +
      grid.gap * (baseColumn - 1);
    expect(Math.abs(force.width - grid.widths[baseColumn] - 50)).toBeLessThan(2);
    expect(Math.abs(weekly.width - originalWeeklyWidth + 50)).toBeLessThan(2);
    expect(Math.abs(force.x - weekly.x - weekly.width - grid.gap)).toBeLessThan(2);
    if (columns >= 3) {
      sameRow(meta, recent);
      sameRow(cards, upcoming);
      expect(recent.x).toBeGreaterThan(meta.x);
    } else {
      sameRow(recent, upcoming);
      expect(cards.y).toBeGreaterThan(upcoming.y);
    }
  }
}
try {
  const page = await newPage();
  const meta = page.locator('#s-meta-share-2-weeks');
  await expect(meta.locator('.meta-share-donut svg')).toBeVisible();
  await expect(meta.locator('.meta-donut-total, .meta-donut-label')).toHaveCount(0);
  expect(await meta.locator('.meta-share-chart').innerText()).not.toContain('Total entries');
  const totalInActiveColumn = async () =>
    (await meta.locator('td.meta-active-column').allTextContents()).reduce(
      (total, text) => total + parseInt(text, 10),
      0,
    );
  await expect.poll(totalInActiveColumn).toBe(1170);
  expect((await meta.locator('tbody tr').first().boundingBox())!.height).toBeLessThan(45);
  const title = (await meta.locator('.meta-heading-line').boundingBox())!;
  const subtitle = (await meta.locator('.meta-section-heading > p').boundingBox())!;
  expect(Math.abs(title.y + title.height / 2 - (subtitle.y + subtitle.height / 2))).toBeLessThan(3);
  await expect(page.locator('.meta-popular-card')).toHaveCount(5);
  await checkPlacements(page, 4);
  await noOverflow(page);
  await cardsFitTiles(page);
  const distribution = page.locator('#s-base-distribution');
  await expect(page.locator('#s-force-vs-nonforce')).toHaveCount(0);
  await expect(page.getByText('force-vs-nonforce', { exact: true })).toHaveCount(0);
  await expect(distribution.getByRole('table')).toBeHidden();
  const showAspects = distribution.getByRole('button', { name: 'Show by aspect', exact: true });
  await expect(showAspects).toHaveAttribute('aria-expanded', 'false');
  await expect(distribution.locator('dl dd')).toHaveText([
    '110',
    '40',
    '40',
    '30',
    '30',
    '20',
    '10',
    '10',
  ]);
  expect((await baseColors(page))[0]).toBe('rgb(59, 130, 246)');
  await distribution
    .getByRole('img', { name: /290 base category matches/ })
    .hover({ position: { x: 130, y: 72 } });
  const pieTooltip = page.getByText('Naboo: 110 decks', { exact: false });
  await expect(pieTooltip).toBeVisible();
  expect((await pieTooltip.boundingBox())!.width).toBeGreaterThanOrEqual(200);
  await showAspects.click();
  await expect(
    distribution.getByRole('button', { name: 'Hide by aspect', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(distribution.locator('tbody tr')).toHaveCount(9);
  await expect(distribution.locator('tbody th')).toHaveText([
    'Endor',
    'Tatooine',
    'Kashyyyk',
    'Naboo',
    'Force',
    'Splash',
    'Nonbasic',
    'Other basic',
    'Total',
  ]);
  await expect(distribution.locator('thead tr')).toHaveCSS('border-bottom-width', '3px');
  await expect(distribution.locator('tbody tr').nth(3)).toHaveCSS('border-bottom-width', '3px');
  await expect(distribution.locator('tbody tr').nth(7)).toHaveCSS('border-bottom-width', '3px');
  await expect(distribution.locator('tbody tr').first().locator('td').first()).toHaveCSS(
    'border-right-width',
    '3px',
  );
  const regularBorderColor = await distribution
    .locator('tbody tr')
    .first()
    .evaluate(row => getComputedStyle(row).borderBottomColor);
  await expect(distribution.locator('thead tr')).not.toHaveCSS(
    'border-bottom-color',
    regularBorderColor,
  );
  await expect(distribution.locator('tbody tr').first().locator('td').first()).not.toHaveCSS(
    'border-right-color',
    regularBorderColor,
  );
  await expect(distribution.locator('[role="img"] svg text')).toHaveText('290');
  await expect(distribution.locator('tbody tr').last().locator('td')).toHaveText([
    '710',
    '290',
    '0',
    '30',
    '100',
    '290',
    '0',
  ]);
  await expect(distribution.locator('thead th')).toHaveCount(8);
  const naboo = distribution
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Naboo', exact: true }) });
  await expect(naboo.locator('td')).toHaveText(['320', '110', '0', '0', '100', '110', '0']);
  const pieArcs = distribution.locator('[role="img"] path');
  const restingNabooArc = await pieArcs.first().getAttribute('d');
  await naboo.locator('td').nth(4).hover();
  await expect(pieArcs.first()).not.toHaveAttribute('d', restingNabooArc!);
  expect((await baseColors(page))[0]).toBe('rgb(59, 130, 246)');
  expect((await baseColors(page))[1]).toBe('rgba(217, 119, 6, 0.4)');
  const highlight = await distribution
    .locator('thead th')
    .nth(5)
    .evaluate(el => getComputedStyle(el).backgroundColor);
  expect(highlight).not.toBe('rgba(0, 0, 0, 0)');
  await expect(naboo.getByRole('rowheader')).toHaveCSS('background-color', highlight);
  await expect(naboo.locator('td').first()).toHaveCSS('background-color', highlight);
  await expect(distribution.locator('tbody tr').first().locator('td').nth(4)).toHaveCSS(
    'background-color',
    highlight,
  );
  await expect(distribution.locator('tbody tr').first().locator('td').first()).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(naboo.locator('td').nth(4)).not.toHaveCSS('background-color', highlight);
  await distribution.getByRole('button', { name: 'Hide by aspect', exact: true }).hover();
  await expect(naboo.locator('td').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await distribution.locator('thead th').nth(5).hover();
  await expect(naboo.locator('td').nth(4)).toHaveCSS('background-color', highlight);
  await distribution.locator('caption').hover();
  await expect(naboo.locator('td').nth(4)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(pieArcs.first()).toHaveAttribute('d', restingNabooArc!);
  await distribution
    .getByRole('img', { name: /290 base category matches/ })
    .hover({ position: { x: 130, y: 72 } });
  await expect(naboo.getByRole('rowheader')).toHaveCSS('background-color', highlight);
  await expect(naboo.locator('td').nth(4)).toHaveCSS('background-color', highlight);
  await expect(distribution.locator('thead th').nth(5)).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await distribution.screenshot({ path: resolve(output, 'base-distribution-linked-hover.png') });
  await distribution.getByRole('rowheader', { name: 'Force', exact: true }).hover();
  await expect(pieArcs.first()).toHaveCSS('fill', 'rgba(59, 130, 246, 0.4)');
  expect(await baseColors(page)).toContain('rgb(139, 92, 246)');
  await distribution.getByRole('rowheader', { name: 'Total', exact: true }).hover();
  await expect(pieArcs.first()).toHaveAttribute('d', restingNabooArc!);
  await expect(
    distribution.getByRole('img', { name: /290 base category matches across 240 decks/ }),
  ).toBeVisible();
  await distribution.getByRole('radio', { name: 'Top 8', exact: true }).click();
  await expect(naboo.locator('td')).toHaveText(['64', '22', '0', '0', '20', '22', '0']);
  await expect(distribution.locator('tbody tr').last().locator('td')).toHaveText([
    '104',
    '41',
    '0',
    '2',
    '20',
    '41',
    '0',
  ]);
  await distribution.getByRole('rowheader', { name: 'Other basic', exact: true }).hover();
  await expect(pieArcs.first()).toHaveCSS('fill', 'rgb(59, 130, 246)');
  await distribution.getByRole('radio', { name: 'Champions', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(naboo.locator('td')).toHaveText(['11', '4', '0', '0', '3', '4', '0']);
  await expect(distribution.locator('tbody tr').last().locator('td')).toHaveText([
    '19',
    '8',
    '0',
    '0',
    '3',
    '8',
    '0',
  ]);
  await distribution.getByRole('radio', { name: 'Total', exact: true }).click();
  expect(await baseColors(page)).toContain('rgb(139, 92, 246)');
  await distribution.screenshot({ path: resolve(output, 'base-distribution.png') });
  await distribution.getByRole('button', { name: 'Hide by aspect', exact: true }).click();
  await expect(distribution.getByRole('table')).toBeHidden();
  await showAspects.focus();
  await page.keyboard.press('Enter');
  await expect(distribution.getByRole('table')).toBeVisible();
  const firstLeader = meta.getByRole('button', { name: /^Select / }).first();
  const firstName = await firstLeader.getAttribute('aria-label');
  await meta.getByRole('radio', { name: 'Top 8', exact: true }).click();
  await expect.poll(totalInActiveColumn).toBe(60);
  await expect(firstLeader).not.toHaveAttribute('aria-label', firstName!);
  await meta.getByRole('radio', { name: 'Champions', exact: true }).click();
  await expect.poll(totalInActiveColumn).toBe(6);
  await meta.getByRole('radio', { name: 'Total', exact: true }).click();
  await expect(firstLeader).toHaveAttribute('aria-label', firstName!);
  await meta.getByRole('radio', { name: 'Leaders & Base', exact: true }).click();
  await expect(
    meta.getByRole('columnheader', { name: 'Leader & Base', exact: true }),
  ).toBeVisible();
  await expect(
    meta.getByRole('group', { name: 'Results to compare' }).getByRole('group'),
  ).toHaveCount(0);
  await firstLeader.focus();
  await page.keyboard.press('Enter');
  await expect(firstLeader).toHaveAttribute('aria-pressed', 'true');
  await expect(meta.getByRole('status')).toHaveText(
    'Leader selected. The Show decks button is now available.',
  );
  await expect(meta.getByRole('button', { name: 'Show decks' })).toBeVisible();
  await meta.getByRole('button', { name: 'Show decks' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const weekly = page.locator('#s-weekly-change');
  await weekly.getByRole('button', { name: 'Display counts' }).click();
  await expect(weekly.getByRole('button', { name: 'Display percentages' })).toBeVisible();
  await weekly.getByRole('button', { name: 'Display percentages' }).click();
  await meta.getByRole('button', { name: 'Section data coverage info' }).click();
  await expect(page.getByText('Two-week snapshot', { exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await meta.getByRole('button', { name: 'Section options' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  // Preserve major/open/other grouping and Premier-first order on equal dates.
  const recent = page.locator('#s-recent-tournaments');
  await expect(recent.locator('.meta-event-card')).toHaveCount(events.length);
  await expect(recent.getByText('Results pending', { exact: true })).toHaveCount(0);
  await expect(recent.getByText('Winner unavailable', { exact: true })).toHaveCount(0);
  await expect(recent.locator('.meta-result-type-logo img')).toHaveAttribute(
    'src',
    'https://images.swubase.com/logos/organized-play/galactic-championship.png',
  );
  await expect(recent.locator('img[src*="/tournament/"]')).toHaveCount(0);
  const compactResult = recent.getByRole('link', { name: /Premier table/ });
  const rowBounds = (await compactResult.boundingBox())!;
  const artBounds = (await compactResult.locator('.compact-deck-card-leader').boundingBox())!;
  const titleBounds = (await compactResult.locator('.meta-event-title').boundingBox())!;
  expect(rowBounds.height).toBeLessThan(100);
  expect(artBounds.y).toBeLessThan(rowBounds.y);
  expect(artBounds.x).toBeLessThan(rowBounds.x - 15);
  expect(artBounds.x + artBounds.width).toBeLessThan(titleBounds.x);
  const winnerBounds = (await compactResult.locator('.meta-event-champion').boundingBox())!;
  expect(winnerBounds.y).toBeGreaterThan(titleBounds.y);
  expect(winnerBounds.height).toBeLessThan(32);
  await expect(recent.locator('.meta-event-details [aria-label$=" format"]')).toHaveCount(0);
  const eternalResult = recent.getByRole('link', { name: /Eternal table/ });
  await expect(
    eternalResult.locator('.meta-event-champion [aria-label="Eternal format"]'),
  ).toBeVisible();
  await expect(eternalResult.locator('.meta-event-champion strong')).toHaveCount(0);
  const sealedResult = recent.getByRole('link', { name: /Sector Open/ });
  const sealedBadge = sealedResult.locator(
    '.meta-event-champion [aria-label="Sealed play format"]',
  );
  await expect(sealedBadge).toBeVisible();
  const sealedWinner = (await sealedResult.locator('.meta-event-champion strong').boundingBox())!;
  expect((await sealedBadge.boundingBox())!.x).toBeGreaterThan(sealedWinner.x + sealedWinner.width);
  await expect(
    recent.getByRole('link', { name: /Earlier event/ }).locator('.meta-event-champion'),
  ).toHaveCount(0);
  await expect(recent.locator('.meta-event-featured .meta-event-title')).toHaveText(
    'Galactic Championship',
  );
  const recentText = await recent.innerText();
  expect(recentText.toLowerCase().indexOf('major tournaments')).toBeLessThan(
    recentText.toLowerCase().indexOf('opens'),
  );
  expect(recentText.indexOf('Premier table')).toBeLessThan(recentText.indexOf('Eternal table'));
  const upcoming = page.locator('#s-upcoming-tournaments');
  await expect(upcoming.locator('.meta-event-date-tile')).toHaveCount(laterEvents.length);
  const upcomingMajors = upcoming
    .locator('.meta-event-group')
    .filter({ has: page.getByRole('heading', { name: 'Major tournaments', exact: true }) });
  await expect(upcomingMajors.getByRole('link')).toHaveCount(1);
  await expect(upcomingMajors.getByRole('link', { name: /Weekend Open/ })).toHaveCount(0);
  await expect(upcoming.getByRole('link', { name: /Weekend Open/ })).toHaveCount(1);
  const upcomingText = await upcoming.innerText();
  expect(upcomingText.indexOf('Earlier tournament')).toBeLessThan(
    upcomingText.indexOf('Later tournament'),
  );
  const recentLink = recent.getByRole('link', { name: /Premier table/ });
  await recentLink.focus();
  await page.keyboard.press('Enter');
  await expect(recentLink).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#s-tournament-detail')).toBeVisible();
  await page
    .locator('#s-tournament-detail')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(page.locator('#s-tournament-detail')).toHaveCount(0);
  for (const options of [{ modifiers: ['Control' as const] }, { button: 'middle' as const }]) {
    const popupPromise = page.context().waitForEvent('page');
    await recentLink.click(options);
    const popup = await popupPromise;
    await expect(popup).toHaveURL(new RegExp(`/tournaments/${events[3]!.id}`));
    expect(new URL(page.url()).searchParams.has('maTournamentId')).toBe(false);
    await popup.close();
  }
  await meta.getByRole('radio', { name: 'Leaders', exact: true }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: resolve(output, 'populated-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('#s-most-played-cards').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(output, 'populated-cards.png'),
    fullPage: true,
    animations: 'disabled',
  });
  const dark = await newPage('dark');
  await expect(dark.locator('#s-meta-share-2-weeks table')).toBeVisible();
  expect(await baseColors(dark)).toContain('rgb(139, 92, 246)');
  await expect(dark.locator('#s-base-distribution').getByRole('table')).toBeHidden();
  await dark
    .locator('#s-base-distribution')
    .getByRole('button', { name: 'Show by aspect', exact: true })
    .click();
  await dark
    .locator('#s-base-distribution')
    .screenshot({ path: resolve(output, 'base-distribution-dark.png') });
  await dark.screenshot({
    path: resolve(output, 'populated-dark.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await dark.context().close();
  for (const [width, columns] of [
    [1200, 3],
    [900, 2],
    [390, 1],
    [320, 1],
  ]) {
    await page.setViewportSize({ width: width!, height: 1000 });
    await checkPlacements(page, columns!);
    await noOverflow(page);
    await cardsFitTiles(page);
    if (width === 390) {
      const popupPromise = page.context().waitForEvent('page');
      await recentLink.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(new RegExp(`/tournaments/${events[3]!.id}`));
      await popup.close();
      await page.locator('#s-meta-share-2-weeks').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: resolve(output, 'populated-mobile.png'),
        fullPage: true,
        animations: 'disabled',
      });
      await weekly.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: resolve(output, 'populated-mobile-weekly.png'),
        fullPage: true,
        animations: 'disabled',
      });
      await page.locator('#s-most-played-cards').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: resolve(output, 'populated-mobile-cards.png'),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await upcoming.getByRole('link', { name: /Sector Qualifier — Copenhagen/ }).click();
  await expect(page).toHaveURL(new RegExp(`/tournaments/${laterEvents[0]!.id}`));
  await expect(
    page.getByRole('heading', { name: 'Sector Qualifier — Copenhagen', exact: true }).first(),
  ).toBeVisible();
  await page.context().close();
  // An existing IndexedDB snapshot must request the new section on refresh and hide the old one.
  state = 'legacy-sections';
  const cached = await newPage();
  await expect(cached.locator('#s-meta-share-2-weeks table')).toBeVisible();
  await expect(cached.locator('#s-base-distribution, #s-force-vs-nonforce')).toHaveCount(0);
  await expect(cached.getByText('force-vs-nonforce', { exact: true })).toHaveCount(0);
  state = 'ready';
  const refreshRequest = cached.waitForRequest(request =>
    request.url().endsWith('/api/daily-snapshot'),
  );
  await cached.reload();
  const requestedSections = (await refreshRequest).postDataJSON().sections;
  expect(requestedSections).toContainEqual({
    section: 'base-distribution',
    lastUpdatedAt: new Date(1970, 1, 1, 0, 0, 0, 0).toISOString(),
  });
  await expect(
    cached
      .locator('#s-base-distribution')
      .getByRole('button', { name: 'Show by aspect', exact: true }),
  ).toBeVisible();
  await expect(cached.locator('#s-base-distribution').getByRole('table')).toBeHidden();
  await cached
    .locator('#s-base-distribution')
    .getByRole('button', { name: 'Show by aspect', exact: true })
    .click();
  await expect(cached.locator('#s-base-distribution tbody tr')).toHaveCount(9);
  await expect(cached.getByText('force-vs-nonforce', { exact: true })).toHaveCount(0);
  await cached.context().close();
  state = 'empty-sections';
  const emptySections = await newPage();
  await expect(emptySections.locator('.meta-empty-state')).toHaveCount(6);
  await emptySections.setViewportSize({ width: 320, height: 1000 });
  await noOverflow(emptySections);
  await emptySections.context().close();
  state = 'empty';
  const empty = await newPage();
  await expect(empty.getByRole('link', { name: /Explore community decks/ })).toBeVisible();
  await empty.context().close();
  state = 'error';
  const error = await newPage();
  await expect(error.getByText('Unable to load the meta snapshot')).toBeVisible();
  state = 'ready';
  await error.getByRole('button', { name: 'Try again' }).click();
  await expect(error.locator('#s-meta-share-2-weeks table')).toBeVisible();
  await error.context().close();
  state = 'loading';
  const loading = await newPage();
  await expect(loading.getByRole('status', { name: 'Loading two-week meta' })).toBeVisible();
  state = 'ready';
  releaseLoading?.();
  await expect(loading.locator('#s-meta-share-2-weeks table')).toBeVisible();
  await loading.context().close();
  expect(errors).toEqual([]);
  console.log(
    'Two-week Meta browser checks passed: ordering, filters, dialogs, responsive layouts, themes, loading, empty and retry states.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (await page.getByText('Show Error', { exact: true }).isVisible())
        await page.getByText('Show Error', { exact: true }).click();
      console.error('Page:', page.url(), (await page.locator('body').innerText()).slice(0, 3000));
      await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
    }
  }
  throw error;
} finally {
  releaseLoading?.();
  await browser.close();
  server.stop(true);
}
