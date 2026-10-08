// BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield.browser.ts
// Real HTTP/UI operations, synthetic users only. Fixtures are removed in finally.
import { chromium, expect as baseExpect, type Locator } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { battlefieldCost } from '../../shared/battlefield/cost.ts';
import { battlefieldDrawOrder, publicBattlefieldScene } from '../../shared/battlefield/layers.ts';
import type { BattlefieldEditorData } from '../../shared/types/battlefield.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.BATTLEFIELD_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly select an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required.');
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 2, onnotice: () => {} });
const userId = 'battlefield-browser-' + crypto.randomUUID(),
  token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  hasTouch: true,
});
const anonymous = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors: string[] = [];
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
page.on('pageerror', error => errors.push(error.message));
let acceptDialog = false;
page.on('dialog', dialog => void (acceptDialog ? dialog.accept() : dialog.dismiss()));
const screenshots = new URL('../../.swubase/battlefield-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const headers = { 'X-Requested-With': 'swubase' };
async function editor(): Promise<BattlefieldEditorData> {
  const response = await context.request.get(origin + '/api/battlefields');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
const objects = page.getByRole('dialog', { name: 'Battlefield objects', exact: true });
const canvas = page.getByRole('group', { name: 'Battlefield canvas' });
const saveButton = page.getByRole('button', { name: 'Save battlefield', exact: true });
const lightHandle = page.getByRole('button', { name: 'Move main light', exact: true });
const lightingButton = page.getByRole('button', { name: 'Lighting', exact: true });
async function editLighting() {
  if ((await lightingButton.getAttribute('aria-pressed')) !== 'true') await lightingButton.click();
}
async function draftLight() {
  return lightHandle.evaluate(el => {
    const [x, y] = el.getAttribute('data-battlefield-light')!.split(' ').map(Number);
    return { x, y };
  });
}
async function dragLight(dx: number, dy: number, cancel = false, wheel = false) {
  await lightHandle.scrollIntoViewIfNeeded();
  const handle = await lightHandle.boundingBox();
  const width = (await canvas.boundingBox())!.width;
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  if (wheel) {
    await page.mouse.wheel(0, -120);
    expect((await canvas.boundingBox())!.width).toBeCloseTo(width, 2);
  }
  await page.mouse.move(handle!.x + handle!.width / 2 + dx, handle!.y + handle!.height / 2 + dy, {
    steps: 10,
  });
  if (cancel) await lightHandle.dispatchEvent('pointercancel', { pointerId: 1, bubbles: true });
  await page.mouse.up();
  return width;
}
async function choose(name: string, kind: 'Add' | 'Apply' = 'Add') {
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(objects).toBeVisible();
  await objects.getByLabel('Search objects').fill(name);
  await objects.getByRole('button', { name: kind + ' ' + name, exact: true }).click();
  await expect(objects).toBeHidden();
  await expect(canvas).toBeVisible();
}
async function select(name: string) {
  const object = page.getByRole('button', { name: 'Select ' + name, exact: true });
  await object.focus();
  await page.keyboard.press('Enter');
}
async function dragSlider(
  name: string,
  from: number,
  to: number,
  returnTo?: number,
  whileDragging?: () => Promise<void>,
) {
  const slider = page.getByRole('slider', { name, exact: true });
  const bounds = await slider.boundingBox();
  const limits = await slider.evaluate(el => ({
    min: Number((el as HTMLInputElement).min),
    max: Number((el as HTMLInputElement).max),
  }));
  const x = (value: number) =>
    bounds!.x + 8 + ((value - limits.min) / (limits.max - limits.min)) * (bounds!.width - 16);
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x(from), y);
  await page.mouse.down();
  // Many input events reproduce the old per-tick Undo entries and edge drift.
  await page.mouse.move(x(limits.min), y, { steps: 35 });
  await page.mouse.move(x(to), y, { steps: 80 });
  if (whileDragging) await whileDragging();
  if (returnTo !== undefined) await slider.fill(String(returnTo));
  await page.mouse.up();
}
async function reorder(handle: Locator, target: Locator, fraction = 0.2) {
  await target.scrollIntoViewIfNeeded();
  const source = await handle.boundingBox(),
    destination = await target.boundingBox();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination!.x + destination!.width / 2,
    destination!.y + destination!.height * fraction,
    { steps: 10 },
  );
  await page.mouse.up();
}
async function savedDraft() {
  await expect(page.getByText('1600 × 400 px · Saved', { exact: true })).toBeVisible();
  await expect(saveButton).toBeDisabled();
}
async function save() {
  await saveButton.click();
  await savedDraft();
}
async function cursorZoom(deltaY: number, x = 0.72, y = 0.35) {
  const viewport = await page.getByLabel('Battlefield viewport', { exact: true }).boundingBox();
  const cursor = { x: viewport!.x + viewport!.width * x, y: viewport!.y + viewport!.height * y };
  const original = await canvas.evaluate((el, cursor) => {
    const point = new DOMPoint(cursor.x, cursor.y).matrixTransform(
      (el as SVGSVGElement).getScreenCTM()!.inverse(),
    );
    return { x: point.x, y: point.y };
  }, cursor);
  const before = (await canvas.boundingBox())!.width;
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.wheel(0, deltaY);
  if (deltaY < 0)
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(before);
  else await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThan(before);
  await expect
    .poll(() =>
      canvas.evaluate(
        (el, { original, cursor }) => {
          const point = new DOMPoint(original.x, original.y).matrixTransform(
            (el as SVGSVGElement).getScreenCTM()!,
          );
          return Math.hypot(point.x - cursor.x, point.y - cursor.y);
        },
        { original, cursor },
      ),
    )
    .toBeLessThan(1.1);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  return { original, cursor };
}
async function fullProfileFrame(profilePage: typeof page) {
  const cover = profilePage.locator('svg[viewBox="0 0 1600 400"]').first();
  await expect(cover).toBeVisible();
  await expect(async () => {
    // Query the current node: profile refetches may replace the header with a skeleton.
    const frame = await profilePage.evaluate(() => {
      const el = document.querySelector<SVGSVGElement>('svg[viewBox="0 0 1600 400"]');
      const bounds = el?.parentElement?.getBoundingClientRect();
      const transform = el?.getScreenCTM();
      if (!bounds || !transform) return null;
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        ratio: bounds.width / bounds.height,
        corners: [
          [0, 0],
          [1600, 0],
          [0, 400],
          [1600, 400],
        ].map(([x, y]) => {
          const point = new DOMPoint(x, y).matrixTransform(transform);
          return { x: point.x, y: point.y };
        }),
      };
    });
    expect(frame, 'The current profile Battlefield must be mounted.').not.toBeNull();
    if (!frame) return;
    expect(frame.ratio).toBeCloseTo(4, 2);
    for (const corner of frame.corners) {
      expect(corner.x).toBeGreaterThanOrEqual(frame.left - 0.75);
      expect(corner.x).toBeLessThanOrEqual(frame.right + 0.75);
      expect(corner.y).toBeGreaterThanOrEqual(frame.top - 0.75);
      expect(corner.y).toBeLessThanOrEqual(frame.bottom + 0.75);
    }
  }).toPass({ timeout: 20000 });
}
try {
  await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${userId},'Battlefield fixture',${userId},${userId + '@invalid.local'},false,'USD','user',now(),now())`;
  await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${userId},now()+interval '1 hour',now(),now())`;
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},200000,'battlefield-browser',${crypto.randomUUID()})`;
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (await serializeSignedCookie(name, token, process.env.BETTER_AUTH_SECRET!)).split(
    ';',
  )[0];
  await context.addCookies([
    {
      name,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  expect((await anonymous.request.get(origin + '/api/battlefields')).status()).toBe(401);
  expect(
    (
      await context.request.post(origin + '/api/battlefields/purchase', {
        headers,
        data: { itemId: 'ship-tie', requestId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(404);
  const anonPage = await anonymous.newPage();
  await anonPage.goto(origin + '/battlefield');
  await expect(anonPage.getByText('You must be logged in to view this page.')).toBeVisible();
  await page.addInitScript(() =>
    sessionStorage.setItem('swubase:battlefield:purchase:obsolete:ship-tie', 'obsolete'),
  );
  await page.goto(origin + '/users/' + userId);
  await fullProfileFrame(page); // The starter header also fits its complete 4:1 scene.
  await page.getByRole('button', { name: 'Battlefield', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Battlefield editor', exact: true }).click();
  // The empty-state preview reflects whether the starter's area cost fits.
  await sql`UPDATE user_credits SET amount=3609 WHERE user_id=${userId}`;
  await page.reload();
  const initialPreview = page.getByRole('img', { name: 'Battlefield preview', exact: true });
  await expect(initialPreview).toBeVisible();
  await expect(initialPreview.locator('circle[r="50"][fill]')).toHaveCount(0);
  await sql`UPDATE user_credits SET amount=200000 WHERE user_id=${userId}`;
  await page.reload();
  await expect(initialPreview.locator('circle[r="50"][fill]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create battlefield', exact: true }).click();
  await expect(canvas).toBeVisible();
  // The site sidebar closes on entry and restores its previous state on exit.
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Battlefield', exact: true })).toBeVisible();
  await expect(
    page.locator('[data-sidebar="sidebar"]').first().locator('xpath=../..'),
  ).toHaveAttribute('data-state', 'expanded');
  await page.goForward();
  await expect(canvas).toBeVisible();
  console.log('Checking named capital ships, per-scene budget, shrink controls and persistence.');
  const starter = (await editor()).battlefields[0];
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  const capitalShips = [
    'Tantive IV',
    'Lightmaker',
    'Liberty',
    'Redemption',
    'Profundity',
    'Resolute',
    'Tranquility',
    'Raddus',
    'Avenger',
    'Devastator',
    'Relentless',
    'Corvus',
    'Gideon’s Light Cruiser',
    'Finalizer',
    'The Invisible Hand',
    'Malevolence',
  ];
  for (const name of capitalShips) {
    await choose(name);
    await expect(page.getByRole('slider', { name: 'Object size', exact: true })).toHaveAttribute(
      'max',
      '1',
    );
    await expect(canvas.getByRole('button', { name: 'Select ' + name, exact: true })).toBeVisible();
  }
  await select('Liberty');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('0.5');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 189,300',
  );
  await choose('Starlight gold', 'Apply');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 189,700',
  );
  await save();
  const fleet = (await editor()).battlefields[0];
  expect(fleet.scene.placements).toHaveLength(capitalShips.length);
  expect(fleet.scene.placements.find(p => p.itemId === 'ship-liberty')!.scale).toBe(0.5);
  expect(fleet.scene.placements.find(p => p.itemId === 'ship-liberty')!.colorId).toBe('color-gold');
  expect((await editor()).balance).toBe(200000);
  await page.reload();
  await expect(canvas).toBeVisible();
  expect((await editor()).battlefields[0].scene).toEqual(fleet.scene);
  const publicFleet = await anonymous.request.get(origin + '/api/user/' + userId + '/battlefield');
  expect(publicFleet.status()).toBe(200);
  expect((await publicFleet.json()).data.scene).toEqual(publicBattlefieldScene(fleet.scene));
  // Restore the starter before the existing editor interaction checks.
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + starter.id, {
        headers,
        data: { name: starter.name, revision: fleet.revision, scene: starter.scene },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(canvas).toBeVisible();
  // Reproduce the previously stretched thumbnails and ineffective wide-screen zoom.
  await page.setViewportSize({ width: 2200, height: 1100 });
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Planet');
  const sphere = await objects
    .getByRole('button', { name: 'Add Planet', exact: true })
    .locator('circle[r="50"][fill]')
    .boundingBox();
  await page.keyboard.press('Escape');
  const fitBox = await canvas.boundingBox();
  const editorBox = await page
    .getByRole('region', { name: 'Battlefield editor', exact: true })
    .boundingBox();
  expect(editorBox!.width).toBeGreaterThan(2000);
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  const zoomBox = await canvas.boundingBox();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  expect(sphere!.width / sphere!.height).toBeCloseTo(1, 2);
  expect(zoomBox!.width).toBeGreaterThan(fitBox!.width * 1.4);
  console.log('Checking pointer-anchored wheel zoom, rapid events, limits and native panning.');
  await cursorZoom(-2); // Tiny trackpad input must enlarge the artwork, even with scrollbars.
  await cursorZoom(-240);
  await cursorZoom(-120, 0.3, 0.6);
  const rapidAnchor = await cursorZoom(60, 0.45, 0.4);
  const beforeRapid = (await canvas.boundingBox())!.width;
  await canvas.evaluate((el, { cursor }) => {
    for (let i = 0; i < 4; i++)
      el.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -50,
          clientX: cursor.x,
          clientY: cursor.y,
        }),
      );
  }, rapidAnchor);
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(beforeRapid * 1.2);
  await expect
    .poll(() =>
      canvas.evaluate((el, { original, cursor }) => {
        const point = new DOMPoint(original.x, original.y).matrixTransform(
          (el as SVGSVGElement).getScreenCTM()!,
        );
        return Math.hypot(point.x - cursor.x, point.y - cursor.y);
      }, rapidAnchor),
    )
    .toBeLessThan(1.1);
  await cursorZoom(-10000, 0.5, 0.5);
  await expect(page.getByRole('button', { name: 'Fit', exact: true })).toContainText('400%');
  const maximumWidth = (await canvas.boundingBox())!.width;
  await page.mouse.wheel(0, -240);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  const wheelViewport = page.getByLabel('Battlefield viewport', { exact: true });
  const beforeWheelPan = await wheelViewport.evaluate(el => el.scrollLeft);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 120);
  await page.keyboard.up('Shift');
  await expect
    .poll(() => wheelViewport.evaluate(el => el.scrollLeft))
    .toBeGreaterThan(beforeWheelPan);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  console.log('Checking middle-button panning, capture outside the viewport and cancellation.');
  const panBounds = (await wheelViewport.boundingBox())!;
  const panStart = { x: panBounds.x + panBounds.width / 2, y: panBounds.y + panBounds.height / 2 };
  const panScroll = await wheelViewport.evaluate(el => ({
    left: el.scrollLeft,
    top: el.scrollTop,
    maxTop: el.scrollHeight - el.clientHeight,
  }));
  const selectedBeforePan = await canvas.getByRole('button', { pressed: true }).count();
  const sceneBeforePan = (await editor()).battlefields[0];
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down({ button: 'middle' });
  await expect
    .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
    .toBe('grabbing');
  await page.mouse.wheel(0, 120); // Zoom is suspended while the view is being dragged.
  await page.mouse.move(panStart.x + 80, panStart.y - 35, { steps: 5 });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(panScroll.left - 80, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(panScroll.top + 35, 0);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  const outsidePan = { x: panStart.x + 10, y: panBounds.y - 10 };
  await page.mouse.move(outsidePan.x, outsidePan.y, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(panScroll.left - 10, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(
    Math.min(panScroll.maxTop, panScroll.top + panStart.y - outsidePan.y),
    0,
  );
  await expect
    .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
    .not.toBe('grabbing');
  for (const end of ['pointercancel', 'lostpointercapture', 'blur']) {
    await wheelViewport.evaluate(el =>
      el.addEventListener(
        'pointerdown',
        event => {
          el.dataset.panPointerId = String((event as PointerEvent).pointerId);
        },
        { once: true, capture: true },
      ),
    );
    await page.mouse.move(panStart.x, panStart.y);
    await page.mouse.down({ button: 'middle' });
    await expect
      .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
      .toBe('grabbing');
    // Activate capture with a real move before simulating its loss.
    await page.mouse.move(panStart.x + 2, panStart.y - 2);
    const stoppedScroll = await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]);
    await wheelViewport.evaluate((el, end) => {
      const pointerId = Number(el.dataset.panPointerId);
      if (end === 'blur') window.dispatchEvent(new Event('blur'));
      else if (end === 'lostpointercapture') el.releasePointerCapture(pointerId);
      else el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId }));
      delete el.dataset.panPointerId;
    }, end);
    await page.mouse.move(panStart.x + 12, panStart.y - 12);
    await page.mouse.up({ button: 'middle' });
    await expect
      .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
      .not.toBe('grabbing');
    expect(
      await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]),
      'Panning should stop after ' + end,
    ).toEqual(stoppedScroll);
  }
  expect(await canvas.getByRole('button', { pressed: true }).count()).toBe(selectedBeforePan);
  expect((await editor()).battlefields[0]).toEqual(sceneBeforePan);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.mouse.wheel(0, 10000);
  await expect(page.getByRole('button', { name: 'Zoom', exact: true })).toContainText('100%');
  expect(await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(fitBox!.width, 2);
  await savedDraft(); // Camera changes do not create a layout edit or an Undo entry.
  await page.setViewportSize({ width: 1500, height: 1000 });
  expect((await editor()).limit).toBe(1);
  await expect(
    page.locator('[data-sidebar="sidebar"]').first().locator('xpath=../..'),
  ).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByRole('tab', { name: 'Shop', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New battlefield', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some(k => k.startsWith('swubase:battlefield:purchase:')),
    ),
  ).toBe(false);
  console.log('Checking Separatist ships, shrinking ships, colors, cost and persistence.');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Separatist');
  for (const ship of ['Vulture droid', 'Invincible', 'Vuutun Palaa'])
    await expect(objects.getByRole('button', { name: 'Add ' + ship, exact: true })).toBeVisible();
  await page.screenshot({ path: screenshots + 'separatist-previews.png', fullPage: true });
  await page.keyboard.press('Escape');
  await choose('Vulture droid');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('0.2');
  const smallShip = page.getByRole('button', { name: 'Select Vulture droid', exact: true });
  const hitTarget = smallShip.locator('[data-object-hit-target]');
  for (const enlarged of [false, true]) {
    if (enlarged) await page.getByRole('button', { name: 'Zoom', exact: true }).click();
    await smallShip.scrollIntoViewIfNeeded();
    const bounds = (await hitTarget.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(23.9);
    expect(bounds.height).toBeGreaterThanOrEqual(23.9);
    const editingArea = page.getByLabel('Battlefield editing area', { exact: true });
    await editingArea.focus();
    await page.keyboard.press('Escape');
    await page.mouse.click(bounds.x + bounds.width / 2 + 9, bounds.y + bounds.height / 2);
    await expect(smallShip).toHaveAttribute('aria-pressed', 'true');
    const outline = (await smallShip.locator('[data-selection-outline]').boundingBox())!;
    expect(outline.width).toBeGreaterThanOrEqual(11.9);
    expect(outline.height).toBeGreaterThanOrEqual(11.9);
  }
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  for (const ship of ['Vulture droid', 'Vulture droid', 'Invincible', 'Vuutun Palaa']) {
    await choose(ship);
    await expect(page.getByRole('slider', { name: 'Object size', exact: true })).toHaveAttribute(
      'max',
      '1',
    );
  }
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 40,400');
  await choose('Ion blue', 'Apply');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 40,800');
  await save();
  const separatistScene = (await editor()).battlefields[0].scene;
  expect(separatistScene.placements.map(p => p.itemId)).toEqual([
    'ship-vulture',
    'ship-vulture',
    'ship-invincible',
    'ship-vuutun-palaa',
  ]);
  expect(separatistScene.placements.every(p => p.scale === 1)).toBe(true);
  await page.reload();
  await expect(canvas).toBeVisible();
  expect((await editor()).battlefields[0].scene).toEqual(separatistScene);
  await select('Invincible');
  const invincible = page.getByRole('button', { name: 'Select Invincible', exact: true });
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  await invincible.scrollIntoViewIfNeeded();
  const shipPanBox = (await invincible.boundingBox())!;
  const objectPanScroll = await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]);
  const objectPanTransform = await invincible.getAttribute('transform');
  const shipPanStart = {
    x: shipPanBox.x + shipPanBox.width / 2,
    y: shipPanBox.y + shipPanBox.height / 2,
  };
  await page.mouse.move(shipPanStart.x, shipPanStart.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(shipPanStart.x - 30, shipPanStart.y - 20, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(objectPanScroll[0] + 30, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(objectPanScroll[1] + 20, 0);
  await expect(invincible).toHaveAttribute('aria-pressed', 'true');
  await expect(invincible).toHaveCSS('cursor', 'move');
  expect(await invincible.getAttribute('transform')).toBe(objectPanTransform);
  await expect(saveButton).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.screenshot({ path: screenshots + 'separatist-fleet.png', fullPage: true });
  console.log('Checking transforms, sliders and zoom.');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  for (const ship of ['TIE fighter', 'TIE fighter', 'X-wing']) await choose(ship);
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 900');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await page.getByRole('slider', { name: 'Object rotation', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Rotate selection clockwise' }).click();
  await page.getByLabel('Battlefield editing area').focus();
  for (let step = 0; step < 12; step++) await page.keyboard.press('Shift+ArrowUp');
  await save();
  const groupButtons = page.getByRole('button', { name: /^Select (TIE fighter|X-wing)$/ });
  const beforeSliderTransforms = await groupButtons.evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('transform')),
  );
  await dragSlider('Object rotation', 45, 180, 45);
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  await dragSlider('Object rotation', 45, 180);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  // Holding an arrow key and leaving a slider each commit one gesture.
  const rotationSlider = page.getByRole('slider', { name: 'Object rotation', exact: true });
  for (const endByBlur of [false, true]) {
    await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
    await rotationSlider.focus();
    for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.down('ArrowRight');
    await expect(rotationSlider).toHaveValue('49');
    if (endByBlur) await page.keyboard.press('Tab');
    await page.keyboard.up('ArrowRight');
    await expect(saveButton).toBeEnabled();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(
      await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
    ).toEqual(beforeSliderTransforms);
    await expect(saveButton).toBeDisabled();
  }
  const savedFormation = (await editor()).battlefields[0].scene.placements;
  expect(savedFormation).toHaveLength(3);
  expect(new Set(savedFormation.map(p => p.id)).size).toBe(3);
  expect(new Set(savedFormation.map(p => p.layerId)).size).toBe(1);
  expect(savedFormation.every(p => p.rotation === 45)).toBe(true);
  await page.getByLabel('Battlefield editing area').focus();
  await page.keyboard.press('Escape');
  const fitDragCanvas = await canvas.boundingBox();
  const box = await page
    .getByRole('button', { name: 'Select TIE fighter', exact: true })
    .nth(0)
    .boundingBox();
  // Selection taps must tolerate normal pointer wobble at every canvas scale.
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 1, box!.y + box!.height / 2 + 1);
  await page.mouse.up();
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 45, box!.y + box!.height / 2 + 15, { steps: 8 });
  await page.mouse.up();
  await save();
  const moved = (await editor()).battlefields[0].scene.placements;
  expect(moved[0].x - savedFormation[0].x).toBeCloseTo((45 / fitDragCanvas!.width) * 1600, 4);
  expect(moved[0].y - savedFormation[0].y).toBeCloseTo((15 / fitDragCanvas!.width) * 1600, 4);
  for (let i = 1; i < moved.length; i++)
    expect(moved[i].x - savedFormation[i].x).toBeCloseTo(moved[0].x - savedFormation[0].x, 5);
  // Dragging at 200% uses the enlarged canvas's coordinate scale.
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  const zoomViewport = page.getByLabel('Battlefield viewport', { exact: true });
  await zoomViewport.evaluate(el => {
    el.scrollLeft = 80;
  });
  const zoomedCanvas = await canvas.boundingBox();
  const zoomedTie = page.getByRole('button', { name: 'Select TIE fighter', exact: true }).nth(0);
  await zoomedTie.scrollIntoViewIfNeeded();
  const zoomedShipBox = await zoomedTie.boundingBox();
  const beforeZoomDrag = (await editor()).battlefields[0].scene.placements[0];
  await page.mouse.move(
    zoomedShipBox!.x + zoomedShipBox!.width / 2,
    zoomedShipBox!.y + zoomedShipBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.wheel(0, -120);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(zoomedCanvas!.width, 2);
  await page.mouse.move(
    zoomedShipBox!.x + zoomedShipBox!.width / 2 + 30,
    zoomedShipBox!.y + zoomedShipBox!.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await save();
  const afterZoomDrag = (await editor()).battlefields[0].scene.placements[0];
  expect(afterZoomDrag.x - beforeZoomDrag.x).toBeCloseTo((30 / zoomedCanvas!.width) * 1600, 4);
  expect(afterZoomDrag.y).toBeCloseTo(beforeZoomDrag.y, 4);
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await choose('Rocky asteroid');
  await choose('Mining facility');
  await choose('Starlight gold', 'Apply');
  await choose('Violet nebula', 'Apply');
  await choose('Planet');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('ocean');
  await choose('Planetary city');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Ion cannon');
  const turretPreview = await objects
    .getByRole('button', { name: 'Add Ion cannon', exact: true })
    .locator('circle[r="9"]')
    .boundingBox();
  expect(turretPreview!.width).toBeGreaterThan(12);
  await objects.getByLabel('Search objects').fill('');
  await objects.getByRole('button', { name: 'Add-ons', exact: true }).click();
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'addons-details.png', fullPage: true });
  await objects.getByRole('button', { name: 'All', exact: true }).click();
  await page.keyboard.press('Escape');
  await choose('Ion cannon');
  await choose('Starlight gold', 'Apply');
  const controls = page.getByRole('complementary', { name: 'Object controls' });
  const textureUrls = await canvas
    .locator('image')
    .evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')!))]);
  expect(textureUrls.length).toBeGreaterThan(0);
  for (const url of textureUrls) {
    const response = await context.request.get(new URL(url, origin).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/png\b/);
    expect(
      (await response.body()).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe(true);
  }
  await expect(controls.getByRole('checkbox')).toHaveCount(0);
  await select('Planet');
  await expect(controls.getByText('Planet', { exact: true })).toBeVisible();
  await controls.getByRole('slider', { name: 'Object size', exact: true }).fill('1.5');
  await controls.getByRole('slider', { name: 'Object rotation', exact: true }).fill('90');
  await controls.getByRole('slider', { name: 'Object rotation', exact: true }).press('ArrowRight');
  for (const item of ['Executor', 'Home One', 'Chimaera', 'Orbital station']) await choose(item);
  await save();
  let saved = (await editor()).battlefields[0];
  expect(battlefieldCost(saved.scene)).toBe(100150);
  expect((await editor()).balance).toBe(200000);
  const ocean = saved.scene.placements.find(p => p.itemId === 'planet')!;
  expect(ocean.scale).toBe(1.5);
  expect(ocean.rotation).toBe(91);
  expect(ocean.textureId).toBe('ocean');
  // A surface-only change is a dirty draft and survives saving/reloading.
  await select('Planet');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('desert');
  await expect(saveButton).toBeEnabled();
  expect(
    (await editor()).battlefields[0].scene.placements.find(p => p.id === ocean.id)!.textureId,
  ).toBe('ocean');
  await save();
  await page.reload();
  expect(
    (await editor()).battlefields[0].scene.placements.find(p => p.id === ocean.id)!.textureId,
  ).toBe('desert');
  await select('Planet');
  await expect(page.getByLabel('Planet surface', { exact: true })).toHaveValue('desert');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('ocean');
  await save();
  saved = (await editor()).battlefields[0];
  for (const name of ['Executor', 'Home One', 'Chimaera']) {
    const shipButton = page.getByRole('button', { name: 'Select ' + name, exact: true }).first();
    await shipButton.focus();
    await page.keyboard.press('Enter');
    const shipSize = page.getByRole('slider', { name: 'Object size', exact: true });
    await expect(shipSize).toHaveAttribute('min', '0.2');
    await expect(shipSize).toHaveAttribute('max', '1');
    await shipSize.fill('0.5');
    await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
      'Cost 100,150',
    );
    await expect(shipButton).toHaveAttribute('transform', /scale\(0\.5\)/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(shipButton).toHaveAttribute('transform', /scale\(1\)/);
  }
  for (const scale of [1.05, 2]) {
    const response = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
      headers,
      data: {
        name: saved.name,
        revision: saved.revision,
        scene: {
          ...saved.scene,
          placements: saved.scene.placements.map((p, i) => (i === 0 ? { ...p, scale } : p)),
        },
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).message).toContain('20–100%');
  }
  const reduced = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
    headers,
    data: {
      name: saved.name,
      revision: saved.revision,
      scene: {
        ...saved.scene,
        placements: saved.scene.placements.map((p, i) => (i === 0 ? { ...p, scale: 0.5 } : p)),
      },
    },
  });
  expect(reduced.status()).toBe(200);
  const reducedSaved = (await reduced.json()).data;
  expect(reducedSaved.scene.placements[0].scale).toBe(0.5);
  expect(battlefieldCost(reducedSaved.scene)).toBe(battlefieldCost(saved.scene));
  const restored = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
    headers,
    data: { name: saved.name, revision: reducedSaved.revision, scene: saved.scene },
  });
  expect(restored.status()).toBe(200);
  saved = (await restored.json()).data;
  await page.reload();
  await select('Chimaera');
  // The main row contains name, cost, background and save; selection controls
  // stay in the left column without an extra Customize button.
  const sidebarBox = await controls.boundingBox(),
    fieldBox = await canvas.boundingBox();
  expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(fieldBox!.x + 1);
  const objectsButton = page.getByRole('button', { name: 'Objects', exact: true });
  const objectsButtonBox = await objectsButton.boundingBox();
  expect(objectsButtonBox!.x).toBeGreaterThanOrEqual(sidebarBox!.x);
  expect(objectsButtonBox!.x + objectsButtonBox!.width).toBeLessThanOrEqual(
    sidebarBox!.x + sidebarBox!.width,
  );
  expect(objectsButtonBox!.y).toBeLessThan(sidebarBox!.y);
  await expect(controls.getByLabel('Background', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Customize', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to profile' })).toHaveCount(0);
  const nameBox = await page.getByLabel('Battlefield name').boundingBox();
  const costBox = await page
    .getByRole('status', { name: 'Battlefield cost', exact: true })
    .boundingBox();
  const backgroundBox = await page.getByLabel('Background', { exact: true }).boundingBox();
  expect(Math.abs(costBox!.y - nameBox!.y)).toBeLessThan(20);
  expect(backgroundBox!.y).toBeLessThan(fieldBox!.y);
  const titleBox = await page
    .getByRole('heading', { name: 'Battlefield', exact: true })
    .boundingBox();
  const subtitleBox = await page
    .getByText('Build your galaxy. Each Battlefield can use your full credit budget.', {
      exact: true,
    })
    .boundingBox();
  expect(Math.abs(titleBox!.y - subtitleBox!.y)).toBeLessThan(12);
  // Shift-deselecting an object must never drag the remaining selection.
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  const beforeDeselect = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')));
  const oceanButton = page.getByRole('button', { name: 'Select Planet', exact: true });
  // Overlapping ships can cover the planet's center; use a visible part of it.
  const deselectPoint = await oceanButton.evaluate(el => {
    const bounds = el.getBoundingClientRect();
    for (let row = 1; row < 10; row++)
      for (let column = 1; column < 10; column++) {
        const x = bounds.x + (bounds.width * column) / 10,
          y = bounds.y + (bounds.height * row) / 10;
        if (document.elementFromPoint(x, y)?.closest('[data-placement-id]') === el) return { x, y };
      }
    return null;
  });
  expect(deselectPoint).not.toBeNull();
  await page.keyboard.down('Shift');
  await page.mouse.move(deselectPoint!.x, deselectPoint!.y);
  await page.mouse.down();
  await page.mouse.move(deselectPoint!.x + 10, deselectPoint!.y);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(oceanButton).toHaveAttribute('aria-pressed', 'false');
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeDeselect);
  await expect(saveButton).toBeDisabled();
  await select('Planet');
  const oceanTransform = await oceanButton.getAttribute('transform');
  const sizeSlider = page.getByRole('slider', { name: 'Object size', exact: true });
  const totalCost = page.getByRole('status', { name: 'Battlefield cost', exact: true });
  await sizeSlider.fill('2');
  await expect(totalCost).toContainText('Cost 101,900');
  await sizeSlider.fill('0.5');
  await expect(totalCost).toContainText('Cost 98,900');
  await sizeSlider.fill('1.5');
  await expect(totalCost).toContainText('Cost 100,150');
  await expect(saveButton).toBeDisabled();
  await dragSlider('Object size', 1.5, 3, undefined, async () => {
    await expect(totalCost).toContainText('Cost 106,900');
    await expect(controls.getByText(/Object cost: 9,000 credits/)).toBeVisible();
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(oceanButton).toHaveAttribute('transform', oceanTransform!);
  await expect(saveButton).toBeDisabled();
  await select('Planet');
  // Add-ons are independent objects: multiple copies, free movement and per-copy cost.
  console.log('Checking independent add-ons and layers.');
  await choose('Planetary city');
  await expect(totalCost).toContainText('Cost 101,350');
  const addedCity = canvas
    .getByRole('button', { name: 'Select Planetary city', exact: true })
    .last();
  const cityBefore = await addedCity.getAttribute('transform');
  const cityBox = await addedCity.boundingBox();
  await page.mouse.move(cityBox!.x + cityBox!.width / 2, cityBox!.y + cityBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    cityBox!.x + cityBox!.width / 2 + 15,
    cityBox!.y + cityBox!.height / 2 + 10,
    { steps: 6 },
  );
  await page.mouse.up();
  expect(await addedCity.getAttribute('transform')).not.toBe(cityBefore);
  await save();
  let layerScene = (await editor()).battlefields[0].scene;
  expect(layerScene.placements.filter(p => p.itemId === 'addon-city')).toHaveLength(2);
  expect(layerScene.placements.every(p => !('addonIds' in p) && !('groupId' in p))).toBe(true);
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await expect(
    canvas.getByRole('button', { name: 'Select Planetary city', exact: true }),
  ).toHaveCount(1);
  await save();
  const layersPanel = page.getByRole('complementary', { name: 'Battlefield layers' });
  const layersBox = await layersPanel.boundingBox();
  expect(layersBox!.x + layersBox!.width).toBeLessThanOrEqual(sidebarBox!.x + 1);
  const row = (id: string) => layersPanel.locator('[data-row-id="' + id + '"]');
  layerScene = (await editor()).battlefields[0].scene;
  const firstTie = layerScene.placements.find(p => p.itemId === 'ship-tie')!;
  const xWing = layerScene.placements.find(p => p.itemId === 'ship-x-wing')!;
  const originalStack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await reorder(
    row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true }),
    row(xWing.id),
  );
  let stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.indexOf(firstTie.id)).toBeGreaterThan(stack.indexOf(xWing.id));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).toEqual(originalStack);
  await expect(saveButton).toBeDisabled();
  // Drag handles offer the same ordering with the keyboard.
  await row(firstTie.id)
    .getByRole('button', { name: 'Drag TIE fighter', exact: true })
    .press('ArrowUp');
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.indexOf(firstTie.id)).toBe(originalStack.indexOf(firstTie.id) + 1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Long stacks scroll while a drag is held near an edge.
  await page.setViewportSize({ width: 1500, height: 650 });
  const stackList = layersPanel.getByLabel('Layers stack', { exact: true });
  const tieHandle = row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true });
  await tieHandle.scrollIntoViewIfNeeded();
  expect(await stackList.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const handleBox = await tieHandle.boundingBox(),
    scrollBounds = await stackList.boundingBox();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(scrollBounds!.x + 20, scrollBounds!.y + 5, { steps: 8 });
  await expect.poll(() => stackList.evaluate(el => el.scrollTop)).toBe(0);
  const fleetHeader = await row(firstTie.layerId).boundingBox();
  await page.mouse.move(
    fleetHeader!.x + fleetHeader!.width / 2,
    fleetHeader!.y + fleetHeader!.height / 2,
  );
  await page.mouse.up();
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.at(-1)).toBe(firstTie.id);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(saveButton).toBeDisabled();
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByRole('button', { name: 'Create layer', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 3', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Rebel fleet');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  const rebelRow = layersPanel
    .locator('[data-row-kind="layer"]')
    .filter({ has: page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }) });
  await reorder(
    row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true }),
    rebelRow,
    0.5,
  );
  await save();
  layerScene = (await editor()).battlefields[0].scene;
  const rebelLayer = layerScene.layers.find(layer => layer.name === 'Rebel fleet')!;
  expect(layerScene.placements.find(p => p.id === firstTie.id)!.layerId).toBe(rebelLayer.id);
  expect(battlefieldDrawOrder(layerScene).at(-1)!.id).toBe(firstTie.id);
  // Layer ordering is itself draggable and changes the canvas stack.
  const fleetRow = row(firstTie.layerId);
  await reorder(
    page.getByRole('button', { name: 'Drag layer Rebel fleet', exact: true }),
    fleetRow,
    0.8,
  );
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack[0]).toBe(firstTie.id);
  await save();
  // Create a deep tree, nest by dragging, and move it back out without changing geometry.
  console.log('Checking nested layers, ancestor visibility, save/reload and cycle rejection.');
  const baselineTree = (await editor()).battlefields[0];
  const baselineGeometry = new Map(
    baselineTree.scene.placements.map(p => [p.id, [p.x, p.y, p.rotation]]),
  );
  const tieTransform = await canvas
    .locator('[data-placement-id="' + firstTie.id + '"]')
    .getAttribute('transform');
  await page.getByRole('button', { name: 'Create sublayer in Rebel fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 4', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Strike wing');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  await row(firstTie.id)
    .getByRole('button', { name: 'Select object TIE fighter', exact: true })
    .click();
  await layersPanel
    .getByLabel('Selection layer', { exact: true })
    .selectOption({ label: '› › Strike wing' });
  await page.getByRole('button', { name: 'Create sublayer in Strike wing', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 5', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Scout squadron');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  await select('X-wing');
  await layersPanel
    .getByLabel('Selection layer', { exact: true })
    .selectOption({ label: '› › › Scout squadron' });
  await save();
  let nestedSaved = (await editor()).battlefields[0];
  let strike = nestedSaved.scene.layers.find(layer => layer.name === 'Strike wing')!;
  const scout = nestedSaved.scene.layers.find(layer => layer.name === 'Scout squadron')!;
  expect(strike.parentId).toBe(rebelLayer.id);
  expect(scout.parentId).toBe(strike.id);
  for (const p of nestedSaved.scene.placements)
    expect([p.x, p.y, p.rotation]).toEqual(baselineGeometry.get(p.id)!);
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(canvas.locator('[data-placement-id="' + xWing.id + '"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Rotate selection clockwise', exact: true }).click();
  expect(
    await canvas.locator('[data-placement-id="' + firstTie.id + '"]').getAttribute('transform'),
  ).not.toBe(tieTransform);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Collapse Rebel fleet', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select layer Scout squadron', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Rebel fleet', exact: true }).click();
  await row(xWing.id).getByRole('button', { name: 'Hide X-wing', exact: true }).click();
  await page.getByRole('button', { name: 'Hide layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(0);
  await expect(totalCost).toContainText('Cost 100,150');
  await save();
  const nestedPublic = (
    await (await anonymous.request.get(origin + '/api/user/' + userId + '/battlefield')).json()
  ).data.scene;
  expect(
    nestedPublic.placements.some((p: { id: string }) => p.id === firstTie.id || p.id === xWing.id),
  ).toBe(false);
  expect(JSON.stringify(nestedPublic)).not.toContain('Scout squadron');
  await page.reload();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(1);
  await expect(canvas.locator('[data-placement-id="' + xWing.id + '"]')).toHaveCount(0);
  await row(xWing.id).getByRole('button', { name: 'Show X-wing', exact: true }).click();
  await save();
  // Parent selectors exclude the whole descendant tree; impossible pointer drops are no-ops.
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  const parentChoices = await layersPanel
    .getByLabel('Layer parent', { exact: true })
    .locator('option')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('value')));
  expect(parentChoices).not.toContain(strike.id);
  expect(parentChoices).not.toContain(scout.id);
  await reorder(
    page.getByRole('button', { name: 'Drag layer Rebel fleet', exact: true }),
    row(scout.id),
    0.5,
  );
  await savedDraft();
  nestedSaved = (await editor()).battlefields[0];
  const cyclic = {
    ...nestedSaved.scene,
    layers: nestedSaved.scene.layers.map(layer =>
      layer.id === rebelLayer.id ? { ...layer, parentId: scout.id } : layer,
    ),
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + nestedSaved.id, {
        headers,
        data: { name: nestedSaved.name, revision: nestedSaved.revision, scene: cyclic },
      })
    ).status(),
  ).toBe(400);
  // A middle-row drop reparents a folder and all descendants, with one Undo step.
  await reorder(
    page.getByRole('button', { name: 'Drag layer Strike wing', exact: true }),
    fleetRow,
    0.5,
  );
  await save();
  nestedSaved = (await editor()).battlefields[0];
  strike = nestedSaved.scene.layers.find(layer => layer.id === strike.id)!;
  expect(strike.parentId).toBe(firstTie.layerId);
  expect(nestedSaved.scene.layers.find(layer => layer.id === scout.id)!.parentId).toBe(strike.id);
  await page.getByRole('button', { name: 'Select layer Strike wing', exact: true }).click();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption('');
  await save();
  expect(
    (await editor()).battlefields[0].scene.layers.find(layer => layer.id === strike.id)!.parentId,
  ).toBeNull();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption(rebelLayer.id);
  await save();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Select layer Scout squadron', exact: true }),
  ).toBeVisible();
  // Folder selection has a parent control; object relocation is separate so it cannot flatten the subtree.
  await page.getByRole('button', { name: 'Select layer Strike wing', exact: true }).click();
  await expect(layersPanel.getByLabel('Selection layer', { exact: true })).toHaveCount(0);
  const beforeWrap = (await editor()).battlefields[0].scene;
  const beforeWrapOrder = battlefieldDrawOrder(beforeWrap).map(p => p.id);
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await save();
  const wrapped = (await editor()).battlefields[0].scene;
  const wrapper = wrapped.layers.find(layer => layer.name === 'Layer 6')!;
  expect(wrapper.parentId).toBe(rebelLayer.id);
  expect(wrapped.layers.find(layer => layer.id === strike.id)!.parentId).toBe(wrapper.id);
  expect(wrapped.layers.find(layer => layer.id === scout.id)!.parentId).toBe(strike.id);
  expect(wrapped.placements).toEqual(beforeWrap.placements);
  expect(battlefieldDrawOrder(wrapped).map(p => p.id)).toEqual(beforeWrapOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await save();
  // Front/back moves the selected folder as one node, even beside direct objects.
  await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
  const beforeFolderOrder = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await page.getByRole('button', { name: 'To back', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).not.toEqual(beforeFolderOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  await page.getByRole('button', { name: 'To front', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).not.toEqual(beforeFolderOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  // Empty-folder hierarchy changes must still mark the layout dirty, even with identical artwork.
  await page
    .getByRole('button', { name: 'Create sublayer in Scout squadron', exact: true })
    .click();
  await save();
  await expect(page.getByRole('button', { name: 'To front', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'To back', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Layer from selection', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select layer Layer 7', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Select layer Layer 6', exact: true }).click();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption(firstTie.layerId);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.screenshot({ path: screenshots + 'nested-layers-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1500, height: 1000 });
  await row(firstTie.id)
    .getByRole('button', { name: 'Select object TIE fighter', exact: true })
    .click();
  await row(ocean.id)
    .getByRole('button', { name: 'Select object Planet', exact: true })
    .click({ modifiers: ['Shift'] });
  await row(ocean.id)
    .getByRole('button', { name: 'Select object Planet', exact: true })
    .click({ modifiers: ['Shift'] });
  const beforeObjectGroup = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).toEqual(beforeObjectGroup);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  // Restore the saved fixture so the existing visibility and full-budget checks remain independent.
  const beforeRestore = (await editor()).battlefields[0];
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + baselineTree.id, {
        headers,
        data: {
          name: baselineTree.name,
          revision: beforeRestore.revision,
          scene: baselineTree.scene,
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  // Object/layer eyes persist, and revealing a folder preserves hidden children.
  await row(ocean.id).getByRole('button', { name: 'Hide Planet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + ocean.id + '"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hide layer Layer 2', exact: true }).click();
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  for (const shortcut of [false, true]) {
    if (shortcut) {
      await page.getByLabel('Battlefield editing area').focus();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
    } else {
      await page.getByRole('button', { name: 'Select all', exact: true }).click();
      await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
    }
    await expect(canvas.locator('[data-placement-id]')).toHaveCount(0);
    await expect(layersPanel.locator('[data-row-kind="object"]')).toHaveCount(11);
    await expect(totalCost).toContainText('Cost 99,900');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  }
  await save();
  layerScene = (await editor()).battlefields[0].scene;
  expect(battlefieldCost(layerScene)).toBe(100150);
  await page.reload();
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  const visibleProfile = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  const publicScene = (await visibleProfile.json()).data.scene;
  expect(publicScene).toEqual(publicBattlefieldScene(layerScene));
  expect(publicScene.placements).toHaveLength(1);
  expect(JSON.stringify(publicScene)).not.toContain('Rebel fleet');
  expect(JSON.stringify(publicScene)).not.toContain('planet');
  await anonPage.goto(origin + '/users/' + userId);
  await expect(anonPage.locator('svg[aria-hidden="true"] circle[r="50"][fill]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show layer Layer 2', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + ocean.id + '"]')).toHaveCount(0);
  await row(ocean.id).getByRole('button', { name: 'Show Planet', exact: true }).click();
  await save();
  await select('Planet');
  await page.screenshot({ path: screenshots + 'editor-sidebar-wide.png', fullPage: true });
  // A catalog item retired since a previous save must leave an editable,
  // repairable draft instead of throwing from the cost counter.
  await page.route('**/api/battlefields', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const legacy = body.data.battlefields[0].scene;
    legacy.backgroundId = 'retired-background';
    legacy.placements.push({
      ...legacy.placements[0],
      id: crypto.randomUUID(),
      itemId: 'retired-ship',
    });
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('saved layout needs repair');
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Repair layout', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.unroute('**/api/battlefields');
  await save();
  // A duplicate legacy layer can have identical rendered artwork. Its repair
  // must still become a dirty, saveable draft rather than being ignored as a no-op.
  await page.route('**/api/battlefields', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    body.data.battlefields[0].scene.layers.push({ ...body.data.battlefields[0].scene.layers[0] });
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('unique ID');
  await page.getByRole('button', { name: 'Repair layout', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(saveButton).toBeEnabled();
  await page.unroute('**/api/battlefields');
  await save();
  await choose('Violet nebula', 'Apply');
  await save();
  saved = (await editor()).battlefields[0];
  expect(battlefieldCost(saved.scene)).toBe(100150);
  // The picker sits over the canvas and keeps the page in place. It scrolls
  // internally, supports search, keyboard dismissal and independent add-ons.
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const pickerBox = await objects.boundingBox(),
    canvasBox = await canvas.boundingBox();
  expect(pickerBox!.y).toBeLessThan(canvasBox!.y + canvasBox!.height);
  expect(pickerBox!.y + pickerBox!.height).toBeGreaterThan(canvasBox!.y);
  const beforeScroll = await page.evaluate(() => window.scrollY);
  await objects.getByLabel('Search objects').fill('not-in-the-galaxy');
  await expect(objects.getByText('No objects match your search.')).toBeVisible();
  await objects.getByLabel('Search objects').fill('');
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'objects-wide.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(objects).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  // A rejected network save keeps the draft and can be retried.
  await page.getByLabel('Battlefield name').fill('Imperial sector');
  await page.route('**/api/battlefields/' + saved.id, route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary save failure' }),
    }),
  );
  await saveButton.click();
  await expect(page.getByRole('alert')).toHaveText('Temporary save failure');
  await expect(page.getByLabel('Battlefield name')).toHaveValue('Imperial sector');
  await page.unroute('**/api/battlefields/' + saved.id);
  await save();
  // Preserve existing multi-tab conflict recovery.
  saved = (await editor()).battlefields[0];
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: 'Other tab', scene: saved.scene, revision: saved.revision },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel('Battlefield name').fill('My draft');
  await saveButton.click();
  await expect(page.getByRole('button', { name: 'Save my draft instead' })).toBeVisible();
  acceptDialog = true;
  await page.getByRole('button', { name: 'Save my draft instead' }).click();
  await savedDraft();
  acceptDialog = false;
  expect((await editor()).battlefields[0].name).toBe('My draft');
  // Remove, undo and redo release/reapply cost immediately.
  await select('Rocky asteroid');
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 99,850');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 100,150',
  );
  // Each future additional slot gets the same full budget.
  await sql`UPDATE user_profile SET battlefield_limit=2 WHERE user_id=${userId}`;
  await page.reload();
  await page.getByRole('button', { name: 'New battlefield', exact: true }).click();
  await expect(page.getByLabel('Choose Battlefield')).toBeVisible();
  await choose('Home One');
  await save();
  const two = await editor();
  expect(two.battlefields).toHaveLength(2);
  expect(two.balance).toBe(200000);
  await page.getByRole('button', { name: 'Use on profile', exact: true }).click();
  await expect(page.getByText('On your profile', { exact: true })).toBeVisible();
  const alternateId = two.battlefields.find(b => b.id !== saved.id)!.id;
  console.log('Checking the main light, gestures, history, zoom and profile shading.');
  const alternate = two.battlefields.find(b => b.id === alternateId)!;
  // Reproduce an object directly under the default light handle.
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + alternate.id, {
        headers,
        data: {
          name: alternate.name,
          revision: alternate.revision,
          scene: {
            ...alternate.scene,
            placements: alternate.scene.placements.map(p => ({ ...p, ...alternate.scene.light })),
          },
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload(); // Fresh history in the active alternate Battlefield.
  await expect(lightHandle).toBeVisible();
  await savedDraft();
  const lightingBase = (await editor()).battlefields.find(b => b.id === alternateId)!;
  const lightingBudget = await page.getByRole('status', { name: 'Battlefield cost' }).textContent();
  const beforeLighting = await canvas
    .locator('linearGradient[id$="-lighting"]')
    .evaluateAll(nodes => nodes.map(node => [node.getAttribute('x1'), node.getAttribute('y1')]));
  await expect(lightHandle).toHaveCSS('pointer-events', 'none');
  const overlapHandle = await lightHandle.boundingBox();
  await page.mouse.click(overlapHandle!.x + 18, overlapHandle!.y + 18);
  await expect(page.getByRole('button', { name: 'Select Home One', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(lightingButton).toHaveAttribute('aria-pressed', 'false');
  await lightingButton.click();
  await expect(lightHandle).toHaveCSS('pointer-events', 'auto');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Light X', exact: true })).toHaveValue('200');
  await expect(page.getByRole('slider', { name: 'Light Y', exact: true })).toHaveValue('60');
  await dragLight(1, 1); // Clicking with normal pointer wobble leaves the draft untouched.
  await savedDraft();
  await dragLight(55, 20, true);
  expect(await draftLight()).toEqual(lightingBase.scene.light);
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const lightFitWidth = await dragLight(55, 20, false, true);
  const fitLight = await draftLight();
  expect(fitLight.x - lightingBase.scene.light.x).toBeCloseTo((55 / lightFitWidth) * 1600, 4);
  expect(fitLight.y - lightingBase.scene.light.y).toBeCloseTo((20 / lightFitWidth) * 1600, 4);
  expect(
    await canvas
      .locator('linearGradient[id$="-lighting"]')
      .evaluateAll(nodes => nodes.map(node => [node.getAttribute('x1'), node.getAttribute('y1')])),
  ).not.toEqual(beforeLighting);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await draftLight()).toEqual(lightingBase.scene.light);
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await draftLight()).toEqual(fitLight);
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await save();
  let litScene = (await editor()).battlefields.find(b => b.id === alternateId)!.scene;
  expect(litScene.light).toEqual(fitLight);
  expect(litScene.placements).toEqual(lightingBase.scene.placements);
  expect(litScene.layers).toEqual(lightingBase.scene.layers);
  expect((await editor()).balance).toBe(200000);
  expect(await page.getByRole('status', { name: 'Battlefield cost' }).textContent()).toBe(
    lightingBudget,
  );
  await page.reload();
  await savedDraft();
  expect(await draftLight()).toEqual(fitLight);
  await editLighting();
  await dragSlider('Light X', fitLight.x, 1350);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await draftLight()).toEqual(fitLight);
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await lightingButton.click();
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toHaveCount(0);
  // The handle also remains keyboard accessible when pointer clicks pass through it.
  await lightHandle.focus();
  await page.keyboard.press('Enter');
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  const lightX = page.getByRole('slider', { name: 'Light X', exact: true });
  await lightX.fill('350');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('150');
  await save();
  const sliderLight = await draftLight();
  await lightHandle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowUp');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y - 1 });
  await page.keyboard.press('Control+z');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y });
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowUp');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y - 1 });
  await page.keyboard.press('Delete');
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  await save();
  await page.reload();
  const lightBeforeZoom = await draftLight();
  await editLighting();
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  expect((await lightHandle.boundingBox())!.width).toBe(36);
  const lightZoomWidth = await dragLight(30, 5, false, true);
  const zoomedLight = await draftLight();
  expect(zoomedLight.x - lightBeforeZoom.x).toBeCloseTo((30 / lightZoomWidth) * 1600, 4);
  expect(zoomedLight.y - lightBeforeZoom.y).toBeCloseTo((5 / lightZoomWidth) * 1600, 4);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  // Middle-button dragging the handle pans the camera without selecting or moving the source.
  await lightHandle.scrollIntoViewIfNeeded();
  const lightPanBox = await lightHandle.boundingBox();
  const lightPanView = page.getByLabel('Battlefield viewport', { exact: true });
  const scrollLightBefore = await lightPanView.evaluate(el => el.scrollLeft);
  await page.mouse.move(lightPanBox!.x + 18, lightPanBox!.y + 18);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(lightPanBox!.x - 22, lightPanBox!.y + 18, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  expect(await lightPanView.evaluate(el => el.scrollLeft)).toBeCloseTo(scrollLightBefore + 40, 0);
  expect(await draftLight()).toEqual(lightBeforeZoom);
  await savedDraft();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await editLighting();
  await lightX.fill('1600');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('400');
  await page.getByLabel('Battlefield editing area').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await draftLight()).toEqual({ x: 1600, y: 400 });
  expect(await lightPanView.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
  expect(await lightPanView.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(
    1,
  );
  await lightX.fill('1100');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('50');
  await save();
  await page.reload();
  litScene = (await editor()).battlefields.find(b => b.id === alternateId)!.scene;
  expect(litScene.light).toEqual({ x: 1100, y: 50 });
  expect(litScene.placements).toEqual(lightingBase.scene.placements);
  expect(battlefieldCost(litScene)).toBe(battlefieldCost(lightingBase.scene));
  await editLighting();
  await page.screenshot({ path: screenshots + 'lighting-editor.png', fullPage: true });
  await select('Home One');
  await expect(
    page.getByRole('complementary', { name: 'Object controls', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toHaveCount(0);
  const editorLightGradient = await canvas
    .locator('linearGradient[id$="-metal"]')
    .evaluateAll(nodes =>
      nodes.map(node => ['x1', 'x2', 'y1', 'y2'].map(key => node.getAttribute(key))),
    );
  // Reduced motion keeps the saved pose identical to the static editor.
  await anonPage.emulateMedia({ reducedMotion: 'reduce' });
  await anonPage.goto(origin + '/users/' + userId);
  await fullProfileFrame(anonPage);
  await expect(anonPage.getByRole('button', { name: 'Move main light', exact: true })).toHaveCount(
    0,
  );
  await expect(anonPage.locator('[data-battlefield-light]')).toHaveCount(0);
  const profileGradient = () =>
    anonPage
      .locator('svg[viewBox="0 0 1600 400"]')
      .first()
      .locator('linearGradient[id$="-metal"]')
      .evaluateAll(nodes =>
        nodes.map(node => ['x1', 'x2', 'y1', 'y2'].map(key => node.getAttribute(key))),
      );
  expect(await profileGradient()).toEqual(editorLightGradient);
  const storedBeforeMotion = await editor();
  const animationWrites: string[] = [];
  anonPage.on('request', request => {
    if (
      new URL(request.url()).pathname.startsWith('/api/battlefields') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      animationWrites.push(request.method());
  });
  await anonPage.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(profileGradient).not.toEqual(editorLightGradient);
  const movingProfileGradient = await profileGradient();
  await expect.poll(profileGradient).not.toEqual(movingProfileGradient);
  expect(await editor()).toEqual(storedBeforeMotion);
  expect(animationWrites).toEqual([]);
  await anonPage.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(profileGradient).toEqual(editorLightGradient);
  await anonPage.waitForTimeout(250);
  expect(await profileGradient()).toEqual(editorLightGradient);
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await expect(page.getByRole('button', { name: 'Select Executor', exact: true })).toBeVisible();
  await page.screenshot({ path: screenshots + 'editor-wide.png', fullPage: true });
  // All items stay available even when adding one would exceed the budget.
  // Over-budget drafts cannot save, and undo immediately enables saving again.
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},${100150 - 200000},'battlefield-browser-adjustment',${crypto.randomUUID()})`;
  await page.reload();
  // Reload defaults to the active alternate, so explicitly choose our fleet.
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await select('Planet');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('2');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '1,750 over budget',
  );
  await expect(saveButton).toBeDisabled();
  saved = (await editor()).battlefields.find(b => b.id === saved.id)!;
  const enlarged = {
    ...saved.scene,
    placements: saved.scene.placements.map(p => (p.itemId === 'planet' ? { ...p, scale: 2 } : p)),
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: saved.name, revision: saved.revision, scene: enlarged },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await choose('TIE fighter');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '250 over budget',
  );
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByLabel('Battlefield name').fill('Full budget fleet');
  await expect(saveButton).toBeEnabled();
  await save();
  saved = (await editor()).battlefields.find(b => b.id === saved.id)!;
  const over = {
    ...saved.scene,
    placements: [
      ...saved.scene.placements,
      { ...saved.scene.placements[0], id: crypto.randomUUID() },
    ],
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: 'Tampered budget', revision: saved.revision, scene: over },
      })
    ).status(),
  ).toBe(400);
  expect((await editor()).balance).toBe(100150);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  const beforeSelectionBox = await canvas.boundingBox();
  await page.getByRole('button', { name: 'Select TIE fighter', exact: true }).nth(0).click();
  const afterSelectionBox = await canvas.boundingBox();
  expect(afterSelectionBox!.y).toBeCloseTo(beforeSelectionBox!.y, 2);
  await expect(page.getByRole('slider', { name: 'Object rotation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Objects', exact: true }).focus();
  let reachedCanvas = false,
    reachedControls = false;
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (focused === 'Battlefield editing area') reachedCanvas = true;
    if (focused === 'Object color') {
      reachedControls = true;
      break;
    }
  }
  expect(reachedCanvas && reachedControls).toBe(true);
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(objects).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const mobilePicker = await objects.boundingBox(),
    mobileCanvas = await canvas.boundingBox();
  expect(mobilePicker!.y).toBeLessThan(mobileCanvas!.y + mobileCanvas!.height);
  expect(mobilePicker!.y + mobilePicker!.height).toBeGreaterThan(mobileCanvas!.y);
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'objects-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  // Swipe empty space to pan a zoomed canvas on touch devices.
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  await select('Planet');
  await canvas.scrollIntoViewIfNeeded();
  const beforePan = await canvas.evaluate(el => el.parentElement!.parentElement!.scrollLeft);
  const viewport = page.getByLabel('Battlefield viewport', { exact: true });
  await viewport.evaluate(el => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
  const touchBox = await viewport.boundingBox();
  const touch = await context.newCDPSession(page);
  const swipeY = Math.max(2, touchBox!.y + 8);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 320, y: swipeY }],
  });
  for (const x of [280, 220, 160, 100, 60])
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: swipeY }],
    });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() => canvas.evaluate(el => el.parentElement!.parentElement!.scrollLeft))
    .toBeGreaterThan(beforePan);
  await expect(page.getByRole('button', { name: 'Select Planet', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await touch.detach();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: screenshots + 'editor-mobile-light.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto(origin + '/users/' + userId);
  await expect(page.getByRole('button', { name: 'Battlefield', exact: true })).toBeVisible();
  const publicProfile = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  expect(publicProfile.status()).toBe(200);
  expect((await publicProfile.json()).data.scene).toEqual(
    publicBattlefieldScene((await editor()).battlefields.find(b => b.id === alternateId)!.scene),
  );
  await anonPage.goto(origin + '/users/' + userId);
  await expect(anonPage.getByRole('button', { name: 'Battlefield', exact: true })).toHaveCount(0);
  for (const width of [1500, 1024, 390]) {
    await anonPage.setViewportSize({ width, height: 1000 });
    await fullProfileFrame(anonPage);
    await anonPage.screenshot({
      path: screenshots + 'profile-full-' + width + '.png',
      fullPage: true,
    });
  }
  const ledger = await sql`SELECT source FROM user_credits WHERE user_id=${userId}`;
  expect(ledger).toHaveLength(2); // Test award and deliberate test adjustment only.
  expect(errors).toEqual([]);
  console.log(
    'PASS: shared lighting and profile shading, editor-only light handle, light drag/sliders/keyboard/history/persistence, middle-button panning and cancellation, Separatist ships and persistence, pointer-anchored wheel zoom, rapid inputs and limits, zoomed drag mapping, complete 4:1 profiles, round previews, automatic sidebar, rotation slider, compact main row, overlay placement, credit budgets, nested layers, ancestor visibility, cycle guards, standalone add-ons, persistence, failures/conflicts and mobile touch/themes.',
  );
  console.log('Screenshots: ' + screenshots);
} catch (error) {
  await page.screenshot({ path: screenshots + 'failure.png', fullPage: true }).catch(() => {});
  console.log('Visible alerts:', await page.getByRole('alert').allTextContents());
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
