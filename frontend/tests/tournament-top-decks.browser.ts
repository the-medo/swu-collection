// Run against an isolated worktree with a restored tournament containing many leaders:
// bun run test:browser:tournament-top-decks http://localhost:5180 <tournament-id> [screenshot-dir]
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, type Page } from 'playwright';
import type { TournamentDeckResponse } from '../src/api/tournaments/useGetTournamentDecks';
import {
  getTopLeaderDecks,
  type TopLeaderDeck,
} from '../src/components/app/tournaments/TournamentDecks/topLeaderDecks';

if (process.env.TOURNAMENT_TOP_DECKS_BROWSER_TEST !== '1') {
  throw new Error('Enable TOURNAMENT_TOP_DECKS_BROWSER_TEST=1.');
}

const [origin, tournamentId, screenshotDirectory] = process.argv.slice(2);
assert(origin && tournamentId, 'Provide the development origin and tournament ID.');
const path = `/tournaments/${tournamentId}/decks`;
const response = await fetch(`${origin}/api/tournament/${tournamentId}/decks`);
assert(response.ok, `Tournament request failed: ${response.status}`);
const { data: decks }: { data: TournamentDeckResponse[] } = await response.json();
const ranked = [...decks].sort(
  (a, b) => (a.tournamentDeck.placement || Infinity) - (b.tournamentDeck.placement || Infinity),
);
const leaders = getTopLeaderDecks(decks);
assert(leaders.length > 40, 'Use a tournament with more than 40 distinct leaders.');
const winner = leaders[0];
const last = leaders[leaders.length - 1];
const lastIndex = ranked.findIndex(deck => deck.deck?.id === last.deckId);
assert(lastIndex > 100, 'The final leader must be beyond the initial table batch.');
if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch();
const errors: string[] = [];
const shortcuts = (page: Page) =>
  page.getByRole('region', { name: 'Best placement by leader' }).getByRole('button');
const waitSelected = (page: Page, id: string) =>
  page.waitForURL(url => url.searchParams.get('maDeckId') === id);
const waitRevealed = async (page: Page, index: number) => {
  await page.waitForFunction(expectedIndex => {
    const container = document.querySelector('#tournament-deck-table');
    const row = container?.querySelector('tr[data-state="highlighted"]');
    const header = container?.querySelector('thead');
    if (!container || !row || !header || row.getAttribute('data-index') !== String(expectedIndex)) {
      return false;
    }
    const bounds = row.getBoundingClientRect();
    return (
      bounds.top >= header.getBoundingClientRect().bottom - 1 &&
      bounds.bottom <= container.getBoundingClientRect().bottom + 1
    );
  }, index);
};
const assertLeaderFilter = async (page: Page, leader: TopLeaderDeck) => {
  await waitSelected(page, leader.deckId);
  await page.waitForURL(
    url => url.searchParams.get('deckLeaders') === JSON.stringify([leader.leaderCardId]),
  );
  const matching = ranked.filter(deck =>
    [deck.deck?.leaderCardId1, deck.deck?.leaderCardId2].includes(leader.leaderCardId),
  );
  await page.waitForFunction(
    count =>
      document.querySelector('#tournament-deck-table table')?.getAttribute('aria-rowcount') ===
      String(count + 1),
    matching.length,
  );
  await waitRevealed(
    page,
    matching.findIndex(deck => deck.deck?.id === leader.deckId),
  );
  const rows = await page.locator('#tournament-deck-table tr[data-index]').evaluateAll(rows =>
    rows.map(row => ({
      index: Number(row.getAttribute('data-index')),
      placement: row.querySelector('td')?.textContent?.trim(),
    })),
  );
  for (const row of rows)
    assert.equal(row.placement, `#${matching[row.index].tournamentDeck.placement}`);
  await page
    .getByRole('group', { name: 'Deck filters', exact: true })
    .getByRole('img', { name: `card-${leader.leaderCardId}`, exact: true })
    .waitFor();
  assert.equal(
    await shortcuts(page).count(),
    leaders.length,
    'Leader shortcuts must remain available across filters.',
  );
};
const screenshot = async (page: Page, name: string) => {
  if (screenshotDirectory) {
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${screenshotDirectory}/${name}.png` });
  }
};

try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      deviceScaleFactor: mobile ? 2 : 1.25,
      viewport: mobile ? { width: 390, height: 1160 } : { width: 1440, height: 1200 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const network = await context.newCDPSession(page);
    await network.send('Network.enable');
    const requests = new Map<string, string>();
    const transferred = new Map<string, number>();
    network.on('Network.requestWillBeSent', event =>
      requests.set(event.requestId, event.request.url),
    );
    network.on('Network.loadingFinished', event => {
      const url = requests.get(event.requestId);
      if (url) transferred.set(url, event.encodedDataLength);
    });

    await page.goto(origin + path);
    await waitSelected(page, winner.deckId);
    await waitRevealed(page, 0);
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await page.getByRole('button', { name: 'Close deck details' }).waitFor();
    await page.waitForTimeout(1000); // Allow native lazy-image requests near the viewport to finish.
    const images = await page
      .getByRole('region', { name: 'Best placement by leader' })
      .locator('img')
      .evaluateAll(images =>
        images.map(image => ({
          src: image.src,
          loaded: image.complete && image.naturalWidth > 0,
          loading: image.loading,
        })),
      );
    assert.equal(images.length, leaders.length);
    assert(images.every(image => image.loading === 'lazy'));
    assert(images[0].loaded, 'The first visible leader must load.');
    assert(!images[images.length - 1].loaded, 'Distant leader images must remain deferred.');
    console.log(
      JSON.stringify({
        viewport: mobile ? 'mobile' : 'desktop',
        initialLeaderImagesLoaded: images.filter(image => image.loaded).length,
        totalLeaderImages: images.length,
        initialLeaderImageBytes: images.reduce(
          (sum, image) => sum + (transferred.get(image.src) ?? 0),
          0,
        ),
      }),
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await screenshot(page, mobile ? 'mobile' : 'desktop-dark');

    // A shortcut selects both the best deck and exactly one leader filter.
    const talzin = leaders.find(leader => leader.leaderCardId.startsWith('mother-talzin'))!;
    assert(talzin, 'The restored fixture should include Mother Talzin.');
    await shortcuts(page).nth(leaders.indexOf(talzin)).click();
    await assertLeaderFilter(page, talzin);
    if (mobile) {
      assert.equal(new URL(page.url()).hash, '#tournament-deck-detail');
      await page.waitForFunction(() => {
        const top = document.querySelector('#tournament-deck-detail')?.getBoundingClientRect().top;
        return top !== undefined && top >= 0 && top < 150;
      });
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
    await screenshot(page, mobile ? 'mobile-leader-filter' : 'desktop-leader-filter');

    const start = performance.now();
    await shortcuts(page).last().click();
    await waitSelected(page, last.deckId);
    await assertLeaderFilter(page, last);
    const revealMs = performance.now() - start;
    const renderedRows = await page.locator('#tournament-deck-table tr[data-index]').count();
    assert(renderedRows < 80, 'Deep selections must not render all preceding decks.');
    await shortcuts(page)
      .last()
      .locator('img')
      .evaluate(image => image.decode());
    console.log(
      JSON.stringify({ viewport: mobile ? 'mobile' : 'desktop', revealMs, renderedRows }),
    );
    if (mobile) {
      assert.equal(new URL(page.url()).hash, '#tournament-deck-detail');
      await page.waitForFunction(() => {
        const top = document.querySelector('#tournament-deck-detail')?.getBoundingClientRect().top;
        return top !== undefined && top >= 0 && top < 150;
      });
    }
    await page.goBack();
    await assertLeaderFilter(page, talzin);
    await page.goForward();
    await assertLeaderFilter(page, last);
    await page.reload();
    await assertLeaderFilter(page, last);

    // Clearing the filter retains the selected deck and reveals its global placement.
    const resetStart = performance.now();
    const historyBeforeReset = await page.evaluate(() => history.length);
    await page.getByRole('button', { name: 'Reset Filters (1)', exact: true }).click();
    await waitRevealed(page, lastIndex);
    assert.equal(new URL(page.url()).searchParams.get('deckLeaders'), null);
    assert.equal(await page.evaluate(() => history.length), historyBeforeReset);
    const unfilteredRows = await page.locator('#tournament-deck-table tr[data-index]').count();
    assert(unfilteredRows < 80);
    console.log(
      JSON.stringify({
        viewport: mobile ? 'mobile' : 'desktop',
        unfilteredRevealMs: performance.now() - resetStart,
        unfilteredRows,
      }),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, mobile ? 'mobile-deep-selection' : 'desktop-deep-selection');

    for (let index = lastIndex - 1; index >= lastIndex - 35; index--) {
      await page.keyboard.press('ArrowUp');
      await waitSelected(page, ranked[index].deck!.id);
      await waitRevealed(page, index);
    }
    await page.keyboard.press('ArrowDown');
    await waitRevealed(page, lastIndex - 34);

    // Manual scrolling must stay where the user moved, while offscreen rows unmount.
    await page.locator('#tournament-deck-table').evaluate(container => {
      container.scrollTop = 0;
    });
    await page.locator('#tournament-deck-table tr[data-index="0"]').waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#tournament-deck-table').evaluate(c => c.scrollTop), 0);
    assert.equal(
      await page.locator('#tournament-deck-table tr[data-state="highlighted"]').count(),
      0,
    );

    // Resizing and measuring newly visible rows must not snap back to the selection.
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width - 30, height: viewport.height - 100 });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#tournament-deck-table').evaluate(c => c.scrollTop), 0);
    await page.setViewportSize(viewport);

    // Start with a filtered #2 row, then switch leaders via a distant shortcut.
    // Its comparer selection must survive both reordering and unmounting.
    const filteredLeader = leaders[1];
    await page.goto(
      `${origin}${path}?${new URLSearchParams({
        deckLeaders: JSON.stringify([filteredLeader.leaderCardId]),
      })}`,
    );
    await waitSelected(page, filteredLeader.deckId);
    await waitRevealed(page, 0);
    const firstRow = page.locator('#tournament-deck-table tr[data-index="0"]');
    await firstRow.hover();
    await firstRow.getByRole('checkbox', { name: 'Select row' }).check();
    await shortcuts(page).last().click();
    await assertLeaderFilter(page, last);
    await page.locator('#tournament-deck-table tr[data-state="highlighted"]').hover();
    await page
      .locator('#tournament-deck-table tr[data-state="highlighted"]')
      .getByRole('checkbox', { name: 'Select row' })
      .check();
    await page.getByText('Comparer - 2 decks selected', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const comparerIds = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('swu-comparer-state') ?? '{}').entries.map(
        (entry: { id: string }) => entry.id,
      ),
    );
    assert.deepEqual(new Set(comparerIds), new Set([filteredLeader.deckId, last.deckId]));

    await shortcuts(page).first().click();
    await waitSelected(page, winner.deckId);
    await page.goBack();
    await assertLeaderFilter(page, last);
    await page.goForward();
    await assertLeaderFilter(page, winner);
    await page.goto(`${origin}${path}?maDeckId=${last.deckId}`);
    await waitRevealed(page, lastIndex);
    await page.reload();
    await waitRevealed(page, lastIndex);
    await page.waitForTimeout(250);
    const scrollBeforeClose = await page
      .locator('#tournament-deck-table')
      .evaluate(c => c.scrollTop);
    await page.getByRole('button', { name: 'Close deck details' }).click();
    await page.getByText('Select a deck to view details', { exact: true }).waitFor();
    await page.waitForTimeout(150);
    assert.equal(new URL(page.url()).searchParams.get('maDeckId'), null);
    assert.equal(
      await page.locator('#tournament-deck-table').evaluate(c => c.scrollTop),
      scrollBeforeClose,
    );

    const filters = new URLSearchParams({
      deckLeaders: JSON.stringify([winner.leaderCardId]),
      deckBase: ranked[0].deck!.baseCardId!,
      deckAspects: JSON.stringify(['Command']),
      deckFormat: '1',
    });
    await page.goto(`${origin}${path}?${filters}`);
    await waitSelected(page, winner.deckId);
    await shortcuts(page).last().click();
    await assertLeaderFilter(page, last);
    for (const field of ['deckBase', 'deckAspects', 'deckFormat', 'maDeckKey', 'maDeckKeyType']) {
      assert.equal(new URL(page.url()).searchParams.get(field), null);
    }
    if (mobile) assert.equal(new URL(page.url()).hash, '#tournament-deck-detail');
    await page.goto(`${origin}${path}?deckLeaders=${encodeURIComponent('["missing-leader"]')}`);
    await page.getByText('No decks match the selected filters.', { exact: true }).waitFor();
    await shortcuts(page).first().click();
    await waitRevealed(page, 0);

    // The ordinary controls edit the same URL-backed filter state as the shortcuts.
    const historyBeforeControls = await page.evaluate(() => history.length);
    const filterControls = page.getByRole('group', { name: 'Deck filters', exact: true });
    await filterControls.getByRole('button', { name: 'Cunning', exact: true }).click();
    await page.waitForURL(
      url => url.searchParams.get('deckAspects') === JSON.stringify(['Cunning']),
    );
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.evaluate(() => history.length), historyBeforeControls);
    await filterControls.getByRole('button', { name: 'Cunning', exact: true }).click();
    await page.waitForURL(url => !url.searchParams.has('deckAspects'));
    assert.equal(await page.evaluate(() => history.length), historyBeforeControls);
    await assertLeaderFilter(page, winner);

    await filterControls.getByText('Base', { exact: true }).click();
    let dialog = page.getByRole('dialog');
    const baseImage = dialog.locator('img[alt^="card-"]').first();
    const baseId = (await baseImage.getAttribute('alt'))!.slice(5);
    await baseImage.click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(url => url.searchParams.get('deckBase') === baseId);
    assert.equal(await page.evaluate(() => history.length), historyBeforeControls);
    await filterControls.getByRole('img', { name: `card-${baseId}`, exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(url => !url.searchParams.has('deckBase'));
    assert.equal(await page.evaluate(() => history.length), historyBeforeControls);
    await assertLeaderFilter(page, winner);

    await filterControls
      .getByRole('img', { name: `card-${winner.leaderCardId}`, exact: true })
      .click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(url => !url.searchParams.has('deckLeaders'));
    assert.equal(await page.evaluate(() => history.length), historyBeforeControls);
    await waitRevealed(page, 0);
    await shortcuts(page).first().click();
    await assertLeaderFilter(page, winner);

    await page.getByRole('link', { name: 'Details & Bracket', exact: true }).click();
    await page.getByRole('link', { name: 'All Decks', exact: true }).click();
    await waitSelected(page, winner.deckId);
    await waitRevealed(page, 0);
    assert.equal(new URL(page.url()).searchParams.get('deckLeaders'), null);

    if (!mobile) {
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await shortcuts(page).nth(leaders.indexOf(talzin)).click();
      await assertLeaderFilter(page, talzin);
      await screenshot(page, 'desktop-light');
    }
    console.log(
      `PASS ${mobile ? 'mobile' : 'desktop'}: lazy images, deep jumps, keyboard, scrolling, comparer, history, reload, close, filters, empty state`,
    );
    await context.close();
  }
  // A deck can be the best result for both of its leaders; only the clicked leader is filtered.
  const twinLeaderDecks = structuredClone(decks);
  const twinWinner = twinLeaderDecks.find(deck => deck.deck?.id === winner.deckId)!;
  twinWinner.deck!.leaderCardId2 = leaders[1].leaderCardId;
  const twinContext = await browser.newContext();
  await twinContext.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
  await twinContext.route(`**/api/tournament/${tournamentId}/decks`, route =>
    route.fulfill({
      json: { data: twinLeaderDecks },
    }),
  );
  const twinPage = await twinContext.newPage();
  twinPage.on('pageerror', error => errors.push(error.message));
  await twinPage.goto(origin + path);
  await waitSelected(twinPage, winner.deckId);
  const twinShortcuts = shortcuts(twinPage);
  for (const leader of [leaders[1], winner]) {
    const button = twinShortcuts.filter({
      has: twinPage.locator(`img[alt="card-${leader.leaderCardId}"]`),
    });
    await button.click();
    await twinPage.waitForURL(
      url => url.searchParams.get('deckLeaders') === JSON.stringify([leader.leaderCardId]),
    );
    assert.equal(
      await twinPage
        .getByRole('region', { name: 'Best placement by leader' })
        .locator('button[aria-pressed="true"]')
        .count(),
      1,
    );
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  }
  await twinContext.close();
  console.log('PASS dual-leader deck highlights only the selected leader');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime errors');
} finally {
  await browser.close();
}
