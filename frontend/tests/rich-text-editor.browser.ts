// Opt-in acceptance test against a running, isolated worktree. Fixtures are removed in finally.
// From the repository root:
// RICH_TEXT_EDITOR_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/rich-text-editor.browser.ts
import {
  emptyPostDocument,
  postDocumentSchemas,
  type PostDocument,
} from '../../shared/posts/content.ts';
import { exerciseWidgets, exerciseFormatting } from './rich-text-editor-widgets.ts';
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const expect = baseExpect.configure({ timeout: 20_000 });
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.RICH_TEXT_EDITOR_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable this test against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 2 });
const userId = `editor-browser-${randomUUID()}`;
const token = randomUUID();
const publicDeck = randomUUID();
const privateDeck = randomUUID();
const unlistedDeck = randomUUID();
const ids = [publicDeck, privateDeck, unlistedDeck];
const tournamentIds = [randomUUID(), randomUUID()];
const groupId = randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/editor-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const insertionCommands = [
  ['card-image', 'Card image'],
  ['card-link', 'Card link'],
  ['decklist', 'Decklist'],
  ['meta-analysis', 'Meta analysis'],
  ['matchup', 'Matchup'],
  ['card-group', 'Card group'],
  ['callout', 'Strategy callout'],
  ['mention', 'Mention a user'],
] as const;

async function endOfDocument() {
  await page.locator('[contenteditable=true]').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
}
async function slash(command: string) {
  await endOfDocument();
  await page.keyboard.type(`/${command}`, { delay: 20 });
  const label = insertionCommands.find(([id]) => id === command)?.[1];
  if (!label) throw new Error(`Unknown insertion command: ${command}`);
  await expect(page.getByRole('option', { name: new RegExp(`^${label}`) })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function chooseCard() {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await expect(dialog.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
}
async function loadLinkedDeck(id: string) {
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'SWUBASE deck link or ID' })
    .fill(`${origin}/decks/${id}`);
  await dialog.getByRole('button', { name: 'Find deck', exact: true }).click();
}
async function setTheme(theme: 'light' | 'dark') {
  if (
    await page
      .locator('html')
      .evaluate((element, theme) => element.classList.contains(theme), theme)
  )
    return;
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await expect(page.locator('html')).toHaveClass(new RegExp(theme));
}

try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, 'Editor fixture', ${userId + '@invalid.local'}, false, now(), now(), 'Editor fixture', 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  for (const [index, id] of ids.entries()) {
    await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
      VALUES (${id}, ${index === 1 ? 'swubase' : userId}, 1, ${'Editor fixture ' + ['public', 'private', 'unlisted'][index]}, ${[1, 0, 2][index]!}, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES
      (${id}, 'battlefield-marine', 1, 3), (${id}, 'overwhelming-barrage', 2, 2), (${id}, 'resupply', 3, 1)`;
  }
  for (const id of tournamentIds) {
    await sql`INSERT INTO tournament (id, user_id, type, location, continent, name, attendance, format, days, day_two_player_count, date, imported)
      VALUES (${id}, ${userId}, 'pq', 'Editor test', 'Europe', 'Editor fixture tournament', 16, 1, 2, 1, CURRENT_DATE, true)`;
    await sql`INSERT INTO tournament_deck (tournament_id, deck_id, placement, top_relative_to_player_count, record_win, record_lose, record_draw, points)
      VALUES (${id}, ${publicDeck}, 1, true, 5, 1, 0, 15)`;
  }
  await sql`INSERT INTO tournament_deck (tournament_id, deck_id, placement, top_relative_to_player_count, record_win, record_lose, record_draw, points)
    VALUES (${tournamentIds[0]!}, ${unlistedDeck}, 9, false, 2, 4, 0, 6)`;
  await sql`INSERT INTO tournament_group (id, name) VALUES (${groupId}, 'Editor fixture group')`;
  for (const id of tournamentIds)
    await sql`INSERT INTO tournament_group_tournament (group_id, tournament_id) VALUES (${groupId}, ${id})`;
  const profiles = await page.request.get(`${origin}/api/user/search?q=Editor%20fixture`);
  expect(profiles.status()).toBe(200);
  expect((await profiles.json()).data).toContainEqual({
    id: userId,
    displayName: 'Editor fixture',
  });
  expect(
    (await profiles.json()).data.every(
      (u: object) => Object.keys(u).sort().join(',') === 'displayName,id',
    ),
  ).toBe(true);
  expect((await page.request.get(`${origin}/api/user/search?q=x`)).status()).toBe(400);
  expect((await page.request.get(`${origin}/api/user/search?q=${'x'.repeat(81)}`)).status()).toBe(
    400,
  );
  // Authenticate the profile owner; the private fixture belongs to a different user.
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
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
  const profileUrl = `${origin}/users/${userId}`;
  const postUrl = `${origin}/api/posts/profile/${userId}`;
  const visitor = await browser.newContext();
  const anonymous = await visitor.newPage();
  anonymous.on('pageerror', error => errors.push(error.message));
  const empty = emptyPostDocument();
  expect(
    (await anonymous.request.put(postUrl, { data: { content: empty, revision: null } })).status(),
  ).toBe(401);
  expect(
    (
      await page.request.put(`${origin}/api/posts/profile/swubase`, {
        data: { content: empty, revision: null },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get(`${origin}/api/posts/profile/missing-${userId}`)).status()).toBe(
    404,
  );
  const malformed = structuredClone(empty);
  malformed.blocks[0]!.type = 'unknown' as never;
  expect(
    (await page.request.put(postUrl, { data: { content: malformed, revision: null } })).status(),
  ).toBe(400);
  expect(
    (
      await page.request.put(postUrl, { data: { content: 'x'.repeat(270000), revision: null } })
    ).status(),
  ).toBe(413);
  const richFixtureHtml = `<!doctype html><html><head></head><body><div id="root"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/tests/rich-text-editor.harness.tsx"></script>
  </body></html>`;
  await page.route(`${profileUrl}**`, route =>
    route.fulfill({ contentType: 'text/html', body: richFixtureHtml }),
  );
  await anonymous.route(`${profileUrl}**`, route =>
    route.fulfill({ contentType: 'text/html', body: richFixtureHtml }),
  );
  let richDocument: PostDocument;
  {
    await page.goto(profileUrl);
    await expect(page.locator('[contenteditable=true]').first()).toBeVisible();
    const surface = page.locator('.rte-surface');
    await expect(page.getByRole('group', { name: 'Insert SWUBASE content' })).toHaveCount(0);
    await exerciseFormatting(page);
    await slash('card-image');
    await page.getByLabel('Card size', { exact: true }).selectOption('small');
    await chooseCard();
    await surface.getByRole('button', { name: 'Edit card-image' }).click();
    await page.getByLabel('Card size', { exact: true }).selectOption('large');
    await page.getByRole('button', { name: 'Save widget', exact: true }).click();
    await expect(surface.locator('.rte-card-artwork img')).toHaveCSS('height', '400px');
    await slash('card-link');
    await chooseCard();
    await page.keyboard.type(' continues here');
    await slash('decklist');
    await loadLinkedDeck(privateDeck);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('unavailable');
    await expect(page.getByRole('button', { name: 'Insert decklist', exact: true })).toBeDisabled();
    await loadLinkedDeck(unlistedDeck);
    await expect(page.getByRole('button', { name: 'Insert decklist', exact: true })).toBeEnabled();
    await loadLinkedDeck(publicDeck);
    await page.getByRole('button', { name: 'Insert decklist', exact: true }).click();
    await expect(surface.locator('.rte-decklist')).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(surface.locator('.rte-decklist')).toHaveCount(0);
    await page.keyboard.press('Control+Shift+z');
    await expect(surface.locator('.rte-decklist')).toHaveCount(1);
    await exerciseWidgets(page, {
      userId,
      tournamentId: tournamentIds[0]!,
      groupId,
      slash,
      endOfDocument,
    });
    const content = await page.evaluate(
      () => (window as unknown as { editorFixtureDocument: PostDocument }).editorFixtureDocument,
    );
    richDocument = content;
    expect(postDocumentSchemas.rich.safeParse(content).success).toBe(true);
    expect((await page.request.put(postUrl, { data: { content, revision: null } })).status()).toBe(
      400,
    );
    const post = { content };
    await page.getByRole('button', { name: 'Preview post', exact: true }).click();
    await page.addInitScript(content => {
      (
        window as unknown as { editorFixtureInitialContent: PostDocument }
      ).editorFixtureInitialContent = content;
    }, content);
    await anonymous.addInitScript(content => {
      (
        window as unknown as { editorFixtureInitialContent: PostDocument }
      ).editorFixtureInitialContent = content;
    }, content);
    const json = JSON.stringify(post.content);
    for (const value of [
      userId,
      publicDeck,
      tournamentIds[0]!,
      groupId,
      'leadersAndBase',
      'top8',
      'Updated strategy',
      'Trade efficiently',
    ])
      expect(json).toContain(value);
    expect(json).not.toContain('Editor fixture public'); // Decks store a reference, not a snapshot.
    await expect(page.locator('[contenteditable=true]')).toHaveCount(0);
    await page.reload();
    const bio = page.getByRole('region', { name: 'Post preview' });
    await expect(bio).toContainText('Heading probe');
    await expect(bio).toContainText('Updated strategy');
    await expect(bio.getByRole('button', { name: 'Edit card-image' })).toHaveCount(0);
    await anonymous.goto(profileUrl);
    const publicBio = anonymous.getByRole('region', { name: 'Post preview' });
    await expect(publicBio).toContainText('Updated strategy');
    await expect(
      publicBio.getByRole('button', { name: /Edit bio|Add bio|Edit matchup|Save/ }),
    ).toHaveCount(0);
    await expect(anonymous.locator('[contenteditable=true]')).toHaveCount(0);
    const embedded = publicBio.locator('.rte-decklist');
    for (const name of ['Copy link', 'Duplicate', 'Image', 'Export'])
      await expect(embedded.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(embedded).toContainText(/3\s*maindeck/);
    const cardLink = publicBio.locator('.rte-card-link').last();
    await cardLink.hover();
    await expect(
      anonymous.locator('[data-radix-popper-content-wrapper] img').first(),
    ).toBeVisible();
    await cardLink.click();
    await expect(anonymous.getByRole('dialog')).toBeVisible();
    await anonymous.keyboard.press('Escape');
    const chart = publicBio.locator(`[data-meta-id="${tournamentIds[0]}"]`);
    await chart.getByRole('radio', { name: 'All Decks', exact: true }).click();
    await expect(chart).toContainText('Total decks analyzed: 2');
    expect(
      await anonymous.evaluate(
        () => (window as unknown as { editorFixtureDocument: PostDocument }).editorFixtureDocument,
      ),
    ).toEqual(post.content);
    // Current deck contents resolve when the saved bio opens again.
    await sql`UPDATE deck_card SET quantity = 4 WHERE deck_id = ${publicDeck} AND board = 1`;
    await anonymous.reload();
    await expect(embedded).toContainText(/4\s*maindeck/);
    await sql`UPDATE deck SET public = 0 WHERE id = ${publicDeck}`;
    await anonymous.reload();
    await expect(embedded.getByRole('alert')).toContainText('unavailable');
    await expect(embedded).not.toContainText('Battlefield Marine');
    await sql`UPDATE deck SET public = 1 WHERE id = ${publicDeck}`;
    await anonymous.reload();
    await expect(embedded).toContainText(/4\s*maindeck/);
    await setTheme('light');
    await bio
      .getByRole('heading', { name: 'Rich editor fixture', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshots}/profile-bio-light.png`, animations: 'disabled' });
    for (const kind of ['meta-analysis', 'matchup', 'card-group']) {
      await bio.locator(`[data-widget-kind=${kind}]`).first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${screenshots}/profile-${kind}-light.png`,
        animations: 'disabled',
      });
    }
    await setTheme('dark');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await bio.locator('[data-widget-kind=matchup]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${screenshots}/profile-bio-mobile.png`,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.unroute(`${profileUrl}**`);
  await anonymous.unroute(`${profileUrl}**`);
  // Profile bios use the simple editor, including paste and the API boundary.
  await page.goto(profileUrl);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'My profile', exact: true }).click();
  await expect(page).toHaveURL(profileUrl);
  await page.getByRole('button', { name: 'Add bio', exact: true }).click();
  const surface = page.locator('.rte-surface');
  await expect(page.locator('[data-editor-type=simple]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Insert SWUBASE content' })).toHaveCount(0);
  await exerciseFormatting(page);
  await endOfDocument();
  await page.keyboard.type('/h2');
  await page.getByRole('option', { name: /^Heading 2/ }).click();
  await page.keyboard.type('Slash heading probe');
  await expect(surface.locator('h2')).toContainText('Slash heading probe');
  for (const [command] of insertionCommands) {
    await endOfDocument();
    await page.keyboard.type(`/${command}`);
    await expect(
      page.getByRole('option', {
        name: /Card image|Card link|Decklist|Meta analysis|Matchup|Card group|Strategy callout|Mention a user/i,
      }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await endOfDocument();
  await page.keyboard.press('@');
  await page.keyboard.type('literal');
  await page.keyboard.insertText(' @mobile-literal');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(surface).toContainText('@literal @mobile-literal');
  await endOfDocument();
  await page
    .locator('[contenteditable=true]')
    .first()
    .evaluate(element => {
      const clipboardData = new DataTransfer();
      clipboardData.setData(
        'blocknote/html',
        `<div data-node-type="blockContainer"><div data-content-type="swuBlock" data-data='{"kind":"decklist","deck":{"deckId":"00000000-0000-4000-8000-000000000001"}}'>Pasted deck reference</div></div>`,
      );
      clipboardData.setData(
        'text/html',
        '<p><a href="/decks/00000000-0000-4000-8000-000000000001">Pasted deck reference</a></p>',
      );
      element.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
      );
    });
  await expect(
    surface.locator('[data-content-type=swuBlock], [data-inline-content-type=swuInline]'),
  ).toHaveCount(0);
  await expect(surface).toContainText('Pasted deck reference');
  const saveResponse = page.waitForResponse(
    response => response.url() === postUrl && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  const saved = await saveResponse;
  expect(saved.status()).toBe(200);
  const post = (await saved.json()).data;
  expect(post.type).toBe('profile-description');
  expect(postDocumentSchemas.simple.safeParse(post.content).success).toBe(true);
  await expect(page.getByRole('button', { name: 'Edit bio', exact: true })).toBeVisible();
  await page.reload();
  const bio = page.getByRole('region', { name: 'Profile bio' });
  await expect(bio).toContainText('Heading probe');
  await expect(bio).toContainText('@literal @mobile-literal');
  await anonymous.goto(profileUrl);
  const publicBio = anonymous.getByRole('region', { name: 'Profile bio' });
  await expect(publicBio).toContainText('Heading probe');
  await expect(publicBio.getByRole('button', { name: /Edit bio|Add bio/ })).toHaveCount(0);
  await expect(anonymous.locator('[contenteditable=true]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Cancel preserves the published bio; unsaved drafts block navigation.
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await endOfDocument();
  await page.keyboard.type('Unsaved draft');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(profileUrl);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(bio).not.toContainText('Unsaved draft');
  // Concurrent saves cannot overwrite the winning revision.
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      page.request.put(postUrl, { data: { content: post.content, revision: post.revision } }),
    ),
  );
  expect(concurrent.map(r => r.status()).sort()).toEqual([200, 409]);
  expect(
    (await page.request.put(postUrl, { data: { content: empty, revision: null } })).status(),
  ).toBe(409);
  await page.reload();
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await endOfDocument();
  await page.keyboard.type('Recovered draft');
  let latest = (await (await page.request.get(postUrl)).json()).data;
  expect(
    (
      await page.request.put(postUrl, {
        data: { content: latest.content, revision: latest.revision },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(bio.getByRole('alert').filter({ hasText: 'Your bio changed' })).toContainText(
    'Your draft is still here',
  );
  await expect(surface).toContainText('Recovered draft');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Save my version instead', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit bio', exact: true })).toBeVisible();
  await expect(bio).toContainText('Recovered draft');
  // Reloading the server version is also explicit and leaves the editor ready for another save.
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await endOfDocument();
  await page.keyboard.type('Discard this draft');
  latest = (await (await page.request.get(postUrl)).json()).data;
  const otherTabContent = emptyPostDocument();
  otherTabContent.blocks[0]!.content = [{ type: 'text', text: 'Other tab bio', styles: {} }];
  expect(
    (
      await page.request.put(postUrl, {
        data: { content: otherTabContent, revision: latest.revision },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(bio.getByRole('alert').filter({ hasText: 'Your bio changed' })).toContainText(
    'Your draft is still here',
  );
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Load saved bio', exact: true }).click();
  await expect(surface).toContainText('Other tab bio');
  await expect(surface).not.toContainText('Discard this draft');
  await expect(bio.getByRole('alert')).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear bio', exact: true }).click();
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add bio', exact: true })).toBeVisible();
  await anonymous.reload();
  await expect(publicBio).toHaveCount(0);
  // Bios authored before editor modes remain readable/editable without running widgets.
  await sql`UPDATE post SET content = ${sql.json(richDocument!)}, revision = revision + 1 WHERE author_id = ${userId} AND type = 'profile-description'`;
  await page.reload();
  await expect(bio).toContainText('Updated strategy');
  await expect(bio.locator('.rte-decklist, [data-widget-kind], .rte-mention')).toHaveCount(0);
  await expect(bio.locator(`a[href="/decks/${publicDeck}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await expect(bio).toContainText('Existing widgets will be saved as ordinary text and links.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await (await page.request.get(postUrl)).json()).data.content).toEqual(richDocument!);
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  const legacyRevision = (await (await page.request.get(postUrl)).json()).data.revision;
  expect(
    (
      await page.request.put(postUrl, { data: { content: empty, revision: legacyRevision } })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(bio.getByRole('alert')).toContainText('Your bio changed');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Load saved bio', exact: true }).click();
  await expect(
    bio.getByText('Existing widgets will be saved as ordinary text and links.'),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save bio', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await sql`UPDATE post SET content = ${sql.json(richDocument!)}, revision = revision + 1 WHERE author_id = ${userId} AND type = 'profile-description'`;
  await page.reload();
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await page.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit bio', exact: true })).toBeVisible();
  const converted = (await (await page.request.get(postUrl)).json()).data.content;
  expect(postDocumentSchemas.simple.safeParse(converted).success).toBe(true);
  expect(JSON.stringify(converted)).toContain('Updated strategy');
  const beforeSanitization = await sql`SELECT count(*)::int AS count FROM post`;
  const rollback = new Error('Rollback post schema fixtures');
  try {
    await sql.begin(async tx => {
      await tx`INSERT INTO post (author_id, type, content) VALUES
        (${userId}, 'tournament-report', ${tx.json(empty)}),
        (${userId}, 'tournament-report', ${tx.json(empty)})`;
      const reports =
        await tx`SELECT count(*)::int AS count FROM post WHERE author_id = ${userId} AND type = 'tournament-report'`;
      expect(reports[0]!.count).toBe(2);
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const clearPosts = sanitizer.match(/^TRUNCATE TABLE post;$/m)?.[0];
      const assertion = sanitizer.match(
        / {2}IF EXISTS \(SELECT 1 FROM post\) THEN[\s\S]*?END IF;/,
      )?.[0];
      expect(clearPosts).toBeDefined();
      expect(assertion).toBeDefined();
      await tx.unsafe(clearPosts!);
      await tx.unsafe(`DO $$ BEGIN ${assertion} END $$;`);
      expect((await tx`SELECT count(*)::int AS count FROM post`)[0]!.count).toBe(0);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  expect((await sql`SELECT count(*)::int AS count FROM post`)[0]!.count).toBe(
    beforeSanitization[0]!.count,
  );
  await visitor.close();
  expect(errors).toEqual([]);
  console.log(
    'Profile save/reload, public rendering, permissions, conflict prevention, cancel, clear, widgets, and mobile checks passed',
  );
} catch (error) {
  await page.screenshot({
    path: `${screenshots}/failure.png`,
    fullPage: true,
    animations: 'disabled',
  });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM tournament_group_tournament WHERE group_id = ${groupId}`;
  await sql`DELETE FROM tournament_group WHERE id = ${groupId}`;
  await sql`DELETE FROM tournament_deck WHERE tournament_id IN ${sql(tournamentIds)}`;
  await sql`DELETE FROM tournament WHERE id IN ${sql(tournamentIds)}`;
  const fixtureDecks =
    await sql`SELECT id FROM deck WHERE user_id = ${userId} OR id = ${privateDeck}`;
  const cleanupIds = fixtureDecks.map(row => row.id);
  if (cleanupIds.length) {
    await sql`DELETE FROM deck_card WHERE deck_id IN ${sql(cleanupIds)}`;
    await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(cleanupIds)}`;
    await sql`DELETE FROM deck WHERE id IN ${sql(cleanupIds)}`;
  }
  await sql`DELETE FROM session WHERE user_id = ${userId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
