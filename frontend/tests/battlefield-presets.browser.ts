// BATTLEFIELD_PRESETS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield-presets.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Dialog } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import {
  defaultBattlefieldScene,
  type BattlefieldEditorData,
  type BattlefieldPreset,
  type BattlefieldScene,
} from '../../shared/types/battlefield.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.BATTLEFIELD_PRESETS_BROWSER_TEST !== '1' ||
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
const anonymous = await browser.newContext();
const adminPage = await admin.newPage(),
  page = await member.newPage(),
  publicPage = await anonymous.newPage();
const userIds: string[] = [],
  presetIds: string[] = [],
  errors: string[] = [];
const fixtureName = 'Preset fixture ' + crypto.randomUUID().slice(0, 8);
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
  const id = 'battlefield-presets-browser-' + crypto.randomUUID(),
    token = crypto.randomUUID();
  userIds.push(id);
  await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${id},${fixtureName},${id},${id + '@invalid.local'},false,'USD',${role},now(),now())`;
  await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${id},now()+interval '1 hour',now(),now())`;
  await sql`INSERT INTO user_profile(user_id,battlefield_limit) VALUES(${id},3)`;
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${id},1000,'battlefield-presets-test',${crypto.randomUUID()})`;
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
  return id;
}
async function editor(context = member): Promise<BattlefieldEditorData> {
  const response = await context.request.get(origin + '/api/battlefields');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function create(context: BrowserContext, name: string, scene: BattlefieldScene) {
  const response = await context.request.post(origin + '/api/battlefields/from-draft', {
    headers,
    data: { name, scene },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}
async function preset(name: string, scene: BattlefieldScene): Promise<BattlefieldPreset> {
  const response = await admin.request.post(origin + '/api/battlefield-presets', {
    headers,
    data: { name, scene },
  });
  expect(response.status()).toBe(201);
  const result = (await response.json()).data;
  presetIds.push(result.id);
  return result;
}
const nameInput = page.getByLabel('Battlefield name', { exact: true });
const save = page.getByRole('button', { name: 'Save battlefield', exact: true });
const slot = page.getByLabel('Save to slot', { exact: true });
const canvas = page.getByRole('group', { name: 'Battlefield canvas', exact: true });
const draftUrl = (id: string) =>
  origin + '/battlefield?' + new URLSearchParams({ battlefieldPreset: id });
try {
  const adminId = await account(admin, 'admin'),
    memberId = await account(member, 'user');
  const scene = defaultBattlefieldScene(),
    child = crypto.randomUUID();
  scene.light = { x: 1100, y: 240 };
  scene.layers.push({
    id: child,
    name: 'Hidden squadron',
    parentId: scene.layers[0].id,
    visible: false,
    order: 0,
  });
  scene.placements = [0, 1].map(index => ({
    ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
    itemId: 'ship-x-wing',
    x: 650 + index * 100,
    y: 180,
    scale: 0.5,
    rotation: 45,
    textureId: undefined,
    layerId: index ? child : scene.layers[0].id,
    visible: !index,
    order: 0,
  }));
  const personalAdmin = await create(admin, 'Admin original', scene);
  const original = await create(member, 'Original active', defaultBattlefieldScene());
  const target = await create(member, 'Original spare', defaultBattlefieldScene());
  // Real administrator gate and anonymous public reads.
  for (const [context, status] of [
    [anonymous, 401],
    [member, 403],
  ] as const) {
    const response = await context.request.post(origin + '/api/battlefield-presets', {
      headers,
      data: { name: 'Denied', scene },
    });
    expect(response.status()).toBe(status);
  }
  await adminPage.goto(origin + '/battlefield');
  await adminPage.getByLabel('Battlefield name', { exact: true }).fill(fixtureName + ' wing');
  await adminPage.getByRole('button', { name: 'Save as preset', exact: true }).click();
  await expect(
    adminPage.getByRole('dialog', { name: 'Save as a Battlefield preset?' }),
  ).toContainText('displayed publicly');
  await expect(adminPage.getByRole('dialog')).toContainText('Hidden layers and objects');
  await adminPage.getByRole('dialog').getByLabel('Rebel Alliance', { exact: true }).check();
  await adminPage.getByRole('dialog').getByLabel('Galactic Empire', { exact: true }).check();
  const publishedResponse = adminPage.waitForResponse(
    response =>
      response.url().endsWith('/api/battlefield-presets') && response.request().method() === 'POST',
  );
  await adminPage.getByRole('button', { name: 'Publish preset', exact: true }).click();
  const published = await publishedResponse;
  expect(published.status()).toBe(201);
  const fleet: BattlefieldPreset = (await published.json()).data;
  presetIds.push(fleet.id);
  await expect(
    adminPage.getByText(`“${fleet.name}” saved as a public preset in the Battlefield showcase.`, {
      exact: true,
    }),
  ).toBeVisible();
  expect((await editor(admin)).battlefields[0]).toEqual(personalAdmin);
  expect((await editor(admin)).balance).toBe(1000);
  expect(fleet.cost).toBe(800);
  expect(fleet.factions).toEqual(['rebel', 'imperial']);
  const deathStar = defaultBattlefieldScene();
  deathStar.placements.push({
    ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
    itemId: 'station-death-star',
    x: 800,
    y: 200,
    scale: 1,
    textureId: undefined,
  });
  const expensive = await preset(fixtureName + ' Death Star', deathStar);
  await preset(fixtureName + ' empty 1', defaultBattlefieldScene());
  await preset(fixtureName + ' empty 2', defaultBattlefieldScene());
  await publicPage.goto(
    origin + '/battlefield-showcase?' + new URLSearchParams({ battlefieldSearch: fixtureName }),
  );
  await expect(
    publicPage.getByRole('heading', { name: 'Battlefield showcase', exact: true }),
  ).toBeVisible();
  await expect(publicPage.getByRole('article')).toHaveCount(3);
  await expect(publicPage.getByRole('link', { name: 'Sign in to load', exact: true })).toHaveCount(
    3,
  );
  await expect(
    publicPage.getByRole('button', { name: 'Load to battlefield editor', exact: true }),
  ).toHaveCount(0);
  await publicPage.getByRole('button', { name: 'Next showcase page' }).click();
  await expect(publicPage).toHaveURL(/battlefieldPage=2/);
  await expect(publicPage.getByRole('article', { name: fleet.name, exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole('article', { name: fleet.name, exact: true })).toBeVisible();
  await publicPage.goBack();
  await expect(publicPage.getByRole('article')).toHaveCount(3);
  await publicPage.goForward();
  await expect(publicPage.getByRole('article', { name: fleet.name, exact: true })).toBeVisible();
  await publicPage.goto(draftUrl(fleet.id));
  await expect(publicPage.getByText('You must be logged in to view this page.')).toBeVisible();
  // Profile dropdown exposes both destinations.
  await page.goto(origin + '/users/' + memberId);
  await page.getByRole('button', { name: 'Battlefield', exact: true }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Battlefield editor', exact: true }),
  ).toBeVisible();
  await page.getByRole('menuitem', { name: 'Battlefield showcase', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Battlefield showcase', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Search battlefields', { exact: true }).fill(fixtureName);
  await expect(page.getByRole('status').filter({ hasText: '4 presets' })).toBeVisible();
  await page.getByRole('button', { name: 'Next showcase page' }).click();
  const fleetCard = page.getByRole('article', { name: fleet.name, exact: true });
  await expect(fleetCard).toContainText('Includes 1 hidden object');
  await fleetCard.getByRole('button', { name: 'Load to battlefield editor', exact: true }).click();
  await page.getByLabel(`Destination for ${fleet.name}`).selectOption(target.id);
  await expect(
    page.getByRole('dialog', { name: `Load ${fleet.name}?`, exact: true }),
  ).toContainText('rewrite “Original spare”');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await editor()).battlefields).toEqual([original, target]);
  await fleetCard.getByRole('button', { name: 'Load to battlefield editor', exact: true }).click();
  await page.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(nameInput).toHaveValue(fleet.name);
  await expect(slot).toHaveValue(target.id);
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Save as preset', exact: true })).toHaveCount(0);
  expect((await editor()).battlefields).toEqual([original, target]);
  // Cancel replacement, then explicitly accept it. Active layout and preset stay untouched.
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Original spare');
    await dialog.dismiss();
  });
  await save.click();
  expect((await editor()).battlefields).toEqual([original, target]);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('rewritten');
    await dialog.accept();
  });
  await save.click();
  await expect(save).toBeDisabled();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  const replaced = (await editor()).battlefields.find(b => b.id === target.id)!;
  expect(replaced).toMatchObject({ name: fleet.name, revision: 1, active: false });
  expect(replaced.scene.placements).toHaveLength(2);
  expect(replaced.scene.layers[1].parentId).toBe(replaced.scene.layers[0].id);
  const presetObjectIds = new Set(
    [...fleet.scene.layers, ...fleet.scene.placements].map(object => object.id),
  );
  expect(
    [...replaced.scene.layers, ...replaced.scene.placements].every(
      object => !presetObjectIds.has(object.id),
    ),
  ).toBe(true);
  expect((await editor()).battlefields.find(b => b.id === original.id)).toEqual(original);
  const preserved = await anonymous.request.get(origin + '/api/battlefield-presets/' + fleet.id);
  expect((await preserved.json()).data).toEqual(fleet);
  // Direct URL imports and refresh start with no automatic destination, including one-slot accounts.
  await page.goto(draftUrl(fleet.id));
  await expect(slot).toHaveValue('');
  await expect(save).toBeDisabled();
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(slot).toHaveValue('');
  await slot.selectOption('new');
  await save.click();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  expect((await editor()).battlefields).toHaveLength(3);
  expect((await editor()).battlefields.filter(b => b.active)).toHaveLength(1);
  await page.goto(draftUrl(expensive.id));
  await expect(slot).toHaveValue('');
  await slot.selectOption(original.id);
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '199,000 over budget',
  );
  await expect(page.getByRole('alert')).toContainText('Remove objects');
  await expect(save).toBeDisabled();
  expect((await editor()).battlefields.find(b => b.id === original.id)).toEqual(original);
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page
    .getByRole('button', { name: 'Remove selection from battlefield', exact: true })
    .click();
  await expect(save).toBeEnabled();
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await expect(save).toBeDisabled();
  expect((await editor()).battlefields.find(b => b.id === original.id)).toMatchObject({
    active: true,
    scene: { placements: [] },
  });
  // Reloading a conflicted destination opens that slot, so choosing the original works afterward.
  await slot.selectOption(target.id);
  const beforeReloadConflict = (await editor()).battlefields.find(b => b.id === target.id)!;
  expect(
    (
      await member.request.patch(origin + '/api/battlefields/' + target.id, {
        headers,
        data: {
          name: 'Concurrent replacement',
          scene: defaultBattlefieldScene(),
          revision: beforeReloadConflict.revision,
        },
      })
    ).status(),
  ).toBe(200);
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await expect(page.getByRole('button', { name: 'Reload latest', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await expect(nameInput).toHaveValue('Concurrent replacement');
  await page.getByLabel('Choose Battlefield', { exact: true }).selectOption(original.id);
  await expect(nameInput).toHaveValue(expensive.name);
  // A preset replacement raced by another tab must reject the stale revision and preserve the draft.
  await page.goto(draftUrl(fleet.id));
  await slot.selectOption(target.id);
  const latestTarget = (await editor()).battlefields.find(b => b.id === target.id)!;
  expect(
    (
      await member.request.patch(origin + '/api/battlefields/' + target.id, {
        headers,
        data: {
          name: 'Changed in another tab',
          scene: defaultBattlefieldScene(),
          revision: latestTarget.revision,
        },
      })
    ).status(),
  ).toBe(200);
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await expect(
    page.getByRole('button', { name: 'Save my draft instead', exact: true }),
  ).toBeVisible();
  await expect(nameInput).toHaveValue(fleet.name);
  const reloadDialogs: string[] = [];
  const acceptReload = (dialog: Dialog) => {
    reloadDialogs.push(dialog.message());
    return dialog.accept();
  };
  page.on('dialog', acceptReload);
  await page.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  await expect(nameInput).toHaveValue('Changed in another tab');
  await expect(page.getByLabel('Choose Battlefield', { exact: true })).toHaveValue(target.id);
  page.off('dialog', acceptReload);
  expect(reloadDialogs).toHaveLength(1);
  expect(reloadDialogs[0]).toContain('Discard your unsaved changes');
  // Exercise the alternative conflict action in a new imported draft.
  await page.goto(draftUrl(fleet.id));
  await slot.selectOption(target.id);
  const secondConflictTarget = (await editor()).battlefields.find(b => b.id === target.id)!;
  expect(
    (
      await member.request.patch(origin + '/api/battlefields/' + target.id, {
        headers,
        data: {
          name: 'Changed again in another tab',
          scene: defaultBattlefieldScene(),
          revision: secondConflictTarget.revision,
        },
      })
    ).status(),
  ).toBe(200);
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await expect(
    page.getByRole('button', { name: 'Save my draft instead', exact: true }),
  ).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Save my draft instead', exact: true }).click();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  await expect(save).toBeDisabled();
  // Edits made while a save is in flight remain open.
  await page.goto(draftUrl(fleet.id));
  await slot.selectOption(target.id);
  let signal: (() => void) | undefined;
  const requested = new Promise<void>(resolve => {
    signal = resolve;
  });
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/battlefields/' + target.id, async route => {
    if (route.request().method() === 'PATCH') {
      signal!();
      await held;
    }
    await route.continue();
  });
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await requested;
  await nameInput.fill('Draft edited while saving');
  release!();
  await expect(page.getByText('Battlefield saved.', { exact: true })).toBeVisible();
  await expect(nameInput).toHaveValue('Draft edited while saving');
  await expect(save).toBeEnabled();
  await expect(page).toHaveURL(/battlefieldPreset=/);
  await save.click();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  await page.unrouteAll({ behavior: 'wait' });
  // Showcase explains an unaffordable load before opening the draft.
  await page.getByRole('link', { name: 'Battlefield showcase', exact: true }).click();
  const expensiveCard = page.getByRole('article', { name: expensive.name, exact: true });
  await expensiveCard
    .getByRole('button', { name: 'Load to battlefield editor', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Remove objects or reduce their size');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => localStorage.setItem('vite-ui-theme', value), theme);
    await page.reload();
    await expect(page.getByRole('article')).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const frame of await page.locator('article > svg').all()) {
      const bounds = await frame.boundingBox();
      expect(bounds!.width / bounds!.height).toBeCloseTo(4, 1);
    }
    await page.screenshot({
      path: '.swubase/battlefield-showcase-mobile-' + theme + '.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 1900, height: 1100 });
  }
  await page.screenshot({ path: '.swubase/battlefield-showcase-wide.png', fullPage: true });
  // One-slot admins still choose a destination explicitly and can publish beyond their personal budget.
  await sql`UPDATE user_profile SET battlefield_limit=1 WHERE user_id=${adminId}`;
  adminPage.once('dialog', dialog => dialog.accept());
  await adminPage.goto(draftUrl(expensive.id));
  await expect(adminPage.getByLabel('Save to slot', { exact: true })).toHaveValue('');
  await expect(adminPage.getByLabel('Save to slot').locator('option[value="new"]')).toHaveCount(0);
  await adminPage.getByLabel('Save to slot').selectOption(personalAdmin.id);
  await expect(
    adminPage.getByRole('button', { name: 'Save battlefield', exact: true }),
  ).toBeDisabled();
  await adminPage
    .getByLabel('Battlefield name', { exact: true })
    .fill(expensive.name + ' temporary');
  await expect(
    adminPage.getByRole('button', { name: 'Save as preset', exact: true }),
  ).toBeEnabled();
  await adminPage.getByRole('button', { name: 'Save as preset', exact: true }).click();
  const expensiveResponse = adminPage.waitForResponse(
    response =>
      response.url().endsWith('/api/battlefield-presets') && response.request().method() === 'POST',
  );
  await adminPage.getByRole('button', { name: 'Publish preset', exact: true }).click();
  const extraPreset: BattlefieldPreset = (await (await expensiveResponse).json()).data;
  presetIds.push(extraPreset.id);
  await expect(
    adminPage.getByText(
      `“${extraPreset.name}” saved as a public preset in the Battlefield showcase.`,
      { exact: true },
    ),
  ).toBeVisible();
  expect(extraPreset.cost).toBe(200000);
  adminPage.once('dialog', dialog => dialog.accept());
  await adminPage.getByRole('link', { name: 'Battlefield showcase', exact: true }).click();
  const removable = adminPage.getByRole('article', { name: extraPreset.name, exact: true });
  await page.goto(draftUrl(extraPreset.id));
  await expect(nameInput).toHaveValue(extraPreset.name);
  adminPage.once('dialog', dialog => dialog.dismiss());
  await removable.getByRole('button', { name: 'Delete preset', exact: true }).click();
  expect(
    (await anonymous.request.get(origin + '/api/battlefield-presets/' + extraPreset.id)).status(),
  ).toBe(200);
  for (const [context, status] of [
    [anonymous, 401],
    [member, 403],
  ] as const)
    expect(
      (
        await context.request.delete(origin + '/api/battlefield-presets/' + extraPreset.id, {
          headers,
        })
      ).status(),
    ).toBe(status);
  // A second administrator deletes it before this tab's delete request.
  expect(
    (
      await admin.request.delete(origin + '/api/battlefield-presets/' + extraPreset.id, { headers })
    ).status(),
  ).toBe(200);
  adminPage.once('dialog', dialog => dialog.accept());
  await removable.getByRole('button', { name: 'Delete preset', exact: true }).click();
  await expect
    .poll(async () =>
      (await anonymous.request.get(origin + '/api/battlefield-presets/' + extraPreset.id)).status(),
    )
    .toBe(404);
  await expect(removable).toHaveCount(0);
  await expect(adminPage.getByRole('article')).toHaveCount(3);
  // A stale source refresh must preserve the open editor, with an informative status instead of a dead-end retry.
  await page.waitForTimeout(31000);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(
    page.getByText(
      'This preset is no longer available. Your loaded draft is still here and can be saved to your slots.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(nameInput).toHaveValue(extraPreset.name);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page
    .getByRole('button', { name: 'Remove selection from battlefield', exact: true })
    .click();
  await slot.selectOption(target.id);
  page.once('dialog', dialog => dialog.accept());
  await save.click();
  await expect(page).not.toHaveURL(/battlefieldPreset=/);
  await expect(save).toBeDisabled();
  expect((await editor()).balance).toBe(1000);
  expect((await editor()).battlefields).toHaveLength(3);
  expect((await editor(admin)).battlefields[0]).toEqual(personalAdmin);
  expect(await sql`SELECT source FROM user_credits WHERE user_id=${memberId}`).toHaveLength(1);
  expect(await sql`SELECT source FROM user_credits WHERE user_id=${adminId}`).toHaveLength(1);
  expect(errors).toEqual([]);
  console.log(
    'PASS: real admin publication/deletion and permissions, public three-per-page showcase/navigation, profile links, draft imports, explicit slot selection including one-slot accounts, cancelled/confirmed overwrites, nested/hidden objects and notices, independent presets, atomic new-slot saves, over-budget editing/publication, revision conflicts, in-flight draft preservation, unchanged credits, responsive 4:1 previews and both themes.',
  );
} catch (error) {
  await page
    .screenshot({ path: '.swubase/battlefield-presets-failure.png', fullPage: true })
    .catch(() => {});
  console.log('Visible alerts:', await page.getByRole('alert').allTextContents());
  console.log('Browser errors:', JSON.stringify(errors));
  throw error;
} finally {
  release?.();
  await browser.close();
  for (const id of presetIds) await sql`DELETE FROM battlefield_preset WHERE id=${id}`;
  for (const id of userIds) await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
