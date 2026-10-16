// EDITOR_DECK_MATCHES_TEST=1 bun frontend/tests/editor-deck-matches.browser.ts
// Read-only check using an imported local tournament deck; article fixtures stay in memory.
import { chromium, expect as baseExpect } from 'playwright/test';
import { postDocumentSchema } from '../../shared/posts/content.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_DECK_MATCHES_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this check against a local worktree frontend.');
const deckId = process.env.EDITOR_TEST_DECK_ID ?? '831cf5a9-2027-4f46-8068-374f9e43fdf1';
const expect = baseExpect.configure({ timeout: 15_000 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
await page.addInitScript(() => localStorage.setItem('vite-ui-theme', 'light'));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const fixture = postDocumentSchema.parse({
  version: 1,
  blocks: [
    {
      id: 'matches-deck',
      type: 'swuBlock',
      props: {
        data: JSON.stringify({ kind: 'decklist', deck: { deckId } }),
      },
      children: [],
    },
    {
      id: 'native-table',
      type: 'table',
      props: {},
      children: [],
      content: {
        type: 'tableContent',
        columnWidths: [160, 200],
        rows: [
          {
            cells: [
              [{ type: 'text', text: 'Native table', styles: {} }],
              [{ type: 'text', text: 'Value', styles: {} }],
            ],
          },
          {
            cells: [
              [{ type: 'text', text: 'Editable cell', styles: {} }],
              [{ type: 'text', text: 'Second row', styles: {} }],
            ],
          },
        ],
      },
    },
  ],
});
const fixtureUrl = `${origin}/users/swubase`;
await page.route(`${fixtureUrl}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script>
<script type="module" src="/@vite/client"></script><script type="module" src="/tests/rich-text-editor.harness.tsx"></script></body></html>`,
  }),
);

try {
  // Record the actual deck-page presentation before visiting the editor.
  await page.goto(`${origin}/decks/${deckId}`);
  const matches = page.locator('table').filter({ hasText: 'Player:' }).first();
  await expect(matches.locator('tr').first()).toBeVisible();
  const standalone = await matches.evaluate(table => ({
    layout: getComputedStyle(table).tableLayout,
    rows: Array.from(table.querySelectorAll('tr')).map(row => ({
      color: getComputedStyle(row).backgroundColor,
      border: getComputedStyle(row).borderTopWidth,
    })),
  }));
  expect(standalone.layout).toBe('auto');
  expect(standalone.rows.length).toBeGreaterThan(0);

  await page.addInitScript(document => {
    window.editorFixtureInitialContent = document;
    window.editorFixtureOptions = { type: 'rich', published: false };
  }, fixture);
  await page.goto(fixtureUrl);
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (!(await page.locator('html').evaluate((el, value) => el.classList.contains(value), theme)))
      await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(matches.locator('tr').first()).toBeVisible();
      const styles = await matches.evaluate(table => {
        const row = table.querySelector('tr')!;
        const cells = Array.from(row.querySelectorAll('td'));
        const rect = table.getBoundingClientRect();
        return {
          layout: getComputedStyle(table).tableLayout,
          cellAlignment: cells.map(cell => getComputedStyle(cell).verticalAlign),
          // All of the row is used; no phantom columns after the leader/base cell.
          unusedWidth: rect.right - cells.at(-1)!.getBoundingClientRect().right,
          leaderWidth: cells.at(-1)!.getBoundingClientRect().width,
          scoreWidth: cells[0]!.getBoundingClientRect().width,
          rows: Array.from(table.querySelectorAll('tr')).map(row => ({
            color: getComputedStyle(row).backgroundColor,
            border: getComputedStyle(row).borderTopWidth,
          })),
        };
      });
      expect(styles.layout).toBe('auto');
      expect(styles.cellAlignment).toEqual(['middle', 'middle', 'middle']);
      expect(styles.unusedWidth).toBeLessThan(2);
      expect(styles.leaderWidth).toBeGreaterThan(styles.scoreWidth * 2);
      if (theme === 'light') expect(styles.rows).toEqual(standalone.rows);

      const native = page.locator('[data-content-type=table] table');
      const nativeStyles = await native.evaluate(table => {
        const cell = table.querySelector('td')!;
        return {
          layout: getComputedStyle(table).tableLayout,
          border: getComputedStyle(cell).borderTopWidth,
          padding: getComputedStyle(cell).padding,
          alignment: getComputedStyle(cell).verticalAlign,
          position: getComputedStyle(cell).position,
        };
      });
      expect(nativeStyles).toEqual({
        layout: 'fixed',
        border: '1px',
        padding: '5px 10px',
        alignment: 'top',
        position: 'relative',
      });
    }
  }
  await page.getByText('Editable cell', { exact: true }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' still works');
  await expect(page.getByText('Editable cell still works', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview post', exact: true }).click();
  await expect(matches).toHaveCSS('table-layout', 'auto');
  await expect(page.locator('[data-content-type=table] table')).toHaveCSS('table-layout', 'fixed');
  await expect(page.getByText('Editable cell still works', { exact: true })).toBeVisible();
  console.log(
    'Embedded Matches layout, row colors/borders, native editable tables, and read-only preview passed at desktop/mobile widths in both themes.',
  );
} finally {
  await browser.close();
}
