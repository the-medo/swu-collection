// Build first: bun run --cwd frontend build
// Run: APR_BROWSER_TEST=1 bun frontend/tests/tournament-meta-apr.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import { resolve } from 'node:path';
if (process.env.APR_BROWSER_TEST !== '1') throw new Error('Enable APR_BROWSER_TEST=1.');
const root = resolve(import.meta.dir, '../..');
const cards = await Bun.file(`${root}/server/db/json/card-list.json`).json();
const id = '11111111-1111-4111-8111-111111111111';
const groupId = '22222222-2222-4222-8222-222222222222';
const meta = {
  id: 99,
  name: 'APR fixture meta',
  set: 'hmw',
  format: 1,
  date: '2026-10-01',
  season: 9,
};
const metaData = { meta, format: { id: 1, name: 'Premier', description: '' } };
const tournament = {
  id,
  userId: 'fixture',
  type: 'pq',
  location: 'Paris',
  continent: 'Europe',
  name: 'APR fixture tournament',
  attendance: 32,
  meleeId: null,
  format: 1,
  meta: 99,
  days: 2,
  dayTwoPlayerCount: 16,
  date: '2026-11-01',
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
  imported: true,
  bracketInfo: 'top8',
};
const tournamentData = {
  tournament,
  tournamentType: { id: 'pq', name: 'Planetary Qualifier', sortValue: 200, major: 1 },
  meta,
};
const leaders = [
  'director-krennic--amidst-my-achievement',
  'wicket--few-greater-battles-to-fight',
  'doctor-hemlock--emotion-has-no-place-here',
  'mother-talzin--power-through-magick',
];
const assignments = [
  1,
  0,
  2,
  0,
  1,
  2,
  1,
  3,
  ...Array(14).fill(0),
  ...Array(5).fill(1),
  ...Array(2).fill(2),
  ...Array(3).fill(3),
];
const decks = assignments.map((leader, index) => ({
  tournamentDeck: {
    tournamentId: id,
    deckId: `deck-${index}`,
    placement: index + 1,
    recordWin: 5,
    recordLose: 2,
    recordDraw: 0,
    points: 15,
    meleePlayerUsername: `Pilot ${index}`,
  },
  deck: {
    id: `deck-${index}`,
    name: `Deck ${index}`,
    leaderCardId1: leaders[leader],
    leaderCardId2: null,
    baseCardId: 'echo-base',
    format: 1,
  },
  deckInformation: {
    baseAspect: 'Command',
    aspectCommand: 1,
    aspectVigilance: 1,
    aspectVillainy: 1,
  },
}));
const secondId = '33333333-3333-4333-8333-333333333333';
const oneDay = { ...tournament, id: secondId, days: 1, dayTwoPlayerCount: 0, attendance: 16 };
const oneDayData = { ...tournamentData, tournament: oneDay };
const oneDayDecks = decks.slice(0, 16).map((row, i) => ({
  ...row,
  tournamentDeck: { ...row.tournamentDeck, tournamentId: secondId, placement: i + 1 },
}));
const manyLeaders = Object.keys(cards)
  .filter(key => cards[key].type === 'Leader')
  .slice(0, 25);
const manyDecks = Array.from({ length: 51 }, (_, index) => ({
  ...decks[0],
  tournamentDeck: { ...decks[0].tournamentDeck, deckId: `many-${index}`, placement: index + 1 },
  deck: { ...decks[0].deck, id: `many-${index}`, leaderCardId1: manyLeaders[index % 25] },
}));
let manyDay2 = true;
let mode: 'two' | 'one' | 'mixed' | 'partial' | 'empty' | 'error' | 'many' = 'two';
let cardsDelay = 0;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const selectedDecks = mode === 'empty' ? [] : mode === 'many' ? manyDecks : decks;
    const selectedTournament =
      mode === 'many'
        ? {
            ...tournamentData,
            tournament: {
              ...tournament,
              attendance: 51,
              days: manyDay2 ? 2 : 1,
              dayTwoPlayerCount: manyDay2 ? 26 : 0,
            },
          }
        : tournamentData;
    if (path.startsWith('/api/')) {
      if (path === '/api/creator-hub/creations') return Response.json({ items: [] });
      if (path === '/api/auth/get-session') return Response.json(null);
      if (path === '/api/application-configuration') return Response.json({ homepageMode: 'live' });
      if (path === '/api/user-settings') return Response.json({});
      if (path === '/api/cards') {
        if (cardsDelay) await Bun.sleep(cardsDelay);
        if (mode === 'error') return new Response('Unavailable', { status: 500 });
        return Response.json({
          official: { needsUpdate: true, lastUpdated: 'fixture', cards },
          preview: { needsUpdate: false },
          karabast_unimplemented: {},
        });
      }
      if (path === `/api/tournament/${id}`)
        return Response.json({ ...selectedTournament, decks: selectedDecks });
      if (path === `/api/tournament/${secondId}`)
        return Response.json({ ...oneDayData, decks: oneDayDecks });
      if (path === `/api/tournament/${id}/decks`) return Response.json({ data: selectedDecks });
      if (path === `/api/tournament/${secondId}/decks`) return Response.json({ data: oneDayDecks });
      if (path.endsWith('/matches')) return Response.json({ data: [] });
      if (path === '/api/tournament/bulk/data')
        return Response.json({
          decks: { [id]: mode === 'partial' ? decks.slice(0, 16) : decks, [secondId]: oneDayDecks },
          matches: { [id]: [], [secondId]: [] },
        });
      if (path === '/api/tournament')
        return Response.json({
          data:
            mode === 'mixed' || mode === 'partial'
              ? [tournamentData, oneDayData]
              : [tournamentData],
          pagination: { hasMore: false, offset: 0, limit: 250 },
        });
      if (path === '/api/meta')
        return Response.json({ data: [metaData], pagination: { hasMore: false } });
      if (path === '/api/meta/99') return Response.json({ data: metaData });
      if (path === `/api/tournament-groups/${groupId}`)
        return Response.json({
          data: {
            group: { id: groupId, name: 'APR fixture group' },
            meta,
            tournaments: [tournamentData, oneDayData],
          },
        });
      return Response.json({ data: [], pagination: { hasMore: false } });
    }
    const file = resolve(root, 'frontend/dist', `.${path}`);
    if (file.startsWith(`${root}/frontend/dist/`) && (await Bun.file(file).exists()))
      return new Response(Bun.file(file));
    return new Response(Bun.file(`${root}/frontend/dist/index.html`));
  },
});
const base = server.url.toString().replace(/\/$/, '');
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 20000 });
const errors: string[] = [];
async function open(path: string, touch = false) {
  const context = await browser.newContext({
    viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 1100 },
    isMobile: touch,
    hasTouch: touch,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', 'light');
  });
  await context.route('https://**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + path);
  const section = page.getByRole('region', {
    name: 'Adjusted performance rate (APR)',
    exact: true,
  });
  await expect(section).toBeVisible();
  return { page, section, context };
}
try {
  const { page, section, context } = await open(`/tournaments/${id}/meta?maViewMode=apr`);
  const expectAlignedRows = async () => {
    await expect(section.locator('[data-apr-values]')).toHaveCount(
      await section.locator('[data-apr-label]').count(),
    );
    const offsets = await section.evaluate(el =>
      [...el.querySelectorAll('[data-apr-values]')].map(row => {
        const key = row.getAttribute('data-apr-values');
        const label = [...el.querySelectorAll('[data-apr-label]')].find(
          label => label.getAttribute('data-apr-label') === key,
        )!;
        const r = row.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        return Math.abs(r.y + r.height / 2 - l.y - l.height / 2);
      }),
    );
    for (const offset of offsets) expect(offset).toBeLessThan(1);
  };
  const sorts = section.getByRole('group', { name: 'Sort APR by' });
  await expect(sorts.getByRole('button')).toHaveCount(4);
  await expect(section.locator('.recharts-bar')).toHaveCount(4);

  await expectAlignedRows();
  const chart = section.getByRole('region', { name: 'APR chart, scroll to see all decks' });
  const expectPinnedLabels = async () => {
    const scrollbarStyle = await page.addStyleTag({
      content:
        '[aria-label="APR chart, scroll to see all decks"]::-webkit-scrollbar { width: 15px; height: 15px; }',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => chart.evaluate(el => el.scrollHeight - el.clientHeight))
      .toBeLessThanOrEqual(1);
    await chart.evaluate(el => {
      el.scrollLeft = el.scrollWidth;
    });
    await expectAlignedRows();
    const view = await chart.boundingBox();
    const label = await chart.locator('[data-apr-label]').first().boundingBox();
    expect(Math.abs(label!.x - view!.x - 1)).toBeLessThan(1);
    await expect(section.getByText('Scroll sideways to see all APR columns.')).toBeVisible();
    await scrollbarStyle.evaluate(el => el.remove());
    await page.setViewportSize({ width: 1440, height: 1100 });
    await chart.evaluate(el => {
      el.scrollLeft = 0;
    });
    await expect(section.getByText('Scroll sideways to see all APR columns.')).toHaveCount(0);
  };
  await expectPinnedLabels();
  const tooltip = section.locator('.recharts-tooltip-wrapper');
  const metrics = ['combined', 'field-day2', 'day2-top8', 'top8-champions'];
  let sharedText = '';
  for (const [index, metric] of metrics.entries()) {
    const bar = section
      .locator('.recharts-bar')
      .nth(index)
      .locator('.recharts-bar-rectangle')
      .nth(1)
      .locator('path');
    await bar.hover();
    await expect(tooltip.locator('[data-active="true"]')).toHaveAttribute('data-metric', metric);
    const text = await tooltip.innerText();
    if (sharedText) expect(text).toBe(sharedText);
    else sharedText = text;
    await expect(section.locator('[data-apr-values][data-active="true"]')).toHaveCount(1);
  }
  const rates = section.locator('[data-apr-rate]');
  await expect(rates.filter({ hasText: /^\+/ }).first()).toHaveClass(/text-green-700/);
  await expect(rates.filter({ hasText: /^-/ }).first()).toHaveClass(/text-red-600/);
  await expect(rates.filter({ hasText: /^0\.0%$/ }).first()).toHaveClass(/text-muted-foreground/);
  const heading = await section.getByRole('heading').boundingBox();
  const status = await section
    .getByRole('status')
    .filter({ hasText: /deck groups/ })
    .boundingBox();
  expect(status!.x).toBeGreaterThan(heading!.x + heading!.width);
  expect(Math.abs(status!.y + status!.height / 2 - heading!.y - heading!.height / 2)).toBeLessThan(
    6,
  );
  const detailsStyles = await section.locator('summary').evaluateAll(nodes =>
    nodes.map(node => ({
      size: getComputedStyle(node).fontSize,
      color: getComputedStyle(node).color,
      weight: getComputedStyle(node).fontWeight,
    })),
  );
  expect(detailsStyles[0]).toEqual(detailsStyles[1]);
  for (const [index, metric] of [
    'combined',
    'field-day2',
    'day2-top8',
    'top8-champions',
  ].entries()) {
    await sorts.getByRole('button').nth(index).click();
    await expect(page).toHaveURL(new RegExp(`maAprSort=${metric}`));
    const values = await section
      .locator('[data-apr-values]')
      .evaluateAll(
        (rows, column) =>
          rows.map(row => parseFloat(row.querySelectorAll('[data-apr-rate]')[column].textContent!)),
        index,
      );
    expect(values).toEqual([...values].sort((a, b) => b - a));
    const tableNames = await section
      .locator('[data-apr-values] [role=rowheader]')
      .allTextContents();
    const chartNames = await section.locator('[data-apr-label]').evaluateAll(nodes =>
      nodes
        .map(n => ({ name: n.getAttribute('aria-label')!, y: n.getBoundingClientRect().y }))
        .sort((a, b) => a.y - b.y)
        .map(r => r.name),
    );
    expect(chartNames.map(s => s.trim())).toEqual(tableNames.map(s => s.trim()));
    await expectAlignedRows();
  }
  await page.reload();
  await expect(sorts.getByRole('button').last()).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(sorts.getByRole('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(sorts.getByRole('button').last()).toHaveAttribute('aria-pressed', 'true');
  await section.getByLabel('Min. recorded decks').fill('100');
  await expect(section).toContainText('No decks meet the minimum recorded count');
  await section.getByLabel('Min. recorded decks').fill('2');
  await expect(section.locator('.recharts-bar')).toHaveCount(4);
  await page.getByRole('radio', { name: 'Table', exact: true }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(4);
  await expect(page.locator('table')).toContainText('Wicket');
  await page.getByRole('radio', { name: 'APR — Adjusted performance rate', exact: true }).click();
  await expect(section.locator('[data-apr-values]')).toHaveCount(4);
  await context.close();
  mode = 'one';
  const single = await open(`/tournaments/${secondId}/meta?maViewMode=apr`);
  await expect(
    single.section.getByRole('group', { name: 'Sort APR by' }).getByRole('button'),
  ).toHaveCount(2);
  await expect(single.section.locator('[data-apr-value="combined"]')).toHaveCount(0);
  await expect(single.section.locator('.recharts-bar')).toHaveCount(2);
  await single.context.close();
  mode = 'mixed';
  for (const path of ['/meta?metaId=99', `/meta?metaId=99&maTournamentGroupId=${groupId}`]) {
    const mixed = await open(path + '&maViewMode=apr');
    await expect(
      mixed.section.getByRole('group', { name: 'Sort APR by' }).getByRole('button'),
    ).toHaveCount(5);
    await expect(mixed.section.locator('[data-apr-value="field-top8"]')).not.toHaveCount(0);
    await expect(mixed.section.locator('.recharts-bar')).toHaveCount(5);
    await mixed.context.close();
  }
  mode = 'partial';
  const partial = await open('/meta?metaId=99&maViewMode=apr');
  await expect(
    partial.section.getByRole('button', { name: 'Field → Top 8', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const missing = partial.section.locator('[data-apr-value="combined"] [data-apr-rate]');
  await expect(missing).not.toHaveCount(0);
  for (const cell of await missing.all()) {
    await expect(cell).toHaveText('—');
    await expect(cell).toHaveClass(/text-muted-foreground/);
  }
  await partial.context.close();
  mode = 'empty';
  const empty = await open(`/tournaments/${id}/meta?maViewMode=apr`);
  await expect(empty.section).toContainText('No comparison is available');
  await empty.context.close();
  mode = 'two';
  cardsDelay = 2000;
  const loading = await open(`/tournaments/${id}/meta?maViewMode=apr`);
  await expect(loading.section).toContainText('Loading card data');
  await expect(loading.section.locator('.recharts-bar')).toHaveCount(4);
  await loading.context.close();
  mode = 'error';
  cardsDelay = 0;
  const failed = await open(`/tournaments/${id}/meta?maViewMode=apr`);
  await expect(failed.section).toContainText('Card data could not be loaded');
  await failed.context.close();
  mode = 'many';
  for (const withDay2 of [true, false]) {
    manyDay2 = withDay2;
    const many = await open(`/tournaments/${id}/meta?maViewMode=apr`);
    const rows = many.section.locator('[data-apr-values]');
    const loaded = many.section.locator('[data-apr-loaded]');
    const viewport = many.section.getByRole('region', {
      name: 'APR chart, scroll to see all decks',
    });
    await viewport.scrollIntoViewIfNeeded();
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    // Initial batch stays at ten even with the shortest (two-metric) rows.
    await many.page.waitForTimeout(150);
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    await expect(many.section.getByRole('table')).toHaveAttribute('aria-rowcount', '26');
    const firstBatch = await rows.allTextContents();
    const firstBarWidth = (await many.section
      .locator('.recharts-bar-rectangle path')
      .first()
      .boundingBox())!.width;
    const firstRowHeight = (await rows.first().boundingBox())!.height;
    await viewport.focus();
    await many.page.keyboard.press('End');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '20');
    await viewport.evaluate(el => {
      el.scrollTop = 0;
    });
    await expect(rows.first()).toHaveAttribute('aria-rowindex', '2');
    expect((await rows.allTextContents()).slice(0, firstBatch.length)).toEqual(firstBatch);
    expect(
      (await many.section.locator('.recharts-bar-rectangle path').first().boundingBox())!.width,
    ).toBeCloseTo(firstBarWidth, 1);
    expect((await rows.first().boundingBox())!.height).toBeCloseTo(firstRowHeight, 1);
    await many.section.getByRole('button', { name: 'Top 8 → Champion', exact: true }).click();
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    expect(await viewport.evaluate(el => el.scrollTop)).toBe(0);
    await many.section.getByLabel('Min. recorded decks').fill('3');
    await expect(rows).toHaveCount(1);
    await many.section.getByLabel('Min. recorded decks').fill('2');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    // Browse-mode activation can load more without scrolling the sentinel into view.
    await many.section.getByRole('button', { name: 'Show more APR rows' }).dispatchEvent('click');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '20');
    await many.page.getByRole('radio', { name: 'Leaders & Bases', exact: true }).click();
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    const more = many.section.getByRole('button', { name: 'Show more APR rows' });
    await more.evaluate(el => el.focus({ preventScroll: true }));
    await many.page.keyboard.press('Enter');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '20');
    await expect(more).toBeFocused();
    await many.page.keyboard.press('Enter');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '25');
    await expect(more).toHaveAttribute('aria-disabled', 'true');
    await expect(more).toBeFocused();
    await many.page.keyboard.press('Enter');
    await expect(loaded).toHaveAttribute('data-apr-loaded', '25');
    await many.page.getByRole('radio', { name: 'Leaders', exact: true }).click();
    await expect(loaded).toHaveAttribute('data-apr-loaded', '10');
    await many.page.setViewportSize({ width: 390, height: 844 });
    await viewport.scrollIntoViewIfNeeded();
    await viewport.evaluate(el => {
      el.scrollLeft = el.scrollWidth;
      el.scrollTop = el.scrollHeight;
    });
    await expect(loaded).toHaveAttribute('data-apr-loaded', '20');
    await viewport.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(loaded).toHaveAttribute('data-apr-loaded', '25');
    await expect(more).toHaveAttribute('aria-disabled', 'true');
    expect(await rows.count()).toBeLessThan(20);
    // Traverse every loaded row while keeping the mounted window bounded.
    const seen = new Set<string>();
    const geometry = await viewport.evaluate(el => ({
      height: el.scrollHeight,
      page: el.clientHeight,
    }));
    for (let offset = 0; offset < geometry.height; offset += geometry.page / 2) {
      await viewport.evaluate((el, top) => {
        el.scrollTop = top;
      }, offset);
      await many.page.waitForTimeout(40);
      for (const key of await rows.evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-apr-values')!),
      ))
        seen.add(key);
      expect(await rows.count()).toBeLessThan(20);
    }
    expect(seen.size).toBe(25);
    await viewport.evaluate(el => {
      el.scrollLeft = el.scrollWidth;
      el.scrollTop = el.scrollHeight / 2;
    });
    await many.page.waitForTimeout(60);
    const firstVisibleIndex = await viewport.evaluate(el => {
      const view = el.getBoundingClientRect();
      const row = [...el.querySelectorAll('[data-apr-values]')].find(
        row => row.getBoundingClientRect().top >= view.top + 56,
      );
      return row!.getAttribute('aria-rowindex')!;
    });
    const beforeSelection = await viewport.evaluate(el => el.scrollTop);
    await viewport.focus();
    await many.page.keyboard.press('ArrowDown');
    await expect(many.section.locator('[data-apr-values][data-active="true"]')).toHaveAttribute(
      'aria-rowindex',
      firstVisibleIndex,
    );
    expect(await viewport.evaluate(el => el.scrollTop)).toBeCloseTo(beforeSelection, 0);
    const keyboardTooltip = many.section.locator('[data-apr-keyboard-tooltip] .w-72');
    await expect(keyboardTooltip).toBeVisible();
    const tooltipBounds = (await keyboardTooltip.boundingBox())!;
    const visibleBounds = (await viewport.boundingBox())!;
    expect(tooltipBounds.x).toBeGreaterThanOrEqual(visibleBounds.x);
    expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(
      visibleBounds.x + visibleBounds.width,
    );
    await many.page.keyboard.press('Escape');
    await viewport.evaluate(el => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
    await viewport.focus();
    for (let index = 0; index < 15; index++) await many.page.keyboard.press('ArrowDown');
    const selected = many.section.locator('[data-apr-values][data-active="true"]');
    await expect(selected).toHaveAttribute('aria-rowindex', '16');
    await expect(many.section.locator('[data-apr-keyboard-tooltip]')).toContainText(
      await selected.getByRole('rowheader').innerText(),
    );
    const viewportBounds = (await viewport.boundingBox())!;
    const selectedBounds = (await selected.boundingBox())!;
    expect(selectedBounds.y).toBeGreaterThanOrEqual(viewportBounds.y + 55);
    expect(selectedBounds.y + selectedBounds.height).toBeLessThanOrEqual(
      viewportBounds.y + viewportBounds.height + 1,
    );
    await many.page.keyboard.press('Escape');
    await expect(many.section.locator('[data-apr-keyboard-tooltip]')).toHaveCount(0);
    const alignment = await viewport.evaluate(el =>
      [...el.querySelectorAll('[data-apr-values]')].map(row => {
        const label = [...el.querySelectorAll('[data-apr-label]')].find(
          label => label.getAttribute('data-apr-label') === row.getAttribute('data-apr-values'),
        )!;
        const r = row.getBoundingClientRect(),
          l = label.getBoundingClientRect();
        return Math.abs(r.y + r.height / 2 - l.y - l.height / 2);
      }),
    );
    for (const offset of alignment) expect(offset).toBeLessThan(1);
    await many.context.close();
  }
  mode = 'two';
  const touch = await open(`/tournaments/${id}/meta?maViewMode=apr`, true);
  const touchBar = touch.section
    .locator('.recharts-bar')
    .first()
    .locator('.recharts-bar-rectangle')
    .nth(1)
    .locator('path');
  await touchBar.tap();
  const touchTooltip = touch.section.locator('.recharts-tooltip-wrapper .w-72');
  await expect(touchTooltip).toBeVisible();
  await expect(touchTooltip.locator('[data-metric]')).toHaveCount(4);
  await expect(touchTooltip.locator('[data-active="true"]')).toHaveAttribute(
    'data-metric',
    'combined',
  );
  await expect(touch.section.locator('[data-apr-values][data-active="true"]')).toHaveCount(1);
  await touch.context.close();
  expect(errors).toEqual([]);
  console.log(
    'PASS: APR shared tooltips, colors, row alignment, all sorts, URL refresh/back/forward, filters, one-day/two-day/mixed/meta/group pages, missing/loading/empty/error states, ten-row batches, stable values/axis, pagination resets, bounded virtual rows, keyboard navigation, short-chart scrollbars, mobile scrolling and touch tooltips.',
  );
} finally {
  await browser.close();
  server.stop(true);
}
