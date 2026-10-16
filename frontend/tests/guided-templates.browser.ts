// GUIDED_TEMPLATES_TEST=1 bun frontend/tests/guided-templates.browser.ts
// Uses real components and editor; API fixtures never write articles or refresh Melee.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import type { TemplateMeta } from '../../shared/types/ArticleTemplates.ts';
import catalog from '../../server/db/json/card-list.json';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.GUIDED_TEMPLATES_TEST !== '1' ||
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
const screenshots = new URL('../../.swubase/guided-template-screenshots/', import.meta.url)
  .pathname;
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
const deckId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const groupId = '33333333-3333-4333-8333-333333333333';
const limitedId = '44444444-4444-4444-8444-444444444444';
const cards = Object.values(catalog);
const sor = cards.filter(card =>
  Object.values(card.variants).some(v => v.set === 'sor' && v.baseSet),
);
const leaders = sor.filter(card => card.type === 'Leader').slice(0, 6);
const base = sor.find(card => card.type === 'Base')!;
const main = [
  ...[2, 3, 4, 5].map(cost => sor.find(card => card.type === 'Unit' && card.cost === cost)!),
  sor.find(card => card.type === 'Event')!,
  sor.find(card => card.type === 'Upgrade')!,
];
const deck = {
  id: deckId,
  userId: 'template-author',
  format: 1,
  name: 'My guided deck',
  description: '',
  public: 1,
  cardPoolId: null,
  leaderCardId1: leaders[0]!.cardId,
  leaderCardId2: null,
  baseCardId: base.cardId,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};
const deckRows = main.map(card => ({ deckId, cardId: card.cardId, quantity: 3, board: 1 }));
const limited = { ...deck, id: limitedId, name: 'My limited deck', format: 3 };
const draft = {
  ...limited,
  id: '55555555-5555-4555-8555-555555555555',
  name: 'My draft deck',
  format: 4,
};
const meta: TemplateMeta = {
  source: { scope: 'current', id: '19', name: 'Current fixture meta' },
  asOf: '2026-10-15',
  deckCount: 42,
  events: [
    { id: eventId, name: 'Fixture qualifier', date: '2026-10-10', attendance: 64, imported: true },
  ],
  archetypes: leaders.map((l, i) => ({
    key: `${l.cardId}|${base.cardId}`,
    leaderId: l.cardId,
    baseId: base.cardId,
    count: 12 - i * 2,
  })),
  decklists: [
    {
      id: deckId,
      name: deck.name,
      leaderId: leaders[0]!.cardId,
      baseId: base.cardId,
      tournamentId: eventId,
      tournamentName: 'Fixture qualifier',
      placement: 2,
    },
  ],
};
let metaMode: 'ready' | 'error' | 'empty' = 'ready';
await page.route('**/api/deck?**', route =>
  route.fulfill({
    json: {
      data: [deck, limited, draft, { ...deck, id: 'private', name: 'Private deck', public: 0 }].map(
        deck => ({
          deck,
          deckInformation: null,
          user: { id: 'template-author', displayName: 'Template author' },
        }),
      ),
      pagination: { hasMore: false, offset: 0, limit: 20 },
    },
  }),
);
for (const row of [deck, limited, draft]) {
  await page.route(`**/api/deck/${row.id}`, route =>
    route.fulfill({
      json: {
        deck: row,
        user: { id: 'template-author', displayName: 'Template author', currency: 'USD' },
        importSource: null,
        isFavorite: false,
        entityPrices: [],
      },
    }),
  );
  await page.route(`**/api/deck/${row.id}/card`, route =>
    route.fulfill({ json: { data: deckRows.map(card => ({ ...card, deckId: row.id })) } }),
  );
}
await page.route('**/api/creator-hub/templates/meta?**', route => {
  const query = new URL(route.request().url()).searchParams;
  return route.fulfill(
    metaMode === 'error'
      ? { status: 503, json: { message: 'Unavailable' } }
      : {
          json: {
            data: {
              ...meta,
              deckCount: metaMode === 'empty' ? 0 : meta.deckCount,
              archetypes: metaMode === 'empty' ? [] : meta.archetypes,
              source:
                query.get('scope') === 'current'
                  ? meta.source
                  : {
                      scope: query.get('scope'),
                      id: query.get('id'),
                      name:
                        query.get('scope') === 'group' ? 'Fixture weekend' : 'Fixture qualifier',
                    },
            },
          },
        },
  );
});
await page.route('**/api/tournament-groups?**', route =>
  route.fulfill({
    json: {
      data: [
        {
          group: { id: groupId, name: 'Fixture weekend', visible: true },
          tournaments: [{ tournament: { id: eventId, date: '2026-10-10' } }],
        },
      ],
      pagination: { hasMore: false, offset: 0, limit: 20 },
    },
  }),
);
await page.route('**/api/creator-hub/subjects?**', route =>
  route.fulfill({
    json: {
      data: [{ type: 'tournament', id: eventId, label: 'Fixture qualifier', date: '2026-10-10' }],
    },
  }),
);
const section = page.getByRole('region', { name: 'Template editor fixture' });
const open = async (name: string) => {
  if (
    !(await section.locator('details').evaluate(el => el instanceof HTMLDetailsElement && el.open))
  )
    await section.locator('summary').click();
  await section.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  return page.getByRole('dialog', { name, exact: true });
};
const saved = () => page.evaluate(() => window.articleTemplateFixtureDocument);
const replace = () => page.once('dialog', prompt => prompt.accept());
try {
  await page.goto(url);
  let dialog = await open('Deck guide');
  await expect(dialog.getByRole('button', { name: 'Private deck', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: /My guided deck/ }).click();
  await expect(dialog.getByRole('region', { name: 'Current meta matchups' })).toContainText(
    '42 public tournament decks',
  );
  const preview = dialog.getByRole('region', { name: 'Template preview' });
  await expect(preview.getByRole('checkbox', { name: /2 drops/ })).toBeChecked();
  await preview.getByRole('checkbox', { name: /Final thoughts/ }).uncheck();
  await dialog.screenshot({ path: `${screenshots}/deck-guide-dark.png` });
  await dialog.getByRole('button', { name: 'Create article', exact: true }).click();
  await expect(section.locator('[data-widget-kind=matchup]')).toHaveCount(5);
  await expect(section.locator('[data-widget-kind=matchup]').first()).toBeVisible();
  await expect(section.locator('.bn-editor').first()).toContainText('Sideboard plan:');
  await expect(section.locator('.bn-editor').first()).toContainText(main[0]!.name);
  await expect(section.getByRole('heading', { name: 'Final thoughts', exact: true })).toHaveCount(
    0,
  );
  expect((await saved()).title).toBe('My guided deck — deck guide');
  expect((await saved()).references).toContainEqual({
    type: 'deck',
    id: deckId,
    startSeconds: null,
  });
  await section.getByLabel('Article title').fill('My personal title');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  dialog = await open('Limited guide');
  await dialog.getByLabel('Limited set').selectOption('sor');
  await dialog.getByLabel('Limited format').selectOption('Sealed');
  const chooseLeader = dialog.getByRole('region', { name: 'Leaders to discuss' });
  await chooseLeader.getByRole('checkbox').first().check();
  const chooseCard = dialog.getByRole('region', { name: 'Cards to prioritise' });
  await chooseCard.getByRole('checkbox').first().check();
  await dialog.getByRole('button', { name: 'Add an example deck' }).click();
  await expect(dialog.getByRole('button', { name: /My guided deck/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /My draft deck/ })).toHaveCount(0);
  await dialog.getByRole('button', { name: /My limited deck/ }).click();
  await expect(dialog.getByRole('region', { name: 'Template preview' })).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.screenshot({ path: `${screenshots}/limited-guide-mobile-light.png` });
  replace();
  await dialog.getByRole('button', { name: 'Create article', exact: true }).click();
  await expect(
    section.getByRole('heading', { name: 'Building your sealed deck', exact: true }),
  ).toBeVisible();
  expect((await saved()).title).toBe('My personal title');
  expect((await saved()).references).toContainEqual({ type: 'set', id: 'sor', startSeconds: null });
  expect((await saved()).references).not.toContainEqual({
    type: 'deck',
    id: deckId,
    startSeconds: null,
  });
  expect((await saved()).references).toContainEqual({
    type: 'deck',
    id: limitedId,
    startSeconds: null,
  });
  dialog = await open('Meta report');
  await dialog.getByRole('button', { name: /Fixture weekend/ }).click();
  await expect(dialog.getByRole('region', { name: 'Featured decklists' })).toContainText(
    '#2 · Fixture qualifier',
  );
  await dialog
    .getByRole('region', { name: 'Template preview' })
    .getByRole('checkbox', { name: /The field/ })
    .uncheck(); // Avoid the unrelated live chart fetching fixture group data.
  const archetype = dialog
    .getByRole('region', { name: 'Archetypes to discuss' })
    .getByRole('checkbox')
    .first();
  const featured = dialog
    .getByRole('region', { name: 'Featured decklists' })
    .getByRole('checkbox')
    .first();
  await archetype.uncheck();
  await featured.uncheck();
  await page.evaluate(async () => {
    const path = '/src/queryClient.ts';
    const { queryClient } = await import(/* @vite-ignore */ path);
    await queryClient.invalidateQueries({ queryKey: ['article-templates', 'meta'] });
  });
  await expect(archetype).not.toBeChecked();
  await expect(featured).not.toBeChecked();
  await expect(
    dialog
      .getByRole('region', { name: 'Template preview' })
      .getByRole('checkbox', { name: /The field/ }),
  ).not.toBeChecked();
  await featured.check();
  await dialog.screenshot({ path: `${screenshots}/meta-guide-mobile-light.png` });
  replace();
  await dialog.getByRole('button', { name: 'Create article', exact: true }).click();
  await expect(
    section.getByRole('heading', { name: 'Top-performing decks', exact: true }),
  ).toBeVisible();
  expect(JSON.stringify((await saved()).body)).toContain('#2 · Fixture qualifier');
  expect((await saved()).references).toContainEqual({
    type: 'tournament',
    id: eventId,
    startSeconds: null,
  });
  await page.reload();
  dialog = await open('Meta report');
  await dialog.getByRole('tab', { name: 'Tournaments', exact: true }).click();
  await dialog.getByRole('button', { name: /Fixture qualifier/ }).click();
  await expect(dialog.getByRole('region', { name: 'Template preview' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  metaMode = 'error';
  await page.reload();
  dialog = await open('Deck guide');
  await dialog.getByRole('button', { name: /My guided deck/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not load current meta data');
  await expect(dialog.getByRole('button', { name: 'Create article', exact: true })).toHaveCount(0);
  metaMode = 'ready';
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Create article', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  metaMode = 'empty';
  await page.reload();
  dialog = await open('Meta report');
  await dialog.getByRole('button', { name: /Fixture weekend/ }).click();
  await expect(dialog).toContainText('No imported public deck data');
  await expect(dialog.getByRole('button', { name: 'Create article', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Use blank template', exact: true }).click();
  await expect(
    section.getByRole('heading', { name: 'Events and data sources', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Guided templates passed: deck groups and five matchups, limited choices, meta sources, selection, metadata, recovery, mobile/light/dark.',
  );
} catch (error) {
  console.log((await page.locator('[role=dialog]').allTextContents()).join('\n'));
  console.log('Page errors:', errors);
  await page.screenshot({ path: `${screenshots}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
