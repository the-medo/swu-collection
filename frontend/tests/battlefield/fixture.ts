import {
  chromium,
  expect as baseExpect,
  type Browser,
  type BrowserContext,
  type Page,
  type Locator,
} from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import type {
  Battlefield,
  BattlefieldEditorData,
  BattlefieldScene,
} from '../../../shared/types/battlefield.ts';

export const expect = baseExpect.configure({ timeout: 20000 });

type Resources = {
  sql: ReturnType<typeof postgres>;
  origin: string;
  userId: string;
  context: BrowserContext;
  anonymous: BrowserContext;
  page: Page;
  anonPage: Page;
  errors: string[];
  screenshots: string;
  dialogs: { accept: boolean };
};

function battlefieldControls(resources: Resources) {
  const { origin, context, page } = resources;
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
    if ((await lightingButton.getAttribute('aria-pressed')) !== 'true')
      await lightingButton.click();
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
  async function createBattlefield(scene?: BattlefieldScene): Promise<Battlefield> {
    const response = await context.request.post(
      origin + (scene ? '/api/battlefields/from-draft' : '/api/battlefields'),
      {
        headers,
        data: scene ? { name: 'My Battlefield', scene } : { name: 'My Battlefield' },
      },
    );
    expect(response.ok()).toBe(true);
    return (await response.json()).data;
  }
  async function openBattlefield(scene?: BattlefieldScene) {
    const created = await createBattlefield(scene);
    await page.goto(origin + '/battlefield');
    await expect(canvas).toBeVisible();
    return created;
  }
  return {
    ...resources,
    headers,
    editor,
    objects,
    canvas,
    saveButton,
    lightHandle,
    lightingButton,
    editLighting,
    draftLight,
    dragLight,
    choose,
    select,
    dragSlider,
    reorder,
    savedDraft,
    save,
    cursorZoom,
    fullProfileFrame,
    createBattlefield,
    openBattlefield,
  };
}

export type BattlefieldBrowserFixture = ReturnType<typeof battlefieldControls>;

// Every scenario owns its browser contexts and synthetic user, including on setup failures.
export async function withBattlefieldFixture(
  name: string,
  scenario: (fixture: BattlefieldBrowserFixture) => Promise<void>,
) {
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
  const sql = postgres(database.toString(), { max: 2, onnotice: () => {} });
  const userId = 'battlefield-browser-' + name + '-' + crypto.randomUUID();
  const token = crypto.randomUUID();
  const screenshots = new URL(
    '../../../.swubase/battlefield-screenshots/' + encodeURIComponent(name) + '/',
    import.meta.url,
  ).pathname;
  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    await mkdir(screenshots, { recursive: true });
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1500, height: 1000 },
      hasTouch: true,
    });
    const anonymous = await browser.newContext();
    page = await context.newPage();
    const anonPage = await anonymous.newPage();
    page.setDefaultTimeout(20000);
    const errors: string[] = [];
    const dialogs = { accept: false };
    await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
      page!.getByRole('button', { name: 'Dismiss', exact: true }).click(),
    );
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => void (dialogs.accept ? dialog.accept() : dialog.dismiss()));
    await sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at) VALUES(${userId},'Battlefield fixture',${userId},${userId + '@invalid.local'},false,'USD','user',now(),now())`;
    await sql`INSERT INTO session(id,token,user_id,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${token},${userId},now()+interval '1 hour',now(),now())`;
    await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},200000,'battlefield-browser',${crypto.randomUUID()})`;
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

    await scenario(
      battlefieldControls({
        sql,
        origin,
        userId,
        context,
        anonymous,
        page,
        anonPage,
        errors,
        screenshots,
        dialogs,
      }),
    );
    expect(errors).toEqual([]);
    console.log('Screenshots: ' + screenshots);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: screenshots + 'failure.png', fullPage: true }).catch(() => {});
      console.log(
        'Visible alerts:',
        await page
          .getByRole('alert')
          .allTextContents()
          .catch(() => []),
      );
    }
    throw error;
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        await sql`DELETE FROM "user" WHERE id=${userId}`;
      } finally {
        await sql.end();
      }
    }
  }
}
