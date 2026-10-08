// BATTLEFIELD_DUPLICATION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield-duplication.browser.ts
// Exercise the real editor and API using a synthetic account; clean all fixtures in finally.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { battlefieldCost } from '../../shared/battlefield/cost.ts';
import { publicBattlefieldScene } from '../../shared/battlefield/layers.ts';
import type { BattlefieldEditorData } from '../../shared/types/battlefield.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.BATTLEFIELD_DUPLICATION_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Explicitly select an isolated worktree database and development origin.');
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 1, onnotice: () => {} });
const userId = 'battlefield-duplication-browser-' + crypto.randomUUID(),
  token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 2200, height: 1100 },
  reducedMotion: 'reduce',
  locale: 'en-US',
});
const anonymous = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const canvas = page.getByRole('group', { name: 'Battlefield canvas', exact: true });
const objects = page.getByRole('dialog', { name: 'Battlefield objects', exact: true });
const save = page.getByRole('button', { name: 'Save battlefield', exact: true });
const duplicate = page.getByRole('button', { name: 'Duplicate Battlefield', exact: true });
const nameInput = page.getByLabel('Battlefield name', { exact: true });
const headers = { 'X-Requested-With': 'swubase' };
async function editor(): Promise<BattlefieldEditorData> {
  const response = await context.request.get(origin + '/api/battlefields');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function saveDraft() {
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('1600 × 400 px · Saved', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
}
let release: (() => void) | undefined;
try {
  await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${userId},'Duplication fixture',${userId},${userId + '@invalid.local'},false,'USD','user',now(),now())`;
  await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${userId},now()+interval '1 hour',now(),now())`;
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},5000,'battlefield-duplication-test',${crypto.randomUUID()})`;
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
  await page.goto(origin + '/battlefield');
  await page.getByRole('button', { name: 'Create battlefield', exact: true }).click();
  await expect(canvas).toBeVisible();
  await sql`UPDATE user_profile SET battlefield_limit=3 WHERE user_id=${userId}`;
  await page.reload();
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page
    .getByRole('button', { name: 'Remove selection from battlefield', exact: true })
    .click();
  await nameInput.fill('Squadrons');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByRole('button', { name: 'Ships', exact: true }).click();
  await objects.getByLabel('Search objects').fill('X-wing');
  const quantity = objects.getByRole('group', { name: 'X-wing quantity', exact: true });
  await expect(quantity.locator('output')).toHaveText('1');
  await expect(
    quantity.getByRole('button', { name: 'Decrease X-wing quantity', exact: true }),
  ).toBeDisabled();
  await quantity
    .getByRole('button', { name: 'Increase X-wing quantity', exact: true })
    .evaluate(node => {
      for (let i = 0; i < 60; i++) (node as HTMLButtonElement).click();
    });
  await expect(quantity.locator('output')).toHaveText('50');
  await expect(
    quantity.getByRole('button', { name: 'Increase X-wing quantity', exact: true }),
  ).toBeDisabled();
  await quantity
    .getByRole('button', { name: 'Decrease X-wing quantity', exact: true })
    .evaluate(node => {
      for (let i = 0; i < 60; i++) (node as HTMLButtonElement).click();
    });
  await expect(quantity.locator('output')).toHaveText('1');
  for (let i = 0; i < 5; i++)
    await quantity.getByRole('button', { name: 'Increase X-wing quantity', exact: true }).click();
  await quantity.getByRole('button', { name: 'Decrease X-wing quantity', exact: true }).click();
  await expect(quantity.locator('output')).toHaveText('5');
  await expect(objects.getByRole('button', { name: 'Add X-wing', exact: true })).toContainText(
    '2,000',
  );
  await page.screenshot({ path: '.swubase/battlefield-duplication-quantity-wide.png' });
  await objects.getByRole('button', { name: 'Add X-wing', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(5);
  await expect(
    page.getByRole('button', { name: 'Select layer X-wing squadron', exact: true }),
  ).toBeVisible();
  // One batch is a single undo step, including its new folder.
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Select layer X-wing squadron', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(5);
  await saveDraft();
  const batch = (await editor()).battlefields[0];
  expect(batch.scene.placements).toHaveLength(5);
  expect(new Set(batch.scene.placements.map(p => p.layerId)).size).toBe(1);
  expect(new Set(batch.scene.placements.map(p => p.y)).size).toBe(1);
  expect(new Set(batch.scene.placements.map(p => p.x)).size).toBe(5);
  expect(battlefieldCost(batch.scene)).toBe(2000);
  const first = canvas.getByRole('button', { name: 'Select X-wing', exact: true }).first();
  await first.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('0.5');
  await page.getByRole('slider', { name: 'Object rotation', exact: true }).fill('45');
  await page.getByLabel('Object color', { exact: true }).selectOption('color-gold');
  await page.getByLabel('Battlefield editing area', { exact: true }).focus();
  await page.keyboard.press('Control+d');
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(6);
  const selectedCopy = canvas
    .getByRole('button', { name: 'Select X-wing', exact: true })
    .and(canvas.locator('[aria-pressed="true"]'));
  await expect(selectedCopy).toHaveAttribute('transform', /rotate\(45\).*scale\(0\.5\)/);
  await saveDraft();
  const doubled = (await editor()).battlefields[0];
  expect(
    doubled.scene.placements.filter(
      p => p.scale === 0.5 && p.rotation === 45 && p.colorId === 'color-gold',
    ),
  ).toHaveLength(2);
  expect(battlefieldCost(doubled.scene)).toBe(2800);
  // Hidden copies must survive layer duplication and still consume budget.
  await page.getByRole('button', { name: 'Hide X-wing', exact: true }).first().click();
  await page
    .getByRole('button', { name: 'Create sublayer in X-wing squadron', exact: true })
    .click();
  await page.getByRole('button', { name: 'Select layer X-wing squadron', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate layer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select layer Layer 3', exact: true })).toHaveCount(
    2,
  );
  await expect(
    page.getByRole('button', { name: 'Select layer X-wing squadron (copy)', exact: true }),
  ).toBeVisible();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(10);
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '200 over budget',
  );
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(5);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveCount(10);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await saveDraft();
  const source = (await editor()).battlefields[0];
  expect(source.scene.placements.filter(p => !p.visible)).toHaveLength(1);
  const publicResponse = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  expect((await publicResponse.json()).data.scene).toEqual(publicBattlefieldScene(source.scene));
  await expect(duplicate).toBeEnabled();
  await duplicate.click();
  await expect(nameInput).toHaveValue('Squadrons (copy)');
  await expect(save).toBeDisabled();
  const data = await editor();
  const copy = data.battlefields.find(row => row.id !== source.id)!;
  expect(data.balance).toBe(5000);
  expect(copy).toMatchObject({ active: false, revision: 0 });
  expect(copy.scene.placements).toHaveLength(6);
  expect(copy.scene.layers).toHaveLength(3);
  expect(copy.scene.placements.filter(p => !p.visible)).toHaveLength(1);
  expect(battlefieldCost(copy.scene)).toBe(battlefieldCost(source.scene));
  expect(data.battlefields.find(row => row.id === source.id)).toEqual(source);
  const oldIds = new Set(
    [...source.scene.layers, ...source.scene.placements].map(record => record.id),
  );
  expect(
    [...copy.scene.layers, ...copy.scene.placements].every(record => !oldIds.has(record.id)),
  ).toBe(true);
  await nameInput.fill('Squadrons remix');
  await expect(duplicate).toBeDisabled();
  await saveDraft();
  expect((await editor()).battlefields.find(row => row.id === source.id)).toEqual(source);
  // A draft changed during a slow duplication request stays open instead of being lost.
  let signal: (() => void) | undefined;
  const requested = new Promise<void>(resolve => {
    signal = resolve;
  });
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/battlefields/' + copy.id + '/duplicate', async route => {
    signal!();
    await held;
    await route.continue();
  });
  await duplicate.click();
  await requested;
  await nameInput.fill('Draft while copying');
  release!();
  await expect(
    page.getByText('Created Squadrons remix (copy). Your current draft is still open.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(nameInput).toHaveValue('Draft while copying');
  await expect(save).toBeEnabled();
  await expect(page.getByText('3 / 3 Battlefield slots used', { exact: true })).toBeVisible();
  await saveDraft();
  await expect(duplicate).toBeDisabled();
  await expect(duplicate).toHaveAttribute('title', 'Battlefield limit reached (3 / 3).');
  expect(
    (
      await context.request.post(origin + '/api/battlefields/' + source.id + '/duplicate', {
        headers,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await anonymous.request.post(origin + '/api/battlefields/' + source.id + '/duplicate', {
        headers,
      })
    ).status(),
  ).toBe(401);
  await page.unrouteAll({ behavior: 'wait' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => localStorage.setItem('vite-ui-theme', value), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    await expect(canvas).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
    await objects.getByRole('button', { name: 'Ships', exact: true }).click();
    await objects.getByLabel('Search objects').fill('X-wing');
    await expect(
      objects.getByRole('group', { name: 'X-wing quantity', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: '.swubase/battlefield-duplication-quantity-mobile-' + theme + '.png',
    });
    await objects.getByLabel('Search objects').fill('Executor');
    await expect(objects.getByRole('button', { name: 'Add Executor', exact: true })).toBeVisible();
    await expect(
      objects.getByRole('group', { name: 'Executor quantity', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 2200, height: 1100 });
  }
  const final = await editor();
  expect(final.balance).toBe(5000);
  expect(final.battlefields).toHaveLength(3);
  expect(final.battlefields.find(row => row.id === source.id)).toEqual(source);
  expect(await sql`SELECT source FROM user_credits WHERE user_id=${userId}`).toHaveLength(1);
  expect(errors).toEqual([]);
  console.log(
    'PASS: small-ship quantity steppers, adjacent squadron placement, batch undo/redo, customized object duplication/shortcut, hidden layer copies and budget checks, independent saved Battlefield copies, unchanged credits/profile, draft preservation during pending duplication, slot/auth limits, mobile and both themes.',
  );
} catch (error) {
  await page
    .screenshot({ path: '.swubase/battlefield-duplication-failure.png', fullPage: true })
    .catch(() => {});
  console.log('Visible alerts:', await page.getByRole('alert').allTextContents());
  throw error;
} finally {
  release?.();
  await browser.close();
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
