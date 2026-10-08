// BATTLEFIELD_DEATH_STAR_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield-death-star.browser.ts
// Real editor/API checks; only a synthetic account and its ledger are changed.
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
  process.env.BATTLEFIELD_DEATH_STAR_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Explicitly select an isolated worktree database and development origin.');
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 1, onnotice: () => {} });
const userId = 'battlefield-death-star-' + crypto.randomUUID();
const token = crypto.randomUUID();
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
page.on('dialog', dialog => void dialog.accept());
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const canvas = page.getByRole('group', { name: 'Battlefield canvas', exact: true });
const size = page.getByRole('slider', { name: 'Object size', exact: true });
const cost = page.getByRole('status', { name: 'Battlefield cost', exact: true });
const save = page.getByRole('button', { name: 'Save battlefield', exact: true });
const headers = { 'X-Requested-With': 'swubase' };
async function editor(): Promise<BattlefieldEditorData> {
  const response = await context.request.get(origin + '/api/battlefields');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function addDeathStar() {
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const objects = page.getByRole('dialog', { name: 'Battlefield objects', exact: true });
  await objects.getByRole('button', { name: 'Stations', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Death Star');
  const model = objects.getByRole('button', { name: 'Add Death Star', exact: true });
  await expect(model).toBeEnabled();
  await expect(model).toContainText('200,000');
  const sphere = await model.locator('circle[r="50"][stroke]').boundingBox();
  expect(sphere!.width / sphere!.height).toBeCloseTo(1, 2);
  await model.click();
  await expect(objects).toBeHidden();
  await expect(size).toHaveAttribute('max', '3');
}
async function clearScene() {
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
}
try {
  await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${userId},'Death Star fixture',${userId},${userId + '@invalid.local'},false,'USD','user',now(),now())`;
  await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${userId},now()+interval '1 hour',now(),now())`;
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},199999,'battlefield-death-star-test',${crypto.randomUUID()})`;
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
  await clearScene();
  await addDeathStar();
  await expect(cost).toContainText('Cost 200,000 / 199,999 credits');
  await expect(save).toBeDisabled();
  // Base diameter equals the existing 240px planet, independent of fitted canvas width.
  const diameter = await canvas.locator('circle[r="50"][stroke]').evaluate(node => {
    const circle = node as SVGGraphicsElement;
    const transform = circle.getScreenCTM()!;
    // Exclude the thin outline while measuring the transformed hull geometry.
    return circle.getBBox().width * Math.hypot(transform.a, transform.b);
  });
  const canvasBox = await canvas.boundingBox();
  expect((diameter / canvasBox!.width) * 1600).toBeCloseTo(240, 1);
  // The round hull must leave empty space at the corners of its bounding square clickable.
  await size.fill('3');
  const station = canvas.getByRole('button', { name: 'Select Death Star', exact: true });
  await expect(station).toHaveAttribute('transform', /scale\(3\)/);
  const outsideHull = await station.evaluate(node => {
    const point = new DOMPoint(118, 52).matrixTransform(
      (node as SVGGraphicsElement).getScreenCTM()!,
    );
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(outsideHull.x, outsideHull.y);
  await expect(station).toHaveAttribute('aria-pressed', 'false');
  await station.focus();
  await page.keyboard.press('Enter');
  await size.fill('2');
  await expect(cost).toContainText('Cost 275,000 / 199,999 credits');
  await size.fill('3');
  await expect(size).toHaveValue('3');
  await expect(size.locator('..')).toContainText('Size · 300%');
  await expect(size.locator('..')).toContainText('400,000 credits at 300%');
  await expect(cost).toContainText('Cost 400,000 / 199,999 credits');
  await expect(save).toBeDisabled();
  const initial = (await editor()).battlefields[0];
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + initial.id, {
        headers,
        data: {
          name: initial.name,
          revision: initial.revision,
          scene: {
            ...initial.scene,
            placements: [
              {
                ...initial.scene.placements[0],
                itemId: 'station-death-star',
                textureId: undefined,
                scale: 0.2,
              },
            ],
          },
        },
      })
    ).status(),
  ).toBe(400); // Shrinking cannot bypass the base price.
  // Only this synthetic account gains a test budget for exercising a maximum-size save.
  await sql`UPDATE user_credits SET amount=400000 WHERE user_id=${userId}`;
  await page.reload();
  await expect(canvas).toBeVisible();
  await clearScene();
  await addDeathStar();
  await size.fill('3');
  await expect(cost).toContainText('Cost 400,000 / 400,000 credits');
  await save.click();
  await expect(page.getByText('1600 × 400 px · Saved', { exact: true })).toBeVisible();
  const full = (await editor()).battlefields[0];
  expect(full.scene.placements).toHaveLength(1);
  expect(full.scene.placements[0].itemId).toBe('station-death-star');
  expect(full.scene.placements[0].scale).toBe(3);
  expect(battlefieldCost(full.scene)).toBe(400000);
  const tooLarge = await context.request.patch(origin + '/api/battlefields/' + full.id, {
    headers,
    data: {
      name: full.name,
      revision: full.revision,
      scene: { ...full.scene, placements: [{ ...full.scene.placements[0], scale: 3.05 }] },
    },
  });
  expect(tooLarge.status()).toBe(400);
  const publicResponse = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  expect(publicResponse.status()).toBe(200);
  expect((await publicResponse.json()).data.scene).toEqual(publicBattlefieldScene(full.scene));
  await page.reload();
  await expect(canvas).toBeVisible();
  const deathStar = canvas.getByRole('button', { name: 'Select Death Star', exact: true });
  await deathStar.focus();
  await page.keyboard.press('Enter');
  await expect(size).toHaveValue('3');
  expect((await editor()).battlefields[0].scene).toEqual(full.scene);
  // A large hull still allows Escape and selecting obscured ships through layers.
  await page.getByLabel('Battlefield editing area', { exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(deathStar).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Battlefield objects', exact: true });
  await picker.getByRole('button', { name: 'Ships', exact: true }).click();
  await picker.getByLabel('Search objects').fill('X-wing');
  await picker.getByRole('button', { name: 'Add X-wing', exact: true }).click();
  await page.getByRole('button', { name: 'To back', exact: true }).click();
  await page.getByRole('button', { name: 'Select object Death Star', exact: true }).click();
  await page.getByRole('button', { name: 'Select object X-wing', exact: true }).click();
  await expect(canvas.getByRole('button', { name: 'Select X-wing', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(size).toHaveAttribute('max', '1');
  await page.reload(); // Discard the temporary unsaved escort.
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Select object Death Star', exact: true }).click();
  await expect(size).toHaveValue('3');
  await page.getByLabel('Object color', { exact: true }).selectOption('color-gold');
  await expect(cost).toContainText('Cost 400,400 / 400,000 credits');
  await expect(save).toBeDisabled();
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + full.id, {
        headers,
        data: {
          name: full.name,
          revision: full.revision,
          scene: {
            ...full.scene,
            placements: [{ ...full.scene.placements[0], colorId: 'color-gold' }],
          },
        },
      })
    ).status(),
  ).toBe(400);
  await page.getByLabel('Object color', { exact: true }).selectOption('color-default');
  await size.fill('0.5');
  await expect(cost).toContainText('Cost 200,000 / 400,000 credits');
  await save.click();
  await expect(page.getByText('1600 × 400 px · Saved', { exact: true })).toBeVisible();
  const small = (await editor()).battlefields[0];
  expect(small.scene.placements[0].scale).toBe(0.5);
  expect(battlefieldCost(small.scene)).toBe(200000);
  // Both site themes and narrow layouts retain a round, clipped model.
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => localStorage.setItem('vite-ui-theme', theme), theme);
    await page.reload();
    await expect(canvas).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    for (const width of [2200, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const body = await canvas.locator('circle[r="50"][stroke]').boundingBox();
      expect(body!.width / body!.height).toBeCloseTo(1, 2);
    }
  }
  expect((await editor()).balance).toBe(400000);
  expect(await sql`SELECT source FROM user_credits WHERE user_id=${userId}`).toHaveLength(1);
  expect(errors).toEqual([]);
  console.log(
    'PASS: Death Star picker/round previews, native 240px size, 300% slider, 200k base/400k maximum area pricing, over-budget and oversize editor/API rejection, maximum-size save/reload/public profile, shrinking, themes/mobile, and credits remaining unspent.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
