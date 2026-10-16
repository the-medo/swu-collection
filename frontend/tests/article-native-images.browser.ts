// ARTICLE_NATIVE_IMAGES_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/article-native-images.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { postDocumentSchemas } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.ARTICLE_NATIVE_IMAGES_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  !(
    ['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
    new URL(origin).hostname.endsWith('.ts.net')
  )
)
  throw new Error('Enable explicitly against an isolated development worktree.');
const db = postgres(database.toString(), { max: 2 });
const userId = `native-card-${randomUUID()}`,
  token = randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/native-image-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const api = `${origin}/api/creator-hub`;
try {
  await db`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, 'Native images', ${userId + '@invalid.local'}, false, now(), now(), 'Native images', 'USD')`;
  await db`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
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
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Native card images');
  const editor = page.getByRole('article', { name: 'Article editor' });
  const editable = editor.locator('[contenteditable=true]').first();
  await editable.click();
  await page.keyboard.type('Opening sentence. ');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  const commandMenu = page.locator('.rte-command-menu');
  await expect(commandMenu.getByText('Insert content', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(commandMenu.getByRole('option', { name: /^Card link/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.type('card-image', { delay: 25 });
  await expect(page.getByRole('option', { name: /^Card image/ })).toBeVisible();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Card size')).toHaveCount(0);
  await expect(dialog.getByLabel('Image position')).toHaveCount(0);
  await dialog.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await dialog.getByRole('listbox').getByRole('option').click();
  await expect(dialog).toBeHidden();
  const imageBlock = editor.locator('[data-content-type=image]');
  const image = imageBlock.getByAltText('Battlefield Marine');
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await expect(editor.locator('[data-content-type=swuBlock], .rte-inline-card')).toHaveCount(0);
  await expect(imageBlock.locator('.bn-file-caption, figcaption')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(imageBlock).toHaveCount(0);
  await expect(editable).toContainText('Opening sentence.');
  await page.keyboard.press('Control+Shift+z');
  await expect(image).toBeVisible();
  await page.keyboard.insertText('More article text after the image.');
  const initialWidth = (await image.boundingBox())!.width;
  await image.hover();
  const handle = imageBlock.locator('.bn-resize-handle').last();
  await expect(handle).toBeVisible();
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await image.boundingBox())!.width)
    .toBeCloseTo(initialWidth + 80, 0);
  const width = (await image.boundingBox())!.width;
  await image.click();
  const toolbar = page.locator('.bn-formatting-toolbar');
  await expect(toolbar).toBeVisible();
  for (const button of await toolbar.getByRole('button').all()) {
    await button.hover();
    const label = await button.getAttribute('aria-label');
    expect(label).toBeTruthy();
    const tooltip = page
      .locator('.bn-shadcn [data-slot="tooltip-content"]:visible')
      .filter({ hasText: label! });
    await expect(tooltip).toBeVisible();
    const tooltipBounds = (await tooltip.boundingBox())!;
    // Labels should fit horizontally instead of wrapping to one or two letters per line.
    expect(tooltipBounds.height).toBeLessThan(64);
    expect(tooltipBounds.width).toBeGreaterThan(60);
  }
  await page.screenshot({
    path: `${screenshots}/image-toolbar-tooltip.png`,
    animations: 'disabled',
  });
  await editable.click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  const article = (await (await page.request.get(`${api}/personal/articles`)).json()).data.items[0];
  const detail = (await (await page.request.get(`${api}/creations/${article.id}/draft`)).json())
    .data;
  expect(postDocumentSchemas.rich.safeParse(detail.document.body).success).toBe(true);
  const savedImage = detail.document.body.blocks.find(
    (block: { type: string }) => block.type === 'image',
  );
  expect(savedImage.props.url).toContain('/cards/battlefield-marine-');
  expect(savedImage.props.caption).toBe('');
  expect(savedImage.props.previewWidth).toBeCloseTo(width, 0);
  expect(JSON.stringify(detail.document.body)).not.toContain('swuBlock');
  await page.goto(`${origin}/creator-studio?creationId=${article.id}`);
  await expect(image).toBeVisible();
  await expect.poll(async () => (await image.boundingBox())!.width).toBeCloseTo(width, 0);
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (
      !(await page.locator('html').evaluate((el, value) => el.classList.contains(value), theme))
    ) {
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
    }
    for (const viewportWidth of [1440, 390]) {
      await page.setViewportSize({ width: viewportWidth, height: 1000 });
      await expect(image).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await editor.screenshot({
        path: `${screenshots}/editor-${viewportWidth}-${theme}.png`,
        style: '.sticky { position: static !important; }',
      });
      await editable.focus();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('/');
      await expect(commandMenu).toBeVisible();
      await expect
        .poll(() =>
          commandMenu.evaluate(element => {
            for (let node: Element | null = element; node; node = node.parentElement) {
              if (getComputedStyle(node).opacity !== '1') return false;
            }
            return true;
          }),
        )
        .toBe(true);
      const menuBounds = (await commandMenu.boundingBox())!;
      expect(menuBounds.width).toBeGreaterThan(300);
      expect(menuBounds.x).toBeGreaterThanOrEqual(0);
      expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(viewportWidth);
      expect(menuBounds.y).toBeGreaterThanOrEqual(0);
      expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(1000);
      await commandMenu.screenshot({
        path: `${screenshots}/commands-${viewportWidth}-${theme}.png`,
      });
      const options = commandMenu.getByRole('option');
      const count = await options.count();
      for (let index = 1; index < count; index++) await page.keyboard.press('ArrowDown');
      await expect(options.last()).toHaveAttribute('aria-selected', 'true');
      const lastBounds = (await options.last().boundingBox())!;
      const listBounds = (await commandMenu.getByRole('listbox').boundingBox())!;
      expect(lastBounds.y).toBeGreaterThanOrEqual(listBounds.y);
      expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(
        listBounds.y + listBounds.height + 1,
      );
      await page.keyboard.press('Escape');
      await expect(commandMenu).toBeHidden();
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const previewImage = page
    .getByRole('article', { name: 'Article preview' })
    .locator('[data-content-type=image] img');
  await expect(previewImage).toBeVisible();
  await expect.poll(async () => (await previewImage.boundingBox())!.width).toBeCloseTo(width, 0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish update', exact: true })).toBeVisible();

  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    storageState: await context.storageState(),
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${origin}/creator-studio?creationId=${article.id}`);
  await touchPage.locator('[contenteditable=true]').first().tap();
  await touchPage.keyboard.press('Control+End');
  await touchPage.keyboard.press('Enter');
  await touchPage.keyboard.type('/');
  const touchMenu = touchPage.locator('.rte-command-menu');
  await expect(touchMenu).toBeVisible();
  await expect(touchMenu.locator('.rte-command-menu-footer')).toBeHidden();
  await touchMenu.getByRole('option', { name: /^Card image/ }).tap();
  await expect(
    touchPage.getByRole('dialog').getByRole('combobox', { name: 'Search cards' }),
  ).toBeVisible();
  await touchContext.close();

  await context.clearCookies();
  await page.goto(`${origin}/content/${article.id}`);
  const publishedImage = page.locator('article [data-content-type=image] img');
  await expect(publishedImage).toBeVisible();
  await expect.poll(async () => (await publishedImage.boundingBox())!.width).toBeCloseTo(width, 0);
  await publishedImage.hover();
  await expect(page.locator('.bn-resize-handle:visible')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'Command menus, image toolbar tooltips, native image insertion, resizing, undo/redo, persistence, preview and public rendering passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
  await db`DELETE FROM "user" WHERE id = ${userId}`;
  await db.end();
}
