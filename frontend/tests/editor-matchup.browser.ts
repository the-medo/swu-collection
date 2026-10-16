// EDITOR_MATCHUP_TEST=1 bun frontend/tests/editor-matchup.browser.ts
// Exercises real selectors and rendering; all article content stays in browser memory.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { postDocumentSchema } from '../../shared/posts/content.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_MATCHUP_TEST !== '1' ||
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
const screenshots = new URL('../../.swubase/matchup-screenshots/', import.meta.url).pathname;
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
const leftLeader = 'sabine-wren--galvanized-revolutionary';
const rightLeader = 'grand-moff-tarkin--oversector-governor';
const leftBase = 'command-center';
const rightBase = 'energy-conversion-lab';
const examples = [
  { title: 'General game plan', alignment: 'left', cards: {} },
  { title: 'Your deck only', alignment: 'right', cards: { leftLeader, leftBase } },
  { title: 'Opponent only', alignment: 'left', cards: { rightLeader, rightBase } },
  { title: 'Bases without leaders', alignment: 'center', cards: { leftBase, rightBase } },
  {
    title: 'Aggro into control',
    alignment: 'center',
    cards: { leftLeader, leftBase, rightLeader, rightBase },
  },
  {
    title: 'LongUnbrokenTitle'.repeat(6),
    alignment: 'center',
    cards: { leftLeader, leftBase, rightLeader, rightBase },
  },
];
const fixture = postDocumentSchema.parse({
  version: 1,
  blocks: examples.map(({ title, cards }, i) => ({
    id: `matchup-${i}`,
    type: 'swuBlock',
    children: [],
    props: {
      data: JSON.stringify({
        kind: 'matchup',
        ...cards,
        title,
        subtitle: 'On the play · post-sideboard',
        notes: {
          version: 1,
          blocks: [
            {
              id: 'notes',
              type: 'paragraph',
              props: {},
              children: [],
              content: [
                {
                  type: 'text',
                  text: 'Trade efficiently, then attack the base. Save your removal for their biggest threats.\nKeep pressure on both arenas.',
                  styles: {},
                },
              ],
            },
          ],
        },
        footer: 'Testing notes · Updated after round 3.',
      }),
    },
  })),
});
await page.addInitScript(content => {
  if (location.search.includes('examples')) window.editorFixtureInitialContent = content;
}, fixture);
await page.route('**/api/user/search?**', route =>
  route.fulfill({
    json: { data: [{ id: 'matchup-notes-player', displayName: 'Leia Organa' }] },
  }),
);
const editor = page.locator('[contenteditable=true]').first();
const dialog = page.getByRole('dialog').first();
const matchup = page.locator('[data-widget-kind=matchup]').first();
async function choose(side: string, type: string, query: string, id: string) {
  await dialog.getByRole('button', { name: `${side} ${type}`, exact: true }).click();
  const selector = page.getByRole('dialog').last();
  await selector.getByPlaceholder('Search', { exact: true }).fill(query);
  await selector.getByAltText(`card-${id}`, { exact: true }).first().click();
  await selector.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(
    dialog.getByRole('button', { name: `Remove ${side} ${type}`, exact: true }),
  ).toBeVisible();
}
async function save() {
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toBeHidden();
}
try {
  await page.goto(url);
  await editor.click();
  await page.keyboard.type('Article introduction.');
  await page.keyboard.press('Enter');
  const outerBefore = await page.evaluate(() => window.editorFixtureDocument);
  await page.keyboard.type('/matchup');
  await page.getByRole('option', { name: /^Matchup/ }).click();
  await expect(dialog.getByRole('button', { name: 'Insert matchup', exact: true })).toBeDisabled();
  const notes = dialog.getByLabel('Matchup notes', { exact: true });
  await notes.click();
  await page.keyboard.type('Trade efficiently.');
  await page.keyboard.press('Shift+Home', { delay: 100 });
  await page.keyboard.press('Control+b', { delay: 100 });
  await expect(notes.locator('strong, b')).toHaveText('Trade efficiently.');
  await page.keyboard.press('ArrowRight', { delay: 100 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('/card-link');
  await page.getByRole('option', { name: /^Card link/ }).click();
  const cardPicker = page.getByRole('dialog', { name: 'Insert card link', exact: true });
  await cardPicker.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await cardPicker.getByRole('option').first().click();
  await expect(cardPicker).toBeHidden();
  await expect(notes).toBeFocused();
  await expect(notes.getByRole('link', { name: 'Battlefield Marine' })).toBeVisible();
  await page.keyboard.type('@');
  const mentionPicker = page.getByRole('dialog', { name: 'Mention a user', exact: true });
  await mentionPicker.getByRole('combobox', { name: 'Search users' }).fill('Leia');
  await mentionPicker.getByRole('option').first().click();
  await expect(mentionPicker).toBeHidden();
  await expect(notes).toBeFocused();
  await expect(notes.getByRole('button', { name: '@Leia Organa', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+Shift+8');
  await page.keyboard.type('Keep pressure on both arenas.');
  await expect(notes.locator('[data-content-type=bulletListItem]')).toContainText('Keep pressure');
  // Cancelling an inline picker returns to the notes, keeping the parent dialog open.
  await page.keyboard.press('Enter');
  await page.keyboard.type('/card-link');
  await page.getByRole('option', { name: /^Card link/ }).click();
  await cardPicker.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(cardPicker).toBeHidden();
  await expect(notes).toBeFocused();
  // Dialog typing must never alter the outer article until the matchup is inserted.
  expect(await page.evaluate(() => window.editorFixtureDocument)).toEqual(outerBefore);
  await dialog.getByLabel('Footer').fill('Testing notes\nRound 3');
  await dialog.getByRole('button', { name: 'Insert matchup', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(matchup.locator('.deck-artwork')).toHaveCount(0);
  await expect(matchup.locator('.rte-matchup-footer')).toHaveText('Testing notes\nRound 3');
  await expect(matchup.locator('.rte-matchup-notes .bn-editor')).toHaveCSS('min-height', '0px');
  await expect(matchup.locator('.rte-matchup-notes .bn-editor')).toHaveCSS('padding', '0px');
  await expect(matchup.locator('.rte-matchup-notes strong, .rte-matchup-notes b')).toContainText(
    'Trade efficiently.',
  );
  await expect(matchup.getByRole('link', { name: 'Battlefield Marine' })).toBeVisible();
  await expect(matchup.getByRole('button', { name: '@Leia Organa', exact: true })).toBeVisible();
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await expect(notes.locator('[data-content-type=bulletListItem]').first()).toContainText(
    'Keep pressure',
  );
  await notes.fill('Unsaved changes');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(matchup).not.toContainText('Unsaved changes');
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await expect(dialog.getByLabel('Footer')).toHaveValue('Testing notes\nRound 3');
  await choose('right', 'leader', 'Grand Moff', rightLeader);
  await choose('right', 'base', 'Energy Conversion Lab', rightBase);
  const opponent = dialog.getByRole('group', { name: 'Opponent', exact: true });
  const artBox = (await opponent.locator('.deck-artwork').boundingBox())!;
  const opponentBox = (await opponent.boundingBox())!;
  expect(artBox.x + artBox.width / 2).toBeGreaterThan(opponentBox.x + opponentBox.width / 2);
  await save();
  await expect(matchup.locator('.rte-matchup-heading')).toHaveCSS('text-align', 'left');
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await choose('left', 'leader', 'Galvanized Revolutionary', leftLeader);
  await choose('left', 'base', 'Command Center', leftBase);
  await save();
  await expect(matchup.locator('.rte-matchup-heading')).toHaveCSS('text-align', 'center');
  await expect(matchup.locator('.compact-deck-card')).toHaveCount(4);
  const leader = matchup.locator('.compact-deck-card-leader').first();
  await page.mouse.move(0, 0);
  const resting = await leader.evaluate(el => getComputedStyle(el).transform);
  await matchup.locator('.deck-artwork').first().hover();
  await expect.poll(() => leader.evaluate(el => getComputedStyle(el).transform)).not.toBe(resting);
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await dialog.getByLabel('Matchup notes').scrollIntoViewIfNeeded();
    await dialog.screenshot({ path: `${screenshots}dialog-${width}.png`, animations: 'disabled' });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(
      dialog.getByRole('button', { name: 'Save changes', exact: true }),
    ).toBeInViewport();
  }
  await dialog.getByRole('button', { name: 'Remove left leader' }).click();
  await dialog.getByRole('button', { name: 'Remove right leader' }).click();
  await save();
  await expect(matchup.locator('.compact-deck-card-leader')).toHaveCount(0);
  await expect(matchup.locator('.compact-deck-card-base')).toHaveCount(2);
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await expect(dialog.getByRole('button', { name: 'left leader', exact: true })).toContainText(
    'optional',
  );
  await dialog.getByRole('button', { name: 'Remove right base' }).click();
  await dialog.getByLabel('Footer').fill('');
  await notes.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Updated after round 4.');
  await save();
  await expect(matchup.locator('.rte-matchup-notes')).toContainText('Updated after round 4.');
  await expect(matchup.locator('.rte-matchup-heading')).toHaveCSS('text-align', 'right');
  await expect(matchup.locator('.rte-matchup-footer')).toHaveCount(0);
  const saved = postDocumentSchema.parse(await page.evaluate(() => window.editorFixtureDocument));
  const block = saved.blocks.find(block => block.type === 'swuBlock');
  if (block?.type !== 'swuBlock') throw new Error('Missing saved matchup');
  expect(JSON.parse(block.props.data)).toMatchObject({ leftBase, footer: '' });
  expect(JSON.parse(block.props.data)).not.toHaveProperty('leftLeader');
  expect(JSON.parse(block.props.data)).not.toHaveProperty('rightLeader');
  await page.getByRole('button', { name: 'Preview post', exact: true }).click();
  await expect(matchup.getByRole('button', { name: 'Edit matchup' })).toHaveCount(0);
  await expect(matchup.getByRole('img', { name: 'Command Center', exact: true })).toBeVisible();
  await expect(matchup.locator('.rte-matchup-notes strong, .rte-matchup-notes b')).toContainText(
    'Trade efficiently.',
  );
  await matchup.getByRole('button', { name: '@Leia Organa', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open profile', exact: true })).toHaveAttribute(
    'href',
    '/users/matchup-notes-player',
  );
  await page.keyboard.press('Escape');
  // Remount from the validated saved JSON, as when an article is loaded again.
  await page.addInitScript(content => {
    if (location.search.includes('saved')) window.editorFixtureInitialContent = content;
  }, saved);
  await page.goto(`${url}?saved`);
  await expect(matchup.locator('.rte-matchup-notes')).toContainText('Updated after round 4.');
  await expect(matchup.getByRole('link', { name: 'Battlefield Marine' })).toHaveAttribute(
    'href',
    '/cards/detail/battlefield-marine',
  );
  await expect(matchup.getByRole('button', { name: '@Leia Organa', exact: true })).toBeVisible();

  await matchup.getByRole('link', { name: 'Battlefield Marine' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('modalCardId'))
    .toBe('battlefield-marine');
  await expect(page.getByRole('dialog').last()).toBeVisible();
  await page.goto(`${url}?examples`);
  const widgets = page.locator('[data-widget-kind=matchup]');
  await expect(widgets).toHaveCount(examples.length);
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (!(await page.locator('html').evaluate((el, theme) => el.classList.contains(theme), theme)))
      await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (let i = 0; i < examples.length; i++) {
        const widget = widgets.nth(i);
        await widget.scrollIntoViewIfNeeded();
        await expect(widget.locator('.rte-matchup-heading')).toHaveCSS(
          'text-align',
          examples[i].alignment,
        );
        const measured = await widget.evaluate(el => {
          const header = el.querySelector('.rte-matchup-header')!.getBoundingClientRect();
          const notes = el.querySelector('.rte-matchup-notes')!;
          const footer = el.querySelector('.rte-matchup-footer')!;
          const body = notes.getBoundingClientRect();
          return {
            overflow: el.scrollWidth > el.clientWidth + 1,
            headerWidth: header.width,
            bodyWidth: body.width,
            headerBottom: header.bottom,
            bodyTop: body.top,
            footerSize: parseFloat(getComputedStyle(footer).fontSize),
            bodySize: parseFloat(getComputedStyle(notes).fontSize),
            footerColor: getComputedStyle(footer).color,
            bodyColor: getComputedStyle(notes).color,
          };
        });
        expect(measured.overflow).toBe(false);
        expect(measured.bodyWidth).toBeCloseTo(measured.headerWidth, 0);
        expect(measured.bodyTop).toBeGreaterThan(measured.headerBottom);
        expect(measured.footerSize).toBeLessThan(measured.bodySize);
        expect(measured.footerColor).not.toBe(measured.bodyColor);
        for (const img of await widget.locator('img').all())
          await expect
            .poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
        if (i < 5)
          await widget.screenshot({
            path: `${screenshots}example-${i}-${width}-${theme}.png`,
            animations: 'disabled',
          });
      }
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: formatted matchup notes, card links/mentions, nested picker focus, cancel/save/reload, optional leaders, footer, adaptive header, mobile/desktop and light/dark.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
