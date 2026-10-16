// Browser-only regression check; no account or database fixtures are created.
// EDITOR_BLOCK_MENU_TEST=1 bun frontend/tests/editor-block-menu.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import type { PostDocument } from '../../shared/posts/content';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_BLOCK_MENU_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this test against a local worktree frontend.');

const expect = baseExpect.configure({ timeout: 15_000 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/block-menu-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const url = `${origin}/users/swubase`;
await page.route(`${url}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
      <script type="module">
        import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;
      </script>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/tests/rich-text-editor.harness.tsx"></script>
    </body></html>`,
  }),
);

const editor = page.locator('[contenteditable=true]').first();
const blocks = page.locator('.bn-editor .bn-block-outer');
const add = page.getByRole('button', { name: 'Add block', exact: true });
const handle = page.getByRole('button', { name: 'Open block menu', exact: true });
const commandMenu = page.locator('.rte-command-menu');
const colors = page.locator('.bn-color-picker-dropdown');
const document = () =>
  page.evaluate(
    () => (window as Window & { editorFixtureDocument: PostDocument }).editorFixtureDocument,
  );

async function hoverBlock(index = 0) {
  await page.mouse.move(0, 0);
  await blocks.nth(index).locator('.bn-block-content').first().hover();
  await expect(handle).toBeVisible();
}

async function closeMenus() {
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.bn-drag-handle-menu')).toBeHidden();
  await expect(colors).toBeHidden();
}

try {
  await page.goto(url);
  await editor.click();
  await page.keyboard.type('Original paragraph');
  await expect(blocks.first()).toContainText('Original paragraph');
  await hoverBlock();
  // Click the button's padding, outside its SVG. The native icon-only handler failed here.
  await add.click({ position: { x: 3, y: 3 } });
  await expect(commandMenu).toBeVisible();
  await expect(blocks).toHaveCount(2);
  await page.keyboard.type('heading');
  await page.getByRole('option', { name: /^Heading 2\b/ }).click();
  await page.keyboard.type('Added heading');
  await expect.poll(async () => (await document()).blocks[1]?.type).toBe('heading');
  await expect(blocks.first()).toContainText('Original paragraph');

  // An empty paragraph reuses its block, and keyboard activation works too.
  await page.keyboard.press('Enter');
  await hoverBlock(2);
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(commandMenu).toBeVisible();
  await expect(blocks).toHaveCount(3);
  await page.keyboard.press('Escape');
  await page.keyboard.type('Last paragraph');

  await hoverBlock();
  await handle.click();
  await expect(page.locator('.bn-drag-handle-menu')).toBeVisible();
  // Native menu navigation must continue to open the color submenu.
  await page.getByRole('menuitem', { name: 'Colors', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(colors).toBeVisible();
  await colors.locator('[data-test="text-color-orange"]').click();
  await expect.poll(async () => (await document()).blocks[0]?.props.textColor).toBe('orange');
  await closeMenus();
  await hoverBlock();
  await handle.click();
  await page.getByRole('menuitem', { name: 'Colors', exact: true }).hover();
  await expect(colors).toBeVisible();
  await expect(colors.locator('[data-test="text-color-orange"]')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await colors.locator('[data-test="background-color-blue"]').click();
  await expect.poll(async () => (await document()).blocks[0]?.props.backgroundColor).toBe('blue');
  await closeMenus();

  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      // The theme control lives in the desktop sidebar; change it before narrowing.
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (
        !(await page.locator('html').evaluate((el, theme) => el.classList.contains(theme), theme))
      ) {
        await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
        await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      }
      await page.setViewportSize({ width, height: 1000 });
      await hoverBlock();
      await handle.click();
      await expect(handle).toHaveAttribute('draggable', 'true');
      const menu = page.locator('.bn-drag-handle-menu');
      await expect(menu).toBeVisible();
      await page.screenshot({ path: `${screenshots}block-${width}-${theme}.png` });
      await page.getByRole('menuitem', { name: 'Colors', exact: true }).hover();
      await expect(colors).toBeVisible();
      await expect
        .poll(async () => (await colors.boundingBox())?.width ?? 0)
        .toBeGreaterThanOrEqual(200);
      const rect = (await colors.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      // Every color remains readable on one line, including checked entries.
      const sizes = await colors
        .getByRole('menuitemcheckbox')
        .evaluateAll(items =>
          items.map(item => ({
            height: item.getBoundingClientRect().height,
            overflow: item.scrollWidth > item.clientWidth,
          })),
        );
      expect(sizes).toHaveLength(20);
      expect(sizes.every(size => size.height <= 40 && !size.overflow)).toBe(true);
      await page.screenshot({ path: `${screenshots}colors-${width}-${theme}.png` });
      await closeMenus();
    }
    // The whole + button must also remain reachable at phone widths.
    await hoverBlock(2);
    await add.click();
    await expect(commandMenu).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.type(`Added at ${width}`);
  }

  await hoverBlock(1);
  await handle.click();
  await page.getByRole('menuitem', { name: /Delete/ }).click();
  await expect
    .poll(async () => (await document()).blocks.some(block => block.type === 'heading'))
    .toBe(false);
  await expect(blocks.first()).toContainText('Original paragraph');
  await editor.focus();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await document()).blocks[1]?.type).toBe('heading');
  await page.getByRole('button', { name: 'Preview post', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.locator('.bn-block-content').first().hover();
  await expect(handle).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: + insertion, keyboard, colors, deletion/undo, responsive themes, and read-only preview.',
  );
} finally {
  await browser.close();
}
