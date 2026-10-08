// BATTLEFIELD_SHOWCASE_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield-showcase.browser.ts
import { chromium, expect as baseExpect, type BrowserContext } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import {
  defaultBattlefieldScene,
  type BattlefieldEditorData,
  type BattlefieldFaction,
  type BattlefieldPreset,
  type BattlefieldScene,
} from '../../shared/types/battlefield.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.BATTLEFIELD_SHOWCASE_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Explicitly select an isolated worktree database and development origin.');
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 1, onnotice: () => {} });
const browser = await chromium.launch();
const admin = await browser.newContext({
  viewport: { width: 2200, height: 1100 },
  reducedMotion: 'reduce',
  locale: 'en-US',
});
const member = await browser.newContext({
  viewport: { width: 1900, height: 1100 },
  reducedMotion: 'reduce',
  locale: 'en-US',
});
const anonymous = await browser.newContext({
  viewport: { width: 1900, height: 1100 },
  reducedMotion: 'reduce',
});
const adminPage = await admin.newPage(),
  page = await member.newPage(),
  publicPage = await anonymous.newPage();
const userIds: string[] = [],
  presetIds: string[] = [],
  errors: string[] = [];
const prefix = 'Showcase browser ' + crypto.randomUUID().slice(0, 8);
const headers = { 'X-Requested-With': 'swubase' };
let release: (() => void) | undefined;
for (const browserPage of [adminPage, page, publicPage]) {
  browserPage.on('pageerror', error => errors.push(error.message));
  await browserPage.addLocatorHandler(
    browserPage.getByRole('button', { name: 'Dismiss', exact: true }),
    () => browserPage.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
async function account(context: BrowserContext, role: 'user' | 'admin') {
  const id = 'battlefield-showcase-browser-' + crypto.randomUUID(),
    token = crypto.randomUUID();
  userIds.push(id);
  await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${id},${prefix},${id},${id + '@invalid.local'},false,'USD',${role},now(),now())`;
  await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${id},now()+interval '1 hour',now(),now())`;
  await sql`INSERT INTO user_profile(user_id,battlefield_limit) VALUES(${id},3)`;
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${id},1000,'battlefield-showcase-test',${crypto.randomUUID()})`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0];
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
}
const scene = (itemId?: string, scale = 1): BattlefieldScene => {
  const value = defaultBattlefieldScene();
  value.light = { x: 200, y: 60 };
  if (itemId)
    value.placements.push({
      ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
      itemId,
      x: 800,
      y: 200,
      scale,
      textureId: itemId === 'planet' ? 'rocky' : undefined,
    });
  return value;
};
async function createPreset(
  name: string,
  layout: BattlefieldScene,
  factions: BattlefieldFaction[],
): Promise<BattlefieldPreset> {
  const response = await admin.request.post(origin + '/api/battlefield-presets', {
    headers,
    data: { name: prefix + ' ' + name, scene: layout, factions },
  });
  expect(response.status()).toBe(201);
  const result = (await response.json()).data;
  presetIds.push(result.id);
  return result;
}
async function getPreset(id: string): Promise<BattlefieldPreset> {
  const response = await anonymous.request.get(origin + '/api/battlefield-presets/' + id);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function editor(context = member): Promise<BattlefieldEditorData> {
  const response = await context.request.get(origin + '/api/battlefields');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function remoteEdit(preset: BattlefieldPreset, name: string) {
  const response = await admin.request.patch(origin + '/api/battlefield-presets/' + preset.id, {
    headers,
    data: { name, scene: preset.scene, factions: ['imperial'], revision: preset.revision },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data as BattlefieldPreset;
}
const showcaseUrl = (search = prefix) =>
  origin + '/battlefield-showcase?' + new URLSearchParams({ battlefieldSearch: search });
const presetEditUrl = (id: string) =>
  origin +
  '/battlefield?' +
  new URLSearchParams({ battlefieldPreset: id, battlefieldPresetMode: 'edit' });
try {
  await account(admin, 'admin');
  await account(member, 'user');
  const free = await createPreset('Free', scene(), ['rebel']),
    fighter = await createPreset('Fighter', scene('ship-x-wing'), ['rebel', 'imperial']),
    planet = await createPreset('Planet', scene('planet'), ['republic']),
    large = await createPreset('Large planet', scene('planet', 2), ['republic']),
    expensive = await createPreset('Death Star', scene('station-death-star'), ['imperial']),
    empty = await createPreset('Empty', scene(), ['imperial']);
  const copyResponse = await member.request.post(origin + '/api/battlefields/from-draft', {
    headers,
    data: { name: 'Independent saved copy', scene: planet.scene },
  });
  expect(copyResponse.status()).toBe(201);
  const personalBefore = await editor();

  // Filters cover the entire matching set before pagination, with persisted URL state.
  await page.goto(showcaseUrl());
  await expect(page.getByRole('status').filter({ hasText: '6 presets' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', empty.name);
  await expect(page.getByLabel('Destination for', { exact: false })).toHaveCount(0);
  // Pausing after a space must not collapse two words when the debounce updates the URL.
  const searchInput = page.getByLabel('Search battlefields', { exact: true });
  await searchInput.fill(prefix + ' Death ');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('battlefieldSearch'))
    .toBe(prefix + ' Death');
  await expect(searchInput).toHaveValue(prefix + ' Death ');
  await searchInput.pressSequentially('Star', { delay: 40 });
  await expect(searchInput).toHaveValue(expensive.name);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', expensive.name);
  await expect
    .poll(() => new URL(page.url()).searchParams.get('battlefieldSearch'))
    .toBe(expensive.name);
  await searchInput.press('Enter');
  await page.goBack();
  if (new URL(page.url()).searchParams.get('battlefieldSearch') === expensive.name)
    await page.goBack();
  await expect(searchInput).toHaveValue(prefix + ' Death');
  await page.goForward();
  await expect(searchInput).toHaveValue(expensive.name);
  await page.waitForTimeout(400);
  expect(new URL(page.url()).searchParams.get('battlefieldSearch')).toBe(expensive.name);
  await searchInput.fill(prefix);
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Next showcase page' }).click();
  await expect(page).toHaveURL(/battlefieldPage=2/);
  await page.getByLabel('Filter by faction', { exact: true }).selectOption('rebel');
  await expect(page).toHaveURL(/battlefieldPage=1/);
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', fighter.name);
  await page.reload();
  await expect(page.getByLabel('Filter by faction', { exact: true })).toHaveValue('rebel');
  await page.goBack();
  await expect(page.getByLabel('Filter by faction', { exact: true })).toHaveValue('all');
  await expect(page).toHaveURL(/battlefieldPage=2/);
  await page.goForward();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByLabel('Filter by faction', { exact: true }).selectOption('all');
  await page.getByLabel('Sort battlefields', { exact: true }).selectOption('price-desc');
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', expensive.name);
  await page.getByLabel('Within my credits', { exact: true }).check();
  await expect(page.getByRole('status').filter({ hasText: '4 presets' })).toBeVisible();
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', planet.name);
  await page.getByRole('button', { name: 'Next showcase page' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', free.name);
  await page.getByLabel('Search battlefields', { exact: true }).fill(fighter.name);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', fighter.name);
  await expect(page).toHaveURL(/battlefieldPage=1/);
  await page.reload();
  await expect(page.getByLabel('Search battlefields', { exact: true })).toHaveValue(fighter.name);
  await page.getByLabel('Search battlefields', { exact: true }).fill(prefix + ' absent');
  await expect(page.getByRole('heading', { name: 'No presets match your filters' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Search battlefields', { exact: true })).toHaveValue(fighter.name);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.getByLabel('Search battlefields', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Sort battlefields', { exact: true })).toHaveValue('newest');
  await expect(page.getByLabel('Within my credits', { exact: true })).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1900, height: 1100 });

  // Anonymous filtering never sends a private budget request; its checkbox is disabled.
  const anonymousBudgetRequests: string[] = [];
  publicPage.on('request', request => {
    if (
      request.url().includes('/api/battlefield-presets?') &&
      request.url().includes('withinCredits=true')
    )
      anonymousBudgetRequests.push(request.url());
  });
  await publicPage.goto(showcaseUrl() + '&battlefieldAffordable=true');
  await expect(publicPage.getByRole('article')).toHaveCount(3);
  await expect(publicPage.getByLabel('Within my credits', { exact: true })).toBeDisabled();
  await expect(publicPage.getByLabel('Within my credits', { exact: true })).not.toBeChecked();
  expect(anonymousBudgetRequests).toEqual([]);
  expect(
    (await anonymous.request.get(origin + '/api/battlefield-presets?withinCredits=true')).status(),
  ).toBe(401);

  // Preview lighting moves without rewriting saved scenes, pauses while hidden, and honors motion settings.
  await publicPage.goto(showcaseUrl(planet.name));
  const preview = publicPage.getByRole('article', { name: planet.name, exact: true });
  const gradient = preview.locator('radialGradient[id$="-shade"]').first();
  const savedShade = await gradient.getAttribute('cx');
  await publicPage.waitForTimeout(250);
  expect(await gradient.getAttribute('cx')).toBe(savedShade);
  const transforms = await preview
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')));
  await publicPage.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => gradient.getAttribute('cx')).not.toBe(savedShade);
  await publicPage.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenShade = await gradient.getAttribute('cx');
  await publicPage.waitForTimeout(250);
  expect(await gradient.getAttribute('cx')).toBe(hiddenShade);
  await publicPage.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => gradient.getAttribute('cx')).not.toBe(hiddenShade);
  await publicPage.emulateMedia({ reducedMotion: 'reduce' });
  await expect(gradient).toHaveAttribute('cx', savedShade!);
  expect(
    await preview
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(transforms);
  expect(await getPreset(planet.id)).toEqual(planet);

  // Administrator editing is separate from personal slots, budgets, and profile activation.
  await adminPage.goto(showcaseUrl(planet.name));
  await adminPage.getByRole('link', { name: 'Edit preset', exact: true }).click();
  await expect(adminPage).toHaveURL(/battlefieldPresetMode=edit/);
  await expect(adminPage.getByLabel('Save to slot', { exact: true })).toHaveCount(0);
  await expect(adminPage.getByRole('button', { name: 'Use on profile', exact: true })).toHaveCount(
    0,
  );
  const nameInput = adminPage.getByLabel('Battlefield name', { exact: true }),
    update = adminPage.getByRole('button', { name: 'Update preset', exact: true });
  await expect(update).toBeDisabled();
  await nameInput.fill(prefix + ' Edited planet');
  await adminPage.getByLabel('Separatist Alliance', { exact: true }).check();
  await adminPage.getByLabel('Background', { exact: true }).selectOption('background-nebula');
  await update.click();
  await expect(update).toBeDisabled();
  let latest = await getPreset(planet.id);
  expect(latest).toMatchObject({
    name: prefix + ' Edited planet',
    factions: ['republic', 'separatist'],
    revision: 1,
  });
  expect(latest.scene.backgroundId).toBe('background-nebula');
  expect(await editor()).toEqual(personalBefore);
  expect((await editor(admin)).battlefields).toEqual([]);
  expect((await editor(admin)).balance).toBe(1000);

  // A stale edit retains its draft and permits explicit overwrite or reload of the latest version.
  latest = await remoteEdit(latest, prefix + ' Remote edit');
  await nameInput.fill(prefix + ' My draft');
  await update.click();
  await expect(
    adminPage.getByRole('button', { name: 'Save my draft instead', exact: true }),
  ).toBeVisible();
  await expect(nameInput).toHaveValue(prefix + ' My draft');
  await expect(adminPage.getByLabel('Separatist Alliance', { exact: true })).toBeChecked();
  adminPage.once('dialog', dialog => dialog.accept());
  await adminPage.getByRole('button', { name: 'Save my draft instead', exact: true }).click();
  await expect(
    adminPage.getByRole('button', { name: 'Save my draft instead', exact: true }),
  ).toHaveCount(0);
  await expect(update).toBeDisabled();
  latest = await getPreset(planet.id);
  expect(latest).toMatchObject({
    name: prefix + ' My draft',
    revision: 3,
    factions: ['republic', 'separatist'],
  });
  latest = await remoteEdit(latest, prefix + ' Latest version');
  await nameInput.fill(prefix + ' Discard this draft');
  await update.click();
  await expect(adminPage.getByRole('button', { name: 'Reload latest', exact: true })).toBeVisible();
  adminPage.once('dialog', dialog => dialog.accept());
  await adminPage.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await expect(nameInput).toHaveValue(latest.name);
  await expect(adminPage.getByLabel('Galactic Empire', { exact: true })).toBeChecked();
  await expect(adminPage.getByLabel('Separatist Alliance', { exact: true })).not.toBeChecked();

  // Edits made while a PATCH is pending remain unsaved and can be saved afterward.
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let patchSeen = false;
  await adminPage.route('**/api/battlefield-presets/' + planet.id, async route => {
    if (route.request().method() === 'PATCH') {
      patchSeen = true;
      await gate;
    }
    await route.continue();
  });
  await nameInput.fill(prefix + ' Submitted');
  await update.click();
  await expect.poll(() => patchSeen).toBe(true);
  await nameInput.fill(prefix + ' Edited while saving');
  await adminPage.getByLabel('Rebel Alliance', { exact: true }).check();
  release!();
  await expect(adminPage.getByRole('button', { name: 'Saving…', exact: true })).toHaveCount(0);
  await expect(nameInput).toHaveValue(prefix + ' Edited while saving');
  await expect(update).toBeEnabled();
  expect((await getPreset(planet.id)).name).toBe(prefix + ' Submitted');
  await adminPage.unroute('**/api/battlefield-presets/' + planet.id);
  await update.click();
  await expect(update).toBeDisabled();
  expect((await getPreset(planet.id)).factions).toEqual(['imperial', 'rebel']);
  expect(await editor()).toEqual(personalBefore);

  await adminPage.goto(presetEditUrl(expensive.id));
  await expect(adminPage.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '200,000 credits',
  );
  await adminPage.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(adminPage.getByRole('status', { name: 'Objects layout budget' })).toHaveText(
    'Cost 200,000 credits',
  );
  await adminPage.getByRole('button', { name: 'Close objects', exact: true }).click();
  await nameInput.fill(prefix + ' Expensive admin edit');
  await expect(update).toBeEnabled();
  await update.click();
  await expect(update).toBeDisabled();
  expect((await getPreset(expensive.id)).revision).toBe(1);
  await page.goto(origin + '/battlefield');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Objects layout budget' })).toHaveText(
    'Cost 1,000 / 1,000 credits',
  );
  await page.getByRole('button', { name: 'Close objects', exact: true }).click();
  // Current main's uploaded headers coexist with saved Battlefields; broken images fall back to the saved scene.
  const memberId = userIds[1];
  await sql`UPDATE user_profile SET header_source='upload',header_width=1600,header_height=400 WHERE user_id=${memberId}`;
  let headerImage =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><rect width="1600" height="400" fill="#385877"/></svg>',
    );
  await page.route('**/api/user/' + memberId + '/header', async route => {
    const [preference] =
      await sql`SELECT header_source FROM user_profile WHERE user_id=${memberId}`;
    await route.fulfill({
      json: {
        data:
          preference.header_source === 'battlefield'
            ? { source: 'battlefield', image: null, width: null, height: null }
            : { source: 'upload', image: headerImage, width: 1600, height: 400 },
      },
    });
  });
  await page.goto(origin + '/users/' + memberId);
  await expect(page.locator('img[src^="data:image/svg+xml"]')).toBeVisible();
  await expect(page.locator('svg[viewBox="0 0 1600 400"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Battlefield', exact: true }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Battlefield editor', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Battlefield showcase', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  headerImage = 'data:image/svg+xml,invalid';
  await page.reload();
  await expect(page.locator('svg[viewBox="0 0 1600 400"]')).toHaveCount(1);
  expect(await editor()).toEqual(personalBefore);
  const spareResponse = await member.request.post(origin + '/api/battlefields/from-draft', {
    headers,
    data: { name: 'Activate over image header', scene: scene() },
  });
  expect(spareResponse.status()).toBe(201);
  const spare = (await spareResponse.json()).data;
  await page.goto(origin + '/battlefield');
  await page.getByLabel('Choose Battlefield', { exact: true }).selectOption(spare.id);
  await page.getByRole('button', { name: 'Use on profile', exact: true }).click();
  await expect(page.getByText('On your profile', { exact: true })).toBeVisible();
  const [preference] =
    await sql`SELECT header_source,header_width,header_height FROM user_profile WHERE user_id=${memberId}`;
  expect(preference).toMatchObject({
    header_source: 'battlefield',
    header_width: null,
    header_height: null,
  });
  await page.goto(origin + '/users/' + memberId);
  await expect(page.locator('svg[viewBox="0 0 1600 400"]')).toHaveCount(1);
  await expect(page.locator('img[src^="data:image/svg+xml"]')).toHaveCount(0);
  expect((await editor()).battlefields.find(b => b.active)?.id).toBe(spare.id);
  await page.unroute('**/api/user/' + memberId + '/header');
  await page.goto(presetEditUrl(large.id));
  await expect(page.getByText('Only administrators can edit Battlefield presets.')).toBeVisible();
  expect(
    (
      await member.request.patch(origin + '/api/battlefield-presets/' + large.id, {
        headers,
        data: { name: 'Denied', scene: large.scene, factions: [], revision: 0 },
      })
    ).status(),
  ).toBe(403);
  expect(errors).toEqual([]);
  console.log(
    'PASS: full-set search/faction/credit/price filters and URL history; compact loading controls; responsive layout; animated previews and reduced motion; admin layout/tag edits, conflict recovery and edits during saving; personal copies and credits preserved.',
  );
} finally {
  release?.();
  await browser.close();
  if (presetIds.length) await sql`DELETE FROM battlefield_preset WHERE id IN ${sql(presetIds)}`;
  if (userIds.length) await sql`DELETE FROM "user" WHERE id IN ${sql(userIds)}`;
  await sql.end();
}
