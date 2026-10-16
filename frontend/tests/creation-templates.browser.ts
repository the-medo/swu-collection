// CREATION_TEMPLATES_TEST=1 bun frontend/tests/creation-templates.browser.ts
// Uses real components and editor; API fixtures never write articles or refresh Melee.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import type { TournamentReport } from '../../shared/types/TournamentReport.ts';
import type { UserMeleeTournamentsResponse } from '../../shared/types/UserMeleeTournaments.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.CREATION_TEMPLATES_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this check against a local worktree frontend.');
const expect = baseExpect.configure({ timeout: 15_000 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/template-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const url = `${origin}/users/swubase`;
await page.route(`${url}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script>
<script type="module" src="/@vite/client"></script><script type="module" src="/tests/creation-templates.harness.tsx"></script></body></html>`,
  }),
);
await page.route('**/api/auth/get-session**', route =>
  route.fulfill({
    json: {
      user: {
        id: 'template-author',
        name: 'Template author',
        displayName: 'Template author',
        email: 'template@example.invalid',
        emailVerified: false,
        role: 'user',
        currency: 'USD',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      session: {
        id: 'template-session',
        userId: 'template-author',
        expiresAt: '2099-01-01T00:00:00Z',
      },
    },
  }),
);
const eventId = '11111111-1111-4111-8111-111111111111';
const partialId = '22222222-2222-4222-8222-222222222222';
const report: TournamentReport = {
  tournament: {
    id: eventId,
    name: 'Planetary Qualifier · Prague',
    date: '2026-10-10',
    format: 'Premier',
    attendance: 64,
    placement: 12,
    record: '2-1-0',
    completed: true,
  },
  deck: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Sabine · Tempo',
    leaderId: 'sabine-wren--galvanized-revolutionary',
    baseId: 'energy-conversion-lab',
    hasDecklist: true,
  },
  rounds: [
    {
      round: 1,
      opponentName: 'Leia Organa',
      opponentDeck: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Tarkin',
        leaderId: 'grand-moff-tarkin--oversector-governor',
        baseId: 'command-center',
        hasDecklist: true,
      },
      outcome: 'win',
      games: { wins: 2, losses: 1, draws: 0 },
      record: { wins: 1, losses: 0, draws: 0 },
    },
    {
      round: 2,
      opponentName: 'Han Solo',
      opponentDeck: null,
      outcome: 'loss',
      games: { wins: 0, losses: 2, draws: 0 },
      record: { wins: 1, losses: 1, draws: 0 },
    },
    {
      round: 3,
      opponentName: null,
      opponentDeck: null,
      outcome: 'bye',
      games: null,
      record: { wins: 2, losses: 1, draws: 0 },
    },
  ],
  hasMetaDecks: true,
};
const history: UserMeleeTournamentsResponse = {
  connected: true,
  lastRefreshedAt: '2026-10-15T00:00:00Z',
  nextRefreshAt: null,
  stats: {
    topEights: 0,
    pqOpenTotal: 2,
    dayTwos: 0,
    majorTotal: 0,
    unknownDayTwoCutoffs: 0,
    bestMajorFinishes: [],
  },
  tournaments: [
    report.tournament,
    { ...report.tournament, id: partialId, name: 'Weekly showdown', date: '2026-09-01' },
  ].map((event, index) => ({
    ...event,
    meleeId: 100 + index,
    tournamentId: event.id,
    type: 'pq',
    typeName: 'Planetary Qualifier',
    topEight: false,
    dayTwo: false,
    major: false,
    dayTwoEligible: false,
    dayTwoCutoffKnown: true,
    deck: null,
    meleeDecklistId: null,
    meleeDecklistName: null,
  })),
};
let mode: 'ready' | 'disconnected' | 'empty' | 'error' = 'ready';
let reportFailure = false;
let refreshes = 0;
await page.route('**/api/user/template-author/tournaments', route =>
  mode === 'error'
    ? route.fulfill({
        status: 503,
        json: { message: 'Tournament history is temporarily unavailable.' },
      })
    : route.fulfill({
        json: {
          data: {
            ...history,
            connected: mode !== 'disconnected',
            tournaments: mode === 'ready' ? history.tournaments : [],
          },
        },
      }),
);
await page.route('**/api/user/template-author/tournaments/refresh', route => {
  refreshes++;
  mode = 'ready';
  return route.fulfill({ json: { data: history } });
});
await page.route('**/api/user/template-author/tournaments/*/report', route =>
  reportFailure
    ? route.fulfill({ status: 503, json: { message: 'Could not prepare the report. Try again.' } })
    : route.fulfill({
        json: {
          data: route.request().url().includes(partialId)
            ? {
                ...report,
                tournament: { ...report.tournament, id: partialId, name: 'Weekly showdown' },
                deck: null,
                rounds: [],
                hasMetaDecks: false,
              }
            : report,
        },
      }),
);
await page.route(`**/api/tournament/${eventId}`, route =>
  route.fulfill({
    json: {
      tournament: { ...report.tournament, imported: true, days: 1, dayTwoPlayerCount: null },
    },
  }),
);
await page.route(`**/api/tournament/${eventId}/decks`, route =>
  route.fulfill({
    json: {
      data: [report.deck!, report.rounds[0]!.opponentDeck!].map((deck, index) => ({
        tournamentDeck: {
          tournamentId: eventId,
          deckId: deck.id,
          placement: index + 1,
          recordWin: 2,
          recordLose: 1,
          recordDraw: 0,
        },
        deck: { id: deck.id, public: 1, leaderCardId1: deck.leaderId, baseCardId: deck.baseId },
        deckInformation: null,
      })),
    },
  }),
);
const section = page.getByRole('region', { name: 'Template editor fixture' });
const dialog = page.getByRole('dialog', { name: 'Tournament report', exact: true });
const open = async () => {
  const summary = section.locator('summary');
  if (
    !(await section
      .locator('details')
      .evaluate(element => element instanceof HTMLDetailsElement && element.open))
  )
    await summary.click();
  await section.getByRole('button', { name: /^Tournament report/ }).click();
};
try {
  await page.goto(url);
  await expect(section.getByRole('button', { name: /^Deck guide/ })).toBeVisible();
  const rows = await section.locator('details button').evaluateAll(elements =>
    elements.map(element => ({
      top: element.getBoundingClientRect().top,
      width: element.getBoundingClientRect().width,
    })),
  );
  expect(rows).toHaveLength(4);
  expect(
    rows.every((row, index) => row.width > 500 && (!index || row.top > rows[index - 1]!.top)),
  ).toBe(true);
  await section.locator('details').screenshot({ path: `${screenshots}/rows-dark.png` });
  await open();
  await expect(
    dialog.getByRole('button', { name: 'Use tournament report', exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ })).toBeVisible();
  await dialog.getByLabel('Search your tournaments').fill('Weekly');
  await expect(dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ })).toHaveCount(0);
  await dialog.getByLabel('Search your tournaments').clear();
  await dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ }).click();
  await expect(dialog.getByRole('region', { name: 'Report preview' })).toContainText(
    'Round 3 · Bye',
  );
  await dialog.screenshot({ path: `${screenshots}/report-dark.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.screenshot({ path: `${screenshots}/report-mobile.png` });
  await dialog.getByRole('button', { name: 'Use tournament report', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(section.locator('[data-widget-kind=matchup]')).toHaveCount(3);
  await expect(section.locator('.rte-decklist')).toHaveAttribute('data-deck-id', report.deck!.id);
  await expect(section.locator('.rte-matchup-footer').first()).toHaveText(
    'Win · Games 2–1–0 · Overall 1–0–0',
  );
  const toggle = (title: string) =>
    section
      .locator('.bn-toggle-wrapper')
      .filter({
        has: page.getByRole('heading', { name: title, exact: true }),
      })
      .locator('.bn-toggle-button');
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeVisible();
  const assertRoundSpacing = async () => {
    const gaps = await section
      .locator('[data-widget-kind=matchup]')
      .evaluateAll(elements =>
        elements
          .slice(1)
          .map(
            (element, index) =>
              element.getBoundingClientRect().top - elements[index]!.getBoundingClientRect().bottom,
          ),
      );
    expect(gaps.every(gap => gap >= 0 && gap <= 16)).toBe(true);
  };
  await assertRoundSpacing();
  await expect(section.locator('.rte-decklist')).toBeVisible();
  await toggle('Decklist').click();
  await expect(section.locator('.rte-decklist')).toBeHidden();
  await expect(section.locator('.rte-meta')).toContainText('Total decks analyzed: 2');
  expect(await section.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(
    await section.evaluate(element => element.getBoundingClientRect().right <= window.innerWidth),
  ).toBe(true);
  await section.screenshot({ path: `${screenshots}/sections-mobile.png` });
  await toggle('Meta').focus();
  await page.keyboard.press('Enter');
  await expect(section.locator('.rte-meta')).toBeHidden();
  const generated = await page.evaluate(() => window.articleTemplateFixtureDocument);
  expect(generated.title).toBe('Planetary Qualifier · Prague — tournament report');
  expect(generated.references).toEqual([{ type: 'tournament', id: eventId, startSeconds: null }]);
  await section.getByRole('button', { name: 'Edit matchup', exact: true }).first().click();
  await expect(
    page.getByRole('dialog', { name: 'Edit matchup', exact: true }).getByLabel('Footer'),
  ).toHaveValue('Win · Games 2–1–0 · Overall 1–0–0');
  await page
    .getByRole('dialog', { name: 'Edit matchup', exact: true })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  // Cancelling replacement preserves the complete draft.
  await open();
  page.once('dialog', prompt => prompt.dismiss());
  await dialog.getByRole('button', { name: 'Use blank report', exact: true }).click();
  expect(await page.evaluate(() => window.articleTemplateFixtureDocument)).toEqual(generated);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  // Switching events replaces only template-generated metadata, and blank clears it.
  await open();
  await dialog.getByRole('button', { name: /Weekly showdown/ }).click();
  page.once('dialog', prompt => prompt.accept());
  await dialog.getByRole('button', { name: 'Use tournament report', exact: true }).click();
  await expect(section.getByLabel('Article title')).toHaveValue(
    'Weekly showdown — tournament report',
  );
  expect((await page.evaluate(() => window.articleTemplateFixtureDocument)).references).toEqual([
    { type: 'tournament', id: partialId, startSeconds: null },
  ]);
  await open();
  page.once('dialog', prompt => prompt.accept());
  await dialog.getByRole('button', { name: 'Use blank report', exact: true }).click();
  await expect(section.getByLabel('Article title')).toHaveValue('');
  expect((await page.evaluate(() => window.articleTemplateFixtureDocument)).references).toEqual([]);
  // An author-written title survives both applying an event and returning to a blank report.
  await section.getByLabel('Article title').fill('My tournament story');
  await open();
  await dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ }).click();
  page.once('dialog', prompt => prompt.accept());
  await dialog.getByRole('button', { name: 'Use tournament report', exact: true }).click();
  await expect(section.getByLabel('Article title')).toHaveValue('My tournament story');
  await open();
  page.once('dialog', prompt => prompt.accept());
  await dialog.getByRole('button', { name: 'Use blank report', exact: true }).click();
  await expect(section.getByLabel('Article title')).toHaveValue('My tournament story');
  expect((await page.evaluate(() => window.articleTemplateFixtureDocument)).references).toEqual([]);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await section.locator('details').screenshot({ path: `${screenshots}/rows-light.png` });
  await open();
  await dialog.getByRole('button', { name: /Weekly showdown/ }).click();
  await expect(dialog).toContainText('Round details aren’t available');
  await dialog.screenshot({ path: `${screenshots}/report-light.png` });
  await dialog.getByRole('button', { name: 'Use tournament report', exact: true }).click();
  await expect(section.locator('.bn-editor')).toContainText('Add a matchup for each round');
  await expect(section.locator('[data-widget-kind=matchup], .rte-decklist')).toHaveCount(0);

  mode = 'disconnected';
  await page.reload();
  await open();
  await expect(dialog.getByRole('link', { name: 'Connect Melee' })).toHaveAttribute(
    'href',
    '/settings?page=integrations',
  );
  await dialog.getByRole('button', { name: 'Use blank report', exact: true }).click();
  await expect(section.locator('.bn-editor')).toContainText('Pre-tournament & preparation');
  mode = 'empty';
  await page.reload();
  await open();
  await expect(dialog).toContainText('No tournaments found yet');
  await dialog.getByRole('button', { name: 'Refresh from Melee' }).click();
  await expect(dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ })).toBeVisible();
  expect(refreshes).toBe(1);
  reportFailure = true;
  await dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ }).click();
  await expect(dialog.getByRole('button', { name: 'Retry report' })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Use tournament report', exact: true }),
  ).toBeDisabled();
  reportFailure = false;
  await dialog.getByRole('button', { name: 'Retry report' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Use tournament report', exact: true }),
  ).toBeEnabled();
  mode = 'error';
  await page.reload();
  await open();
  await expect(dialog.getByRole('button', { name: 'Retry tournaments' })).toBeVisible();
  mode = 'ready';
  await dialog.getByRole('button', { name: 'Retry tournaments' }).click();
  await expect(dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ })).toBeVisible();
  await dialog.getByRole('button', { name: /Planetary Qualifier · Prague/ }).click();
  await dialog.getByRole('button', { name: 'Use tournament report', exact: true }).click();
  await section.getByRole('button', { name: 'Preview article', exact: true }).click();
  await expect(section.getByRole('button', { name: 'Edit matchup', exact: true })).toHaveCount(0);
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeVisible();
  await assertRoundSpacing();
  await toggle('Rounds').click();
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeHidden();
  await toggle('Rounds').focus();
  await page.keyboard.press('Space');
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeVisible();
  await expect(section.locator('.rte-meta')).toContainText('Total decks analyzed: 2');
  await expect(section.locator('.rte-decklist')).toBeVisible();
  // A reader's explicit collapse survives remounting without changing the saved default.
  await toggle('Meta').click();
  await section.getByRole('button', { name: 'Return to editor', exact: true }).click();
  await expect(section.locator('.rte-meta')).toBeHidden();
  const savedBody = await page.evaluate(() => window.articleTemplateFixtureDocument.body!);
  expect(
    savedBody.blocks
      .filter(block => block.type === 'heading' && block.props.isToggleable)
      .every(block => 'defaultOpen' in block.props && block.props.defaultOpen),
  ).toBe(true);
  // Simulate opening the saved article with no remembered toggle preferences.
  await page.evaluate(body => {
    for (const block of body.blocks) localStorage.removeItem(`toggle-${block.id}`);
  }, savedBody);
  await section.getByRole('button', { name: 'Preview article', exact: true }).click();
  await expect(section.locator('.rte-meta')).toBeVisible();
  await expect(section.locator('.rte-decklist')).toBeVisible();
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await section.screenshot({ path: `${screenshots}/sections-dark.png` });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await section.screenshot({ path: `${screenshots}/sections-light.png` });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  expect(errors).toEqual([]);
  console.log(
    'Template rows, tournament reports, editable matchups, replacement protection, light/dark/mobile, disconnected/empty/error/retry states passed.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-5000));
  await page.screenshot({ path: `${screenshots}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
