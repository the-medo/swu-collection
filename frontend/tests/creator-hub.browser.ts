// Opt-in acceptance test. Run from the repository root against a running isolated worktree:
// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-hub.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_HUB_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable this test explicitly against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 2 });
const suffix = randomUUID();
const userId = `creator-browser-${suffix}`,
  slug = `creator-${suffix}`,
  deckId = randomUUID(),
  token = randomUUID();
const title = 'Making every resource count';
const creatorName = 'The Resource Step';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitor = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(),
  publicPage = await visitor.newPage();
page.setDefaultTimeout(20_000);
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
for (const current of [page, publicPage]) {
  current.on('pageerror', error => errors.push(error.message));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
const screenshots = new URL('../../.swubase/creator-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const headers = { 'X-Requested-With': 'swubase' };
const api = `${origin}/api/creator-hub`;
async function setTheme(current: typeof page, theme: 'light' | 'dark') {
  if (await current.locator('html').evaluate((el, value) => el.classList.contains(value), theme))
    return;
  await current.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await expect(current.locator('html')).toHaveClass(new RegExp(theme));
}
async function saveDraft() {
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
}
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, ${creatorName}, ${userId + '@invalid.local'}, false, now(), now(), ${creatorName}, 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id)
    VALUES (${deckId}, ${userId}, 1, 'Creator browser Sabine deck', 1, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
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
  await page.goto(`${origin}/creator-studio`);
  await page.getByLabel('Creator or brand name').fill(creatorName);
  await page.getByLabel('Profile address').fill(slug);
  await page
    .getByLabel('Tagline')
    .fill('Practical Star Wars Unlimited guides, one decision at a time.');
  await page
    .getByLabel('Start here')
    .fill('Start with our resourcing guide, then explore the decks behind it.');
  await page.getByRole('button', { name: 'Add a link', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill('YouTube');
  await page.getByLabel('HTTPS URL').fill('https://www.youtube.com/');
  await page.getByLabel('Link type').selectOption('social');
  await page.getByRole('checkbox', { name: 'Deck guide', exact: true }).check();
  await page.getByRole('button', { name: 'Choose languages', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search languages' }).fill('French');
  await page.getByRole('button', { name: 'French', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your creations', exact: true })).toBeVisible();
  const creator = (await (await page.request.get(`${api}/mine`)).json()).data[0];
  await page.getByRole('button', { name: 'Connections & editors', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'YouTube connection', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toHaveCount(0);
  const connectionPanel = page.getByRole('region', { name: 'YouTube connection', exact: true });
  await expect(
    connectionPanel.getByText('Read-only YouTube access', { exact: true }),
  ).toBeVisible();
  await expect(
    connectionPanel.getByRole('link', { name: 'Privacy Policy', exact: true }),
  ).toHaveAttribute('href', '/privacy');
  await expect(
    connectionPanel.getByRole('link', { name: 'Terms of Service', exact: true }),
  ).toHaveAttribute('href', '/terms');

  // Provider-free UI checks: the actual OAuth callback and owner-only status API are covered by
  // creator-hub.db.test.ts. Never authorize a real account or consume a user's Google session here.
  const connectedId = 'UC' + 'n'.repeat(22),
    oldChannelId = 'UC' + 'o'.repeat(22);
  let mockChannels = [
    {
      channelId: oldChannelId,
      title: 'Earlier channel',
      avatarUrl: '',
      connectedAt: new Date().toISOString(),
      connected: true,
      disconnectedAt: null,
      disconnectReason: null,
      autoImportEnabled: true,
      lastManualFetchAt: null,
    },
    {
      channelId: connectedId,
      title: 'Freshly connected channel',
      avatarUrl: `${origin}/src/assets/logo-light-theme.svg`,
      connectedAt: new Date().toISOString(),
      connected: true,
      disconnectedAt: null,
      disconnectReason: null,
      autoImportEnabled: true,
      lastManualFetchAt: null,
    },
  ];
  let showMockChannels = false;
  let simulateRedirect = false;
  await page.route(`${api}/creators/${creator.id}/youtube`, async route => {
    if (route.request().method() === 'POST') {
      if (simulateRedirect) {
        // A same-document navigation preserves React state so we can exercise the BFCache
        // pageshow recovery without contacting Google or relying on Chromium's BFCache heuristics.
        await route.fulfill({
          json: { data: { url: page.url().split('#')[0] + '#consent-fixture' } },
        });
      } else {
        await route.fulfill({
          status: 503,
          json: { message: 'Connection temporarily unavailable. Try again.' },
        });
      }
    } else if (route.request().method() === 'DELETE') {
      const removed = route.request().postDataJSON().channelId;
      mockChannels = mockChannels.map(channel =>
        channel.channelId === removed ? { ...channel, connected: false } : channel,
      );
      await route.fulfill({ json: { data: true } });
    } else {
      await route.fulfill({
        json: { data: { configured: true, channels: showMockChannels ? mockChannels : [] } },
      });
    }
  });
  await connectionPanel
    .getByRole('button', { name: 'Connect a YouTube channel', exact: true })
    .click();
  await expect(
    connectionPanel.getByText('Connection temporarily unavailable. Try again.', { exact: true }),
  ).toBeVisible();
  await expect(
    connectionPanel.getByRole('button', { name: 'Connect a YouTube channel', exact: true }),
  ).toBeEnabled();

  simulateRedirect = true;
  await connectionPanel
    .getByRole('button', { name: 'Connect a YouTube channel', exact: true })
    .click();
  await expect(
    connectionPanel.getByRole('button', { name: 'Opening Google…', exact: true }),
  ).toBeDisabled();
  await expect(page).toHaveURL(/#consent-fixture$/);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect(
    connectionPanel.getByRole('button', { name: 'Connect a YouTube channel', exact: true }),
  ).toBeEnabled();

  showMockChannels = true;
  await page.goto(
    `${origin}/creator-studio?creatorId=${creator.id}&youtube=connected&youtubeChannelId=${connectedId}`,
  );
  await expect(connectionPanel).toBeVisible();
  await expect(
    connectionPanel.getByRole('status').filter({ hasText: 'YouTube connected' }),
  ).toContainText('Freshly connected channel');
  await expect(
    connectionPanel.getByRole('img', {
      name: 'Freshly connected channel channel avatar',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Import from channel')).toHaveValue(connectedId);
  await expect(
    connectionPanel.getByRole('button', { name: 'Connect another YouTube channel', exact: true }),
  ).toBeVisible();
  await setTheme(page, 'dark');
  await page.screenshot({
    path: `${screenshots}/studio-connections-dark.png`,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    connectionPanel.getByRole('status').filter({ hasText: 'YouTube connected' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `${screenshots}/studio-connected-mobile.png`,
    fullPage: true,
    animations: 'disabled',
  });
  page.once('dialog', dialog => dialog.accept());
  await connectionPanel
    .getByRole('button', { name: 'Disconnect Freshly connected channel', exact: true })
    .click();
  await expect(
    connectionPanel.getByRole('status').filter({ hasText: 'YouTube connected' }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Import from channel')).toHaveValue(oldChannelId);
  await expect(
    connectionPanel.getByRole('button', { name: 'Reconnect YouTube', exact: true }),
  ).toBeVisible();
  await expect(
    connectionPanel.getByText('Google access disconnected', { exact: true }),
  ).toBeVisible();
  await expect(
    connectionPanel.getByRole('switch', { name: 'Auto-import from Freshly connected channel' }),
  ).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `${screenshots}/studio-disconnected-mobile.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.goto(
    `${origin}/creator-studio?creatorId=${creator.id}&youtube=connected&youtubeChannelId=${connectedId}`,
  );
  await expect(
    connectionPanel.getByRole('button', { name: 'Disconnect Earlier channel', exact: true }),
  ).toBeVisible();
  await expect(
    connectionPanel.getByRole('status').filter({ hasText: 'YouTube connected' }),
  ).toHaveCount(0);
  await page.goto(`${origin}/creator-studio?creatorId=${creator.id}&youtube=failed`);
  await expect(
    page.getByRole('alert').filter({ hasText: 'YouTube could not be connected' }),
  ).toBeVisible();
  await expect(connectionPanel).toBeVisible();
  await page.unroute(`${api}/creators/${creator.id}/youtube`);
  await page.goto(`${origin}/creator-studio?creatorId=${creator.id}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Create something new', exact: true }).click();
  await page.getByRole('button', { name: 'Choose language', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search languages' }).fill('Japanese');
  await expect(page.getByRole('button', { name: 'Japanese', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByLabel('Summary', { exact: true })
    .fill('A practical guide to resourcing, sequencing and planning your next turn.');
  await page
    .locator('[contenteditable=true]')
    .first()
    .fill('Keep your plan flexible: resource for the next two turns, not just the current one.');
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/card-link', { delay: 20 });
  await page.getByRole('option', { name: /^Card link/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Search cards' })
    .fill('Battlefield Marine');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('checkbox', { name: 'Deck guide', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Premier', exact: true }).check();
  await page.getByLabel('Subject type').selectOption('deck');
  await page.getByLabel('Find a subject').fill('Creator browser Sabine');
  await page.getByRole('button', { name: 'Creator browser Sabine deck', exact: true }).click();
  await page.getByLabel('Series', { exact: true }).fill('Better decisions');
  await page.getByRole('checkbox', { name: 'Pin on creator profile' }).check();
  await page.getByRole('button', { name: 'Add chapter', exact: true }).click();
  await page.getByRole('textbox', { name: 'Chapter 1 title', exact: true }).fill('Build a plan');
  await saveDraft();
  const items = (await (await page.request.get(`${api}/creators/${creator.id}/studio`)).json()).data
    .items;
  const id = items[0].id;
  expect(items[0].document).not.toHaveProperty('body');
  // Autosave should refresh the studio, without reloading unrelated profiles or selectors.
  const autosaveReads: string[] = [];
  const recordRead = (request: import('playwright/test').Request) => {
    if (request.method() === 'GET' && request.url().includes('/api/creator-hub/'))
      autosaveReads.push(new URL(request.url()).pathname);
  };
  page.on('request', recordRead);
  await page.getByLabel('Summary', { exact: true }).fill('Autosaved guide to planning resources.');
  await expect(page.getByRole('status').filter({ hasText: 'Unsaved changes' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  page.off('request', recordRead);
  expect(autosaveReads).toContain(`/api/creator-hub/creators/${creator.id}/studio`);
  expect(
    autosaveReads.some(
      path => path.endsWith('/mine') || path.includes('/subjects') || path.endsWith('/tags'),
    ),
  ).toBe(false);
  expect(
    (await (await page.request.get(`${api}/creations/${id}/draft`)).json()).data.document.summary,
  ).toBe('Autosaved guide to planning resources.');

  expect((await publicPage.request.get(`${api}/creations/${id}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByText('Private preview', { exact: true })).toBeVisible();
  await expect(page.locator('.rte-card-link')).toContainText('Battlefield Marine');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await setTheme(page, 'light');
  await page.screenshot({
    path: `${screenshots}/article-editor-light.png`,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => {
      const main = document.querySelector('[data-creator-layout]')!;
      return (
        main.getBoundingClientRect().right <= innerWidth && main.scrollWidth <= main.clientWidth
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: `${screenshots}/article-editor-mobile-light.png`,
    animations: 'disabled',
  });
  await page
    .getByRole('textbox', { name: 'Chapter 1 title', exact: true })
    .scrollIntoViewIfNeeded();
  const chapterRow = page
    .getByRole('spinbutton', { name: 'Chapter 1 start seconds' })
    .locator('../..');
  expect(await chapterRow.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({
    path: `${screenshots}/chapters-mobile-light.png`,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish update', exact: true })).toBeVisible();
  await publicPage.goto(`${origin}/content/${id}`);
  await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(publicPage.getByRole('main')).toHaveCount(1);
  await expect(publicPage.locator('.rte-card-link')).toContainText('Battlefield Marine');
  await expect(
    publicPage.getByRole('link', { name: 'Creator browser Sabine deck', exact: true }),
  ).toBeVisible();
  // Discovery has grouped format shortcuts, scoped flags, and only the three subject pickers.
  await publicPage.goto(`${origin}/content?creatorId=${creator.id}`);
  await expect(publicPage.getByRole('button', { name: 'English', exact: true })).toBeVisible();
  await expect(publicPage.getByRole('button', { name: 'French', exact: true })).toHaveCount(0);
  let releaseLanguageRequest!: () => void;
  const languageRequest = new Promise<void>(resolve => {
    releaseLanguageRequest = resolve;
  });
  await publicPage.route(
    /\/api\/creator-hub\/creations\?.*language=en/,
    async route => {
      await languageRequest;
      await route.continue();
    },
    { times: 1 },
  );
  try {
    await publicPage.getByRole('button', { name: 'English', exact: true }).click();
    await expect(publicPage.getByRole('button', { name: 'English', exact: true })).toBeVisible();
    await expect(publicPage.getByRole('button', { name: 'English', exact: true })).toBeFocused();
  } finally {
    releaseLanguageRequest();
  }
  await publicPage.getByRole('button', { name: 'All languages', exact: true }).click();

  await expect(publicPage.getByLabel('Subject type').locator('option')).toHaveText([
    'Set',
    'Tournament',
    'Leader',
  ]);
  const sets = publicPage.locator('details').filter({ has: publicPage.getByLabel('Subject type') });
  await expect(sets.getByRole('button').first()).toContainText('Homeworlds');
  await expect(sets.locator('img').first()).toHaveAttribute('src', /logos\/hmw\.png$/);
  await publicPage.getByRole('checkbox', { name: 'Twin Suns', exact: true }).check();
  await publicPage.getByRole('checkbox', { name: 'Constructed', exact: true }).check();
  await expect(publicPage.getByRole('checkbox', { name: 'Premier', exact: true })).toBeChecked();
  await expect(publicPage.getByRole('checkbox', { name: 'Eternal', exact: true })).toBeChecked();
  await publicPage.getByRole('checkbox', { name: 'Constructed', exact: true }).uncheck();
  await expect(publicPage.getByRole('checkbox', { name: 'Twin Suns', exact: true })).toBeChecked();
  await expect(
    publicPage.getByRole('checkbox', { name: 'Eternal', exact: true }),
  ).not.toBeChecked();
  await publicPage.getByRole('checkbox', { name: 'Limited', exact: true }).check();
  await expect(publicPage.getByRole('checkbox', { name: 'Draft', exact: true })).toBeChecked();
  await expect(publicPage.getByRole('checkbox', { name: 'Sealed', exact: true })).toBeChecked();
  await publicPage.getByRole('checkbox', { name: 'Draft', exact: true }).uncheck();
  expect(
    await publicPage
      .getByRole('checkbox', { name: 'Limited', exact: true })
      .evaluate((el: HTMLInputElement) => el.indeterminate),
  ).toBe(true);
  await publicPage.getByLabel('Subject type').selectOption('leader');
  await publicPage.getByRole('button', { name: 'Choose leader', exact: true }).click();
  await expect(
    publicPage.getByRole('heading', { name: 'Select a leader', exact: true }),
  ).toBeVisible();
  await publicPage.keyboard.press('Escape');
  await publicPage.getByRole('button', { name: 'Clear', exact: true }).click();
  await publicPage.goto(`${origin}/creators`);
  await publicPage.getByRole('textbox', { name: 'Find a creator' }).fill(creatorName);
  await publicPage.getByText('Languages and specialties', { exact: true }).click();
  await expect(publicPage.getByRole('button', { name: 'English', exact: true })).toBeVisible();
  await expect(publicPage.getByRole('button', { name: 'French', exact: true })).toBeVisible();
  await expect(publicPage.getByRole('button', { name: 'Japanese', exact: true })).toHaveCount(0);
  await publicPage.getByRole('button', { name: 'French', exact: true }).click();
  await expect(publicPage.getByRole('link').filter({ hasText: creatorName })).toBeVisible();
  // Draft changes stay private, and stale writes can be recovered explicitly.
  await page.getByLabel('Summary', { exact: true }).fill('This is still a private draft.');
  await saveDraft();
  const publicCopy = (await (await publicPage.request.get(`${api}/creations/${id}`)).json()).data;
  expect(publicCopy.document.summary).not.toContain('private draft');
  const current = (await (await page.request.get(`${api}/creations/${id}/draft`)).json()).data;
  expect(
    (
      await page.request.put(`${api}/creations/${id}`, {
        headers,
        data: {
          creatorId: creator.id,
          revision: current.revision,
          document: { ...current.document, summary: 'Other editor revision' },
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel('Summary', { exact: true }).fill('Our guide to planning two turns ahead.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Save my version instead', exact: true }),
  ).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Save my version instead', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish update', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await publicPage.request.get(`${api}/creations/${id}`)).json()).data.document
          .summary,
    )
    .toBe('Our guide to planning two turns ahead.');
  await publicPage.goto(
    `${origin}/content?creatorId=${creator.id}&tags=purpose:deck-guide,format:constructed`,
  );
  await expect(publicPage.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  await setTheme(publicPage, 'light');
  await publicPage.screenshot({
    path: `${screenshots}/discovery-light.png`,
    animations: 'disabled',
  });
  await publicPage.getByRole('textbox', { name: 'Search content' }).fill('no match');
  await publicPage.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    publicPage.getByRole('heading', { name: 'Room for a new perspective' }),
  ).toBeVisible();
  await publicPage.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(publicPage.getByRole('textbox', { name: 'Search content' })).toHaveValue('');
  // Filters stay available to keyboard users without pushing mobile results below the fold.
  await publicPage.setViewportSize({ width: 390, height: 844 });
  const filterToggle = publicPage.getByRole('button', { name: 'Show filters', exact: true });
  await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(publicPage.getByRole('checkbox', { name: 'Deck guide', exact: true })).toBeHidden();
  await filterToggle.focus();
  await publicPage.keyboard.press('Enter');
  await expect(
    publicPage.getByRole('button', { name: 'Hide filters', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await publicPage.getByRole('checkbox', { name: 'Deck guide', exact: true }).check();
  await expect(publicPage).toHaveURL(/tags=purpose%3Adeck-guide/);
  await publicPage.getByRole('button', { name: 'Hide filters', exact: true }).click();
  await expect(publicPage.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  await publicPage.screenshot({
    path: `${screenshots}/discovery-mobile-light.png`,
    animations: 'disabled',
  });
  await publicPage.setViewportSize({ width: 1440, height: 1000 });
  await expect(publicPage.getByRole('checkbox', { name: 'Deck guide', exact: true })).toBeChecked();
  await expect(publicPage.getByRole('checkbox', { name: 'Deck guide', exact: true })).toBeVisible();
  await publicPage.goto(`${origin}/creators/${slug}`);
  await expect(publicPage.getByRole('heading', { name: creatorName, exact: true })).toBeVisible();
  await publicPage.getByRole('tab', { name: 'Series', exact: true }).click();
  await publicPage.getByLabel('Series', { exact: true }).selectOption('Better decisions');
  await expect(publicPage.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  await publicPage.screenshot({
    path: `${screenshots}/creator-profile-light.png`,
    animations: 'disabled',
  });
  await setTheme(publicPage, 'dark');
  await publicPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await publicPage.evaluate(() => {
      const main = document.querySelector('[data-creator-layout]')!;
      return (
        main.getBoundingClientRect().right <= innerWidth && main.scrollWidth <= main.clientWidth
      );
    }),
  ).toBe(true);
  await publicPage.screenshot({
    path: `${screenshots}/creator-profile-mobile-dark.png`,
    animations: 'disabled',
  });
  await publicPage.goto(`${origin}/decks/${deckId}`);
  await expect(
    publicPage.getByRole('heading', { name: 'From the community', exact: true }),
  ).toBeVisible();
  await expect(publicPage.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  // Revoking publication removes anonymous reads and all discovery associations.
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect
    .poll(async () => (await publicPage.request.get(`${api}/creations/${id}`)).status())
    .toBe(404);
  expect(
    (
      await (
        await publicPage.request.get(`${api}/creations?entityType=deck&entityId=${deckId}`)
      ).json()
    ).data.items,
  ).toEqual([]);
  await publicPage.goto(`${origin}/content?language=bad_locale&after=not-a-date&page=invalid`);
  await expect(
    publicPage.getByRole('heading', { name: 'Your next great game starts here.' }),
  ).toBeVisible();
  // A query refresh must not silently advance the revision of an open profile editor.
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Tagline', { exact: true }).fill('Unsaved profile edit');
  const currentProfile = (await (await page.request.get(`${api}/creators/${slug}`)).json()).data;
  expect(
    (
      await page.request.put(`${api}/creators/${creator.id}`, {
        headers,
        data: {
          profile: { ...currentProfile, tagline: 'The other tab changed this' },
          revision: currentProfile.revision,
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load saved profile', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Load saved profile', exact: true }).click();
  await expect(page.getByLabel('Tagline', { exact: true })).toHaveValue(
    'The other tab changed this',
  );
  await page.getByLabel('Tagline', { exact: true }).fill('A recovered profile update');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your creations', exact: true })).toBeVisible();
  expect(
    (
      await page.request.post(`${origin}/api/auth/sign-out`, {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(200);
  expect((await page.request.get(`${api}/mine`)).status()).toBe(401);
  await page.goto(`${origin}/creator-studio`);
  await expect(
    page.getByText('You must be logged in to view this page.', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Creator profile, rich authoring, autosave, privacy, conflict recovery, publishing, discovery, series, related decks and responsive checks passed.',
  );
} catch (error) {
  await page.screenshot({
    path: `${screenshots}/failure-editor.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await publicPage.screenshot({
    path: `${screenshots}/failure-public.png`,
    fullPage: true,
    animations: 'disabled',
  });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM deck_information WHERE deck_id = ${deckId}`;
  await sql`DELETE FROM deck WHERE id = ${deckId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
