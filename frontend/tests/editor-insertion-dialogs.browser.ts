// EDITOR_INSERTION_DIALOGS_TEST=1 bun frontend/tests/editor-insertion-dialogs.browser.ts
// Browser-only layout/interaction check. Article content stays in the fixture's memory.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_INSERTION_DIALOGS_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this check against a local worktree frontend.');
const expect = baseExpect.configure({ timeout: 15_000 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const screenshots = new URL('../../.swubase/insertion-dialog-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
const url = `${origin}/users/swubase`;
await page.route(`${url}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script>
<script type="module" src="/@vite/client"></script><script type="module" src="/tests/rich-text-editor.harness.tsx"></script></body></html>`,
  }),
);
// Stable public-profile responses let us exercise search, empty results, and retry.
let profileError = false;
await page.route('**/api/user/search?**', route =>
  route.fulfill({
    status: profileError ? 503 : 200,
    json: {
      data:
        new URL(route.request().url()).searchParams.get('q') === 'Leia'
          ? [{ id: 'dialog-fixture-player', displayName: 'Leia Organa' }]
          : [],
    },
  }),
);
const editor = page.locator('[contenteditable=true]').first();
const dialog = page.getByRole('dialog');
const commands = [
  ['card-image', 'Card image'],
  ['card-link', 'Card link'],
  ['decklist', 'Decklist'],
  ['album', 'Add album'],
  ['meta-analysis', 'Meta analysis'],
  ['matchup', 'Matchup'],
  ['card-group', 'Card group'],
  ['callout', 'Strategy callout'],
  ['mention', 'Mention a user'],
] as const;
async function open(kind: string, label: string) {
  await editor.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(`/${kind}`);
  await page.getByRole('option', { name: new RegExp(`^${label}`) }).click();
  await expect(dialog).toBeVisible();
}
async function selectCard() {
  await dialog.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await expect(dialog.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await expect
    .poll(() =>
      dialog
        .getByRole('option')
        .locator('img')
        .evaluate(
          image =>
            (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
        ),
    )
    .toBe(true);
}
async function checkBounds(width: number) {
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport();
  // Wait for the opening animation before measuring the final placement.
  await dialog.evaluate(async element => {
    await Promise.allSettled(element.getAnimations().map(animation => animation.finished));
  });
  await expect.poll(async () => (await dialog.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(901);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}
try {
  await page.goto(url);
  await editor.click();
  await page.keyboard.type('Dialog design fixture');
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (
      !(await page.locator('html').evaluate((el, theme) => el.classList.contains(theme), theme))
    ) {
      await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [kind, label] of commands) {
        await open(kind, label);
        if (kind === 'card-image' || kind === 'card-link') await selectCard();
        if (kind === 'mention') {
          await dialog.getByRole('combobox', { name: 'Search users' }).fill('Leia');
          await expect(
            dialog.getByRole('option', { name: '@Leia Organa', exact: true }),
          ).toBeVisible();
        }
        if (kind === 'card-group') {
          await expect(
            dialog.getByRole('button', { name: 'Insert card group', exact: true }),
          ).toBeDisabled();
          await dialog.getByRole('radio', { name: 'Large', exact: true }).locator('..').click();
          await dialog.getByRole('button', { name: 'Add card', exact: true }).click();
          await selectCard();
          await page.keyboard.press('Enter');
          await expect(
            dialog.getByRole('button', { name: 'Insert card group', exact: true }),
          ).toBeEnabled();
        }
        if (kind === 'callout') {
          await expect(
            dialog.getByRole('button', { name: 'Insert callout', exact: true }),
          ).toBeDisabled();
          await dialog.getByRole('radio', { name: 'Tip', exact: true }).focus();
          await page.keyboard.press('ArrowRight');
          await expect(dialog.getByRole('radio', { name: 'Watch out', exact: true })).toBeChecked();
          await dialog.getByLabel('Title', { exact: true }).fill('Keep an answer ready');
          await dialog
            .getByLabel('Notes', { exact: true })
            .fill('Save a removal option for your opponent’s next big play.');
          await expect(dialog.getByRole('region', { name: 'Callout preview' })).toContainText(
            'Keep an answer ready',
          );
          await expect(
            dialog.getByRole('button', { name: 'Insert callout', exact: true }),
          ).toBeEnabled();
        }
        if (kind === 'decklist') {
          await expect(
            dialog.getByRole('button', { name: 'Insert decklist', exact: true }),
          ).toBeDisabled();
          await dialog.getByRole('tab', { name: 'Your decks', exact: true }).click();
          await expect(dialog).toContainText('Sign in to choose one of your decks');
          await dialog.getByRole('tab', { name: 'Public decks', exact: true }).click();
        }
        if (kind === 'album') {
          await expect(dialog).toContainText('Sign in to choose one of your albums');
          await expect(
            dialog.getByRole('button', { name: 'Insert album', exact: true }),
          ).toBeDisabled();
        }
        if (kind === 'meta-analysis') {
          await dialog.getByLabel('Tournament or group ID').fill('not-an-id');
          await dialog.getByRole('button', { name: 'Load preview', exact: true }).click();
          await expect(dialog.getByRole('alert')).toContainText('valid');
          await expect(
            dialog.getByRole('button', { name: 'Insert chart', exact: true }),
          ).toBeDisabled();
        }
        await checkBounds(width);
        await dialog.screenshot({
          path: `${screenshots}${kind}-${width}-${theme}.png`,
          animations: 'disabled',
        });
        // Both keyboard choice and cancellation must restore focus to the editor.
        if (kind === 'card-image' || kind === 'card-link' || kind === 'mention')
          await page.keyboard.press('Enter');
        else await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(editor).toBeFocused();
      }
    }
  }
  await open('mention', 'Mention a user');
  await dialog.getByRole('combobox', { name: 'Search users' }).fill('Nobody');
  await expect(dialog).toContainText('No matching profiles');
  profileError = true;
  await dialog.getByRole('combobox', { name: 'Search users' }).fill('Retry me');
  await expect(dialog.getByRole('alert')).toContainText('Could not search profiles');
  profileError = false;
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(editor).toBeFocused();
  expect(errors).toEqual([]);
  console.log(
    'PASS: all nine insertion dialogs, desktop/mobile, light/dark, keyboard, preview, validation, cancel/focus, and search retry.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
