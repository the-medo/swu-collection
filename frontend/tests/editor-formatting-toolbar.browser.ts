// EDITOR_FORMATTING_TOOLBAR_TEST=1 bun frontend/tests/editor-formatting-toolbar.browser.ts
// Keeps all content in browser memory; no account or article writes are needed.
import { chromium, expect as baseExpect } from 'playwright/test';
import { postDocumentSchema, type EditorType } from '../../shared/posts/content.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_FORMATTING_TOOLBAR_TEST !== '1' ||
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
const url = `${origin}/users/swubase`;
await page.route(`${url}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script>
<script type="module" src="/@vite/client"></script><script type="module" src="/tests/rich-text-editor.harness.tsx"></script></body></html>`,
  }),
);
const text = 'Selected article text.';
const content = postDocumentSchema.parse({
  version: 1,
  blocks: [
    {
      id: 'selection-text',
      type: 'paragraph',
      props: {},
      children: [],
      content: [{ type: 'text', text, styles: {} }],
    },
  ],
});
const matchup = postDocumentSchema.parse({
  version: 1,
  blocks: [
    {
      id: 'selection-matchup',
      type: 'swuBlock',
      children: [],
      props: { data: JSON.stringify({ kind: 'matchup', title: 'Matchup', notes: content }) },
    },
  ],
});
await page.addInitScript(
  ({ content, matchup }) => {
    const params = new URLSearchParams(location.search);
    window.editorFixtureInitialContent = params.has('matchup') ? matchup : content;
    window.editorFixtureOptions = {
      type: (params.get('type') ?? 'rich') as EditorType,
      disabled: params.has('disabled'),
      published: params.has('published'),
    };
  },
  { content, matchup },
);

const toolbar = page.locator('.bn-formatting-toolbar');
async function selectReadOnlyText(selector: string) {
  await page
    .locator(selector)
    .first()
    .dblclick({ position: { x: 30, y: 10 } });
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe('Selected');
  // Let selection-driven popovers settle before asserting that none was mounted.
  await page.waitForTimeout(300);
  await expect(toolbar).toHaveCount(0);
}
try {
  for (const type of ['rich', 'comments', 'simple']) {
    await page.goto(`${url}?type=${type}`);
    const editor = page.locator('[contenteditable=true]').first();
    await editor
      .locator('p')
      .first()
      .dblclick({ position: { x: 30, y: 10 } });
    await expect(toolbar.getByRole('button', { name: 'Bold', exact: true })).toBeVisible();
    await toolbar.getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(editor.locator('strong, b')).toHaveText('Selected');
    await toolbar.getByRole('button', { name: 'Italic', exact: true }).click();
    await expect(editor.locator('em, i')).toHaveText('Selected');
    await expect(editor.locator('p').first()).toHaveText(text);
    await page.getByRole('button', { name: 'Preview post', exact: true }).click();
    await selectReadOnlyText('.rte-published .bn-editor p');
    await expect(page.locator('.rte-published strong, .rte-published b')).toHaveText('Selected');

    await page.goto(`${url}?type=${type}&disabled`);
    await selectReadOnlyText('.rte-editing .bn-editor p');
    console.log(
      `${type}: formatting buttons work; preview and disabled selections have no toolbar`,
    );
  }
  // Matchup notes use a nested read-only editor even while editing the article.
  for (const mode of ['editing', 'published']) {
    await page.goto(`${url}?matchup${mode === 'published' ? '&published' : ''}`);
    await selectReadOnlyText('.rte-matchup-notes .bn-editor p');
    console.log(`${mode}: selecting nested matchup notes has no empty toolbar`);
  }
  expect(errors).toEqual([]);
  console.log('Formatting toolbar regression checks passed.');
} finally {
  await browser.close();
}
