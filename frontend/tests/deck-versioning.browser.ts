// DECK_VERSION_BROWSER_TEST=1 bun frontend/tests/deck-versioning.browser.ts
// Build first. Exercises the real UI with explicit local API fixtures; no external services.
import { chromium, expect as baseExpect } from 'playwright/test';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import type { DeckVersionDiff, DeckVersionMetadata } from '../../types/Deck.ts';

if (process.env.DECK_VERSION_BROWSER_TEST !== '1')
  throw new Error('Enable DECK_VERSION_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const deckId = '11111111-1111-4111-8111-111111111111';
const ownerId = 'version-browser-owner';
const sealedId = '22222222-2222-4222-8222-222222222222';
const openId = '33333333-3333-4333-8333-333333333333';
let revision = 0,
  quantity = 1,
  failWrite = false;
let releaseWrite: (() => void) | undefined;
let holdWrite = false;
const saves: Array<{ changeNote?: string; expectedUpdatedAt: string }> = [];
let diffMode: 'full' | 'empty' | 'notes' | 'metadata' | 'error' = 'full';
let releaseDiff: (() => void) | undefined;
let holdDiff = false;
const beforeMetadata: DeckVersionMetadata = {
  name: 'Old name',
  description: 'Before description',
  format: 1,
  leaderCardId1: 'sabine-wren--galvanized-revolutionary',
  leaderCardId2: null,
  baseCardId: 'command-center',
};
const afterMetadata: DeckVersionMetadata = {
  name: 'New name',
  description: 'After description',
  format: 6,
  leaderCardId1: null,
  leaderCardId2: 'unknown-preview-leader',
  baseCardId: null,
};
const fullDiff: DeckVersionDiff = {
  versionId: openId,
  versionNumber: 2,
  state: 'open',
  cards: [],
  changes: [{ cardId: 'battlefield-marine', board: 1, quantityChange: 1 }],
  noteChanges: [
    { cardId: 'battlefield-marine', board: 1, before: 'Old card note', after: 'New card note' },
  ],
  summary: { addedCards: 0, removedCards: 0, changedCards: 1 },
  metadata: { before: beforeMetadata, after: afterMetadata },
};
const stamp = () => new Date(Date.UTC(2026, 9, 12, 0, 0, revision)).toISOString();
const actor = {
  id: ownerId,
  name: 'Version tester',
  displayName: 'Version tester',
  email: 'fixture@invalid.local',
  emailVerified: true,
  role: 'user',
  currency: 'USD',
  image: null,
  createdAt: stamp(),
  updatedAt: stamp(),
};
const permissions = {
  canRead: true,
  canEditContent: true,
  canSaveVersion: true,
  canEditMetadata: true,
  canChangeVisibility: true,
  canDelete: true,
  canEditAsTeamMember: false,
};
const deckData = () => ({
  deck: {
    id: deckId,
    userId: ownerId,
    name: 'Version browser fixture',
    description: '',
    format: 1,
    public: 1,
    leaderCardId1: 'sabine-wren--galvanized-revolutionary',
    leaderCardId2: null,
    baseCardId: 'command-center',
    cardPoolId: null,
    versionCount: 2,
    createdAt: stamp(),
    updatedAt: stamp(),
  },
  user: actor,
  isFavorite: null,
  entityPrices: [],
  permissions,
  reference: {
    id: deckId,
    deckId,
    deckVersionId: null,
    kind: 'parent',
    versionNumber: null,
    latestVersionNumber: 2,
  },
});
async function fixture(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/auth/get-session')
    return Response.json({
      user: actor,
      session: {
        id: 'fixture',
        userId: ownerId,
        token: 'fixture',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  if (pathname === '/api/cards')
    return Response.json({
      official: { needsUpdate: true, lastUpdated: 'version-fixture', cards: cardList },
      preview: { needsUpdate: true, lastUpdated: 'version-fixture', cards: {} },
      karabast_unimplemented: {},
    });
  if (pathname === `/api/deck/${deckId}`) return Response.json(deckData());
  if (pathname === `/api/deck/${deckId}/tournament`) return Response.json({ data: null });
  if (pathname === `/api/deck/${deckId}/article`)
    return Response.json({ message: 'No article' }, { status: 404 });
  if (pathname === `/api/deck/${deckId}/versions/${openId}/diff`) {
    if (holdDiff)
      await new Promise<void>(resolve => {
        releaseDiff = resolve;
      });
    if (diffMode === 'error')
      return Response.json({ message: 'Fixture diff failure' }, { status: 500 });
    return Response.json({
      data: {
        ...fullDiff,
        changes: diffMode === 'full' ? fullDiff.changes : [],
        noteChanges: diffMode === 'full' || diffMode === 'notes' ? fullDiff.noteChanges : [],
        metadata:
          diffMode === 'full' || diffMode === 'metadata'
            ? fullDiff.metadata
            : { before: beforeMetadata, after: beforeMetadata },
      },
    });
  }
  if (pathname === `/api/deck/${deckId}/card`) {
    if (request.method === 'PUT') {
      const body = await request.json();
      if (holdWrite)
        await new Promise<void>(resolve => {
          releaseWrite = resolve;
        });
      if (failWrite) return Response.json({ message: 'Fixture write failure' }, { status: 500 });
      quantity = body.data.quantity;
      revision++;
    }
    const card = { deckId, cardId: 'battlefield-marine', board: 1, quantity, note: '' };
    return Response.json({
      data: request.method === 'PUT' ? card : [card],
      deckUpdatedAt: stamp(),
    });
  }
  if (pathname === `/api/deck/${deckId}/versions`) {
    if (request.method === 'POST') {
      const body = await request.json();
      saves.push(body);
      if (body.expectedUpdatedAt !== stamp())
        return Response.json(
          { message: 'The deck changed since this page was loaded' },
          { status: 409 },
        );
      return Response.json(
        {
          data: {
            sealedVersion: { id: openId },
            openVersion: { id: '44444444-4444-4444-8444-444444444444' },
          },
        },
        { status: 201 },
      );
    }
    return Response.json({
      deckId,
      data: [
        {
          id: openId,
          deckId,
          versionNumber: 2,
          state: 'open',
          hasChanges: true,
          hasPlayableChanges: true,
          addedCards: 0,
          removedCards: 0,
          changedCards: 1,
          createdAt: stamp(),
          sealedAt: null,
          changeNote: null,
        },
        {
          id: sealedId,
          deckId,
          versionNumber: 1,
          state: 'sealed',
          hasChanges: true,
          hasPlayableChanges: true,
          addedCards: 1,
          removedCards: 0,
          changedCards: 0,
          createdAt: stamp(),
          sealedAt: stamp(),
          changeNote: null,
        },
      ],
    });
  }
  if (pathname === '/api/user-settings') return Response.json({});
  if (pathname === '/api/application-configuration')
    return Response.json({ homepageMode: 'snapshot' });
  if (pathname.includes('/discussion'))
    return Response.json({ message: 'No discussion' }, { status: 404 });
  return Response.json({ data: [], pagination: { hasMore: false } });
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/api/')) return fixture(request);
    const file = resolve(dist, `.${pathname}`);
    return new Response(
      Bun.file(
        file.startsWith(dist + '/') && (await Bun.file(file).exists())
          ? file
          : resolve(dist, 'index.html'),
      ),
    );
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 20000 });
const contexts = [];
const browserErrors: string[] = [];
try {
  const pages = [];
  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
    contexts.push(context);
    await context.addInitScript(() => {
      Object.assign(window, { amplitude: { init() {} } });
      localStorage.setItem('cookie-consent', 'true');
      localStorage.setItem('vite-ui-theme', 'light');
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        const response = await fixture(
          new Request(route.request().url(), {
            method: route.request().method(),
            body: route.request().postData() || undefined,
            headers: route.request().headers(),
          }),
        );
        return route.fulfill({
          status: response.status,
          contentType: 'application/json',
          body: await response.text(),
        });
      }
      if (url.origin === server.url.origin) return route.continue();
      return route.abort();
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage();
    pages.push(page);
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
        browserErrors.push(message.text());
    });
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.goto(`${server.url}decks/${deckId}`);
    await expect(
      page.getByRole('button', { name: 'Save current version', exact: true }),
    ).toBeEnabled();
  }
  const [first, second] = pages;
  const cardQuantity = (page: (typeof pages)[number]) =>
    page.locator('input[type="number"][max="15"]');
  const secondQuantity = cardQuantity(second);
  await expect(secondQuantity).toHaveValue('1');
  holdWrite = true;
  await secondQuantity.fill('2');
  await second.getByRole('button', { name: 'Save current version', exact: true }).click();
  await expect(second.getByRole('button', { name: 'Waiting for deck edits…' })).toBeDisabled();
  expect(saves).toHaveLength(0);
  await expect.poll(() => !!releaseWrite).toBe(true);
  // Keep a second buffered edit through the first mutation's completion render.
  await secondQuantity.fill('3');
  holdWrite = false;
  releaseWrite!();
  releaseWrite = undefined;
  await expect.poll(() => quantity).toBe(3);
  await expect(
    second.getByRole('button', { name: 'Save current version', exact: true }),
  ).toBeEnabled();
  await first.getByPlaceholder('Optional version note').fill('Keep this note');
  await first.getByRole('button', { name: 'Save current version', exact: true }).click();
  await expect(first.getByText('Deck changed since you loaded it', { exact: true })).toBeVisible();
  await expect(first.getByPlaceholder('Optional version note')).toHaveValue('Keep this note');
  await expect(cardQuantity(first)).toHaveValue('3');
  expect(saves[0].expectedUpdatedAt).not.toBe(stamp());
  await first.getByRole('button', { name: 'Save current version', exact: true }).click();
  await expect(first.getByPlaceholder('Optional version note')).toHaveValue('');
  expect(saves[1]).toEqual({ changeNote: 'Keep this note', expectedUpdatedAt: stamp() });
  failWrite = true;
  await secondQuantity.fill('4');
  await secondQuantity.blur();
  await expect(second.getByText('Error while updating the card', { exact: true })).toBeVisible();
  await expect(secondQuantity).toHaveValue('3');
  await expect(
    second.getByRole('button', { name: 'Save current version', exact: true }),
  ).toBeEnabled();
  expect(saves).toHaveLength(2);
  const expandChanges = () => second.getByRole('button', { name: '~1', exact: true });
  holdDiff = true;
  await expandChanges().click();
  await expect(second.getByText('Loading changes…', { exact: true })).toBeVisible();
  await expect.poll(() => !!releaseDiff).toBe(true);
  holdDiff = false;
  releaseDiff!();
  releaseDiff = undefined;
  await expect(second.getByText('Before: Old name', { exact: true })).toBeVisible();
  await expect(second.getByText('After: New name', { exact: true })).toBeVisible();
  await expect(second.getByText('Before: Before description', { exact: true })).toBeVisible();
  await expect(second.getByText('After: After description', { exact: true })).toBeVisible();
  await expect(second.getByText('Second leader', { exact: true })).toBeVisible();
  await expect(second.getByText('After: unknown-preview-leader', { exact: true })).toBeVisible();
  await expect(second.getByText('Before: Command Center', { exact: true })).toBeVisible();
  await expect(
    second.getByText('Before: Sabine Wren, Galvanized Revolutionary', { exact: true }),
  ).toBeVisible();
  await expect(second.getByText('Before: Premier', { exact: true })).toBeVisible();
  await expect(second.getByText('After: Eternal', { exact: true })).toBeVisible();
  await expect(second.getByText('Before: Old card note', { exact: true })).toBeVisible();
  await expect(second.getByText('After: New card note', { exact: true })).toBeVisible();
  await expect(second.getByText('+1 Battlefield Marine', { exact: true })).toBeVisible();
  // Remounting a stale diff exercises all response states, including cached-data errors.
  for (const mode of ['notes', 'metadata', 'empty', 'error'] as const) {
    await expandChanges().click();
    diffMode = mode;
    await expandChanges().click();
    if (mode === 'notes') {
      await expect(second.getByText('After: New card note', { exact: true })).toBeVisible();
      await expect(second.getByText('After: New name', { exact: true })).not.toBeVisible();
    } else if (mode === 'metadata') {
      await expect(second.getByText('After: New name', { exact: true })).toBeVisible();
      await expect(second.getByText('After: New card note', { exact: true })).not.toBeVisible();
    } else if (mode === 'empty') {
      await expect(second.getByText('No changes in this version.', { exact: true })).toBeVisible();
    } else {
      await expect(
        second.getByText('Could not load version changes.', { exact: true }),
      ).toBeVisible();
      await expect(
        second.getByText('No changes in this version.', { exact: true }),
      ).not.toBeVisible();
      diffMode = 'full';
      await second.getByRole('button', { name: 'Retry changes', exact: true }).click();
      await expect(second.getByText('After: New card note', { exact: true })).toBeVisible();
    }
  }
  await second.setViewportSize({ width: 390, height: 844 });
  await second.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(second.getByText('After: New card note', { exact: true })).toBeVisible();
  expect(
    await second.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(browserErrors).toEqual([]);
  console.log(
    'PASS: queued writes, stale saves, rollback; metadata/notes/empty/loading/error/retry diffs and narrow dark layout.',
  );
} finally {
  releaseWrite?.();
  releaseDiff?.();
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  server.stop(true);
}
