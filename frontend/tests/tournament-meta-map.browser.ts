// Build first: bun run --cwd frontend build
// Run: META_MAP_BROWSER_TEST=1 bun frontend/tests/tournament-meta-map.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import { resolve } from 'node:path';
if (process.env.META_MAP_BROWSER_TEST !== '1') throw new Error('Enable META_MAP_BROWSER_TEST=1.');
const root = resolve(import.meta.dir, '../..');
const cards = await Bun.file(`${root}/server/db/json/card-list.json`).json();
const id = '11111111-1111-4111-8111-111111111111';
const meta = {
  id: 99,
  name: 'Meta plot fixture meta',
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
  name: 'Meta plot fixture tournament',
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
    recordWin: leader === 3 ? 0 : index < 8 ? 7 : index < 16 ? 6 : 3,
    recordLose: leader === 3 ? 0 : index < 8 ? 1 : index < 16 ? 2 : 5,
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
let mode: 'normal' | 'empty' | 'unrecorded' | 'error' | 'paired-leaders' | 'duplicate-decks' =
  'normal';
let cardsDelay = 0;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) {
      if (path === '/api/auth/get-session') return Response.json(null);
      if (path === '/api/application-configuration') return Response.json({ homepageMode: 'live' });
      if (path === '/api/user-settings') return Response.json({});
      if (path === '/api/creator-hub/creations') return Response.json({ items: [] });
      if (path === '/api/cards') {
        if (cardsDelay) await Bun.sleep(cardsDelay);
        if (mode === 'error') return new Response('Unavailable', { status: 500 });
        return Response.json({
          official: { needsUpdate: true, lastUpdated: 'fixture', cards },
          preview: { needsUpdate: false },
          karabast_unimplemented: {},
        });
      }
      if (path === `/api/tournament/${id}`) return Response.json(tournamentData);
      if (path === `/api/tournament/${id}/decks`)
        return Response.json({
          data:
            mode === 'empty'
              ? []
              : mode === 'unrecorded'
                ? decks.map(deck => ({
                    ...deck,
                    tournamentDeck: { ...deck.tournamentDeck, recordWin: 0, recordLose: 0 },
                  }))
                : mode === 'paired-leaders'
                  ? decks.map(deck => ({
                      ...deck,
                      deck: {
                        ...deck.deck,
                        leaderCardId2: deck.deck.leaderCardId1 === leaders[0] ? leaders[1] : null,
                      },
                    }))
                  : mode === 'duplicate-decks'
                    ? decks.map(deck => ({
                        ...deck,
                        deck: {
                          ...deck.deck,
                          id: deck.deck.leaderCardId1 === leaders[0] ? 'same-list' : deck.deck.id,
                        },
                      }))
                    : decks,
        });
      if (path.endsWith('/matches')) return Response.json({ data: [] });
      if (path === '/api/meta')
        return Response.json({ data: [metaData], pagination: { hasMore: false } });
      return Response.json({ data: [], pagination: { hasMore: false } });
    }
    const file = resolve(root, 'frontend/dist', `.${path}`);
    if (file.startsWith(`${root}/frontend/dist/`) && (await Bun.file(file).exists()))
      return new Response(Bun.file(file));
    return new Response(Bun.file(`${root}/frontend/dist/index.html`));
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 20000 });
const errors: string[] = [];
const url = new URL(`/tournaments/${id}/meta?maViewMode=map`, server.url).href;
async function open(mobile = false, theme = 'light') {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(theme => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', theme);
    localStorage.setItem('comparer-accordion-state', 'comparer');
  }, theme);
  await context.route('https://**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  return { page, context, map: page.getByRole('region', { name: 'Meta plot', exact: true }) };
}
try {
  for (const mobile of [false, true]) {
    const { page, context, map } = await open(mobile, mobile ? 'dark' : 'light');
    const bubbles = map.locator('g[role="button"]');
    await expect(bubbles).toHaveCount(3);
    await expect(map.getByText(/1 group has no recorded/)).toBeVisible();
    await expect(
      page.getByRole('radio', { name: 'Plot — Win rate and meta share' }),
    ).toHaveAttribute('data-state', 'on');
    await expect(map.getByText('Win rate →', { exact: true })).toBeVisible();
    await expect(map.getByText('Meta share →', { exact: true })).toBeVisible();
    const krennic = bubbles.first();
    await expect(krennic).toHaveAttribute(
      'aria-label',
      /Director Krennic.*62.5% win rate, 50.0% meta share, 16 occurrences/,
    );
    const positions = await bubbles.evaluateAll(nodes =>
      nodes.map(node => {
        const transform = node.getAttribute('transform')!.match(/translate\(([^,]+),([^)]+)\)/)!;
        return {
          x: Number(transform[1]),
          y: Number(transform[2]),
          radius: Number(node.querySelectorAll('circle')[1].getAttribute('r')),
        };
      }),
    );
    expect(positions[0].x).toBeGreaterThan(positions[1].x);
    expect(positions[0].y).toBeLessThan(positions[1].y);
    expect((positions[0].radius / positions[1].radius) ** 2).toBeCloseTo(2);
    expect(Math.min(...positions.map(position => position.radius))).toBeGreaterThanOrEqual(8);
    const tooltip = page.locator('[data-meta-map-tooltip]');
    if (!mobile) {
      await krennic.hover();
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveCSS('pointer-events', 'none');
      await page.mouse.move(0, 0);
      await expect(tooltip).not.toBeVisible();
    }
    // Pointer and keyboard share the same deck selection behavior.
    await krennic.focus();
    await expect(krennic).toBeFocused();
    await expect(map.locator('[aria-live]')).toContainText('Director Krennic');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Amidst My Achievement');
    await expect(tooltip.getByRole('img', { name: /Director Krennic/ })).toBeVisible();
    await expect(tooltip).toContainText('62.5%');
    await expect(tooltip).toContainText('Occurrences');
    const bounds = await tooltip.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(mobile ? 844 : 1100);
    await krennic.press('Enter');
    await expect(tooltip).not.toBeVisible();
    const actions = page.getByRole('region', { name: 'Deck group actions' });
    await expect(actions).toBeVisible();
    await expect(actions).toBeFocused();
    await expect(actions.getByRole('img', { name: /Director Krennic/ })).toBeVisible();
    await expect(actions).toContainText('16 entries in this analysis');
    const deckLink = actions.getByRole('link', { name: 'Show decks', exact: true });
    const deckUrl = new URL((await deckLink.getAttribute('href'))!, page.url());
    expect(deckUrl.pathname).toBe(`/tournaments/${id}/decks`);
    expect(deckUrl.searchParams.get('maDeckKey')).toBe(leaders[0]);
    expect(deckUrl.searchParams.get('maDeckKeyType')).toBe('leaders');
    const statsUrl = new URL(
      (await actions
        .getByRole('link', { name: 'Card statistics', exact: true })
        .getAttribute('href'))!,
      page.url(),
    );
    expect(statsUrl.pathname).toBe(`/tournaments/${id}/card-stats`);
    expect(statsUrl.searchParams.get('csLeaderId')).toBe(leaders[0]);
    const panelBounds = await actions.boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.y).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
    expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(mobile ? 844 : 1100);
    await actions.screenshot({
      path: `/tmp/deck-actions-${mobile ? 'mobile-dark' : 'desktop-light'}.png`,
    });
    if (mobile) {
      await expect(
        actions.getByRole('button', { name: 'Compare 5 decks', exact: true }),
      ).not.toBeVisible();
      expect(panelBounds!.height).toBeLessThan(360);
      await actions.getByRole('button', { name: 'Compare decks', exact: true }).tap();
    }
    await expect(
      actions.getByRole('button', { name: 'Compare 5 decks', exact: true }),
    ).toBeEnabled();
    await actions.getByRole('radio', { name: 'Best 10: 10 decks', exact: true }).click();
    await expect(
      actions.getByRole('button', { name: 'Compare 10 decks', exact: true }),
    ).toBeEnabled();
    await actions.getByRole('radio', { name: 'Top 8: 2 decks', exact: true }).click();
    await expect(
      actions.getByRole('button', { name: 'Compare 2 decks', exact: true }),
    ).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('comparer-accordion-state'))).toBeNull();
    const popupPromise = page.waitForEvent('popup');
    const newTab = actions.getByRole('button', { name: 'Open comparison in a new tab' });
    if (mobile) await newTab.tap();
    else await newTab.press('Enter');
    const popup = await popupPromise;
    await popup.waitForURL(/\/comparer/);
    await popup.close();
    const comparer = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('swu-comparer-state')!),
    );
    expect(comparer.entries.map((entry: { id: string }) => entry.id)).toEqual(['deck-1', 'deck-3']);
    await actions.focus();
    await page.keyboard.press('Escape');
    await expect(actions).not.toBeVisible();
    await expect(krennic).toBeFocused();
    await page.getByRole('searchbox', { name: 'Highlight leader' }).fill('Wicket');
    await expect(bubbles.first()).toHaveAttribute('opacity', '0.2');
    await expect(bubbles.nth(1)).toHaveAttribute('opacity', '1');
    await page.getByRole('searchbox', { name: 'Highlight leader' }).fill('');
    await page.getByRole('radio', { name: 'Day 2', exact: true }).click();
    await expect(page).toHaveURL(/maMetaPart=day2/);
    await expect(bubbles.first()).toHaveAttribute(
      'aria-label',
      /Director Krennic.*77.5% win rate, 62.5% meta share, 10 occurrences/,
    );
    await page.getByRole('radio', { name: 'Top 8', exact: true }).click();
    await expect(bubbles.first()).toHaveAttribute(
      'aria-label',
      /Wicket.*87.5% win rate, 37.5% meta share, 3 occurrences/,
    );
    await page.reload();
    await expect(bubbles.first()).toHaveAttribute('aria-label', /Wicket.*3 occurrences/);
    await page.goBack();
    await expect(page).toHaveURL(/maMetaPart=day2/);
    await page.goForward();
    await expect(page).toHaveURL(/maMetaPart=top8/);
    await page.getByRole('radio', { name: 'All Decks', exact: true }).click();
    await expect(bubbles.first()).toHaveAttribute('aria-label', /16 occurrences/);
    if (mobile) await bubbles.first().tap();
    else await bubbles.first().click();
    await expect(page.getByRole('link', { name: 'Show decks', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close deck selection' }).click();
    await page.getByRole('radio', { name: 'Leaders & Bases', exact: true }).click();
    await expect(bubbles).toHaveCount(3);
    await expect(bubbles.first()).toHaveAttribute('aria-label', /Theed Palace/);
    await bubbles.first().focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Command base');
    await expect(tooltip.locator('.leader-base-badge img[alt="Command"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('radio', { name: 'Table', exact: true }).click();
    await expect(map).not.toBeVisible();
    await page
      .getByRole('row')
      .filter({ has: page.getByText('Director Krennic', { exact: true }) })
      .first()
      .click();
    await expect(actions).toBeVisible();
    await expect(actions).toContainText('Command base');
    const tableDeckUrl = new URL(
      (await actions.getByRole('link', { name: 'Show decks', exact: true }).getAttribute('href'))!,
      page.url(),
    );
    expect(tableDeckUrl.searchParams.get('maDeckKey')).toBe(`${leaders[0]}|Command`);
    await page.getByRole('button', { name: 'Close deck selection' }).click();
    await page.getByRole('radio', { name: 'Plot — Win rate and meta share' }).click();
    await expect(bubbles).toHaveCount(3);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await map.screenshot({ path: `/tmp/meta-map-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
    await bubbles.first().click();
    await actions.getByRole('link', { name: 'Show decks', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/tournaments/${id}/decks`));
    await page.goBack();
    await expect(bubbles).toHaveCount(3);
    await expect(actions).toBeVisible();
    await expect(actions).not.toBeFocused();
    expect(await actions.evaluate(element => element.contains(document.activeElement))).toBe(false);
    // A fresh selection of the same group can still request focus after Back.
    await bubbles.first().focus();
    await bubbles.first().press('Enter');
    await expect(actions).toBeFocused();
    await page.keyboard.press('Escape');
    console.log(`${mobile ? 'Mobile dark' : 'Desktop light'} map interactions passed.`);
    await context.close();
  }
  for (const state of ['empty', 'unrecorded', 'error'] as const) {
    mode = state;
    const { page, context, map } = await open();
    if (state === 'error')
      await expect(
        page.getByText('Card data could not be loaded. Please reload to try again.'),
      ).toBeVisible();
    else {
      await expect(
        map.getByText('No win rate data available for the selected filters.'),
      ).toBeVisible();
      await expect(map.locator('g[role="button"]')).toHaveCount(0);
    }
    await context.close();
  }
  mode = 'paired-leaders';
  const paired = await open();
  const pairedTooltip = paired.page.locator('[data-meta-map-tooltip]');
  for (const grouping of ['Leaders', 'Leaders & Bases']) {
    await paired.page.getByRole('radio', { name: grouping, exact: true }).click();
    await paired.map.locator('g[role="button"]').first().focus();
    await expect(pairedTooltip).toBeVisible();
    await expect(pairedTooltip).toContainText('Director Krennic & Wicket');
    await expect(pairedTooltip.getByRole('img', { name: /Director Krennic/ })).toBeVisible();
    await expect(pairedTooltip.getByRole('img', { name: /Wicket/ })).toBeVisible();
    await expect(pairedTooltip.getByRole('img', { name: /Unknown leader/ })).toHaveCount(0);
    await paired.page.keyboard.press('Escape');
    await expect(pairedTooltip).not.toBeVisible();
  }
  await paired.context.close();
  mode = 'duplicate-decks';
  const duplicate = await open();
  await duplicate.map.locator('g[role="button"]').first().click();
  const duplicateActions = duplicate.page.getByRole('region', { name: 'Deck group actions' });
  await expect(duplicateActions).toContainText('16 entries in this analysis');
  await expect(
    duplicateActions.getByRole('button', { name: 'Compare 1 deck', exact: true }),
  ).toBeDisabled();
  await expect(duplicateActions).toContainText('At least two different deck lists');
  await duplicate.context.close();
  mode = 'normal';
  cardsDelay = 1500;
  const loading = await open();
  await expect(loading.page.getByText('Loading card data…')).toBeVisible();
  await expect(loading.map.locator('g[role="button"]')).toHaveCount(3);
  await loading.context.close();
  expect(errors).toEqual([]);
  console.log(
    'Meta plot browser checks passed: filters, coordinates, URL history, keyboard/touch, highlighting, groupings, states, and responsive themes.',
  );
} finally {
  await browser.close();
  server.stop(true);
}
