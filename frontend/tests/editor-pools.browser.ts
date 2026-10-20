// EDITOR_POOLS_TEST=1 bun frontend/tests/editor-pools.browser.ts
// Starts a temporary local frontend with API fixtures; no pools or articles are written.
import { createServer } from 'vite';
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import type { PostDocument } from '../../shared/posts/content.ts';
import type { CardPoolEmbed } from '../../shared/types/cardPoolEmbed.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';

if (process.env.EDITOR_POOLS_TEST !== '1') throw new Error('Explicitly enable this browser check.');
const root = new URL('../../', import.meta.url).pathname;
const screenshots = `${root}.swubase/editor-pool-screenshots/`;
await mkdir(screenshots, { recursive: true });
const catalog: CardList = JSON.parse(
  await readFile(`${root}server/db/json/card-list.json`, 'utf8'),
);
const cards = Object.fromEntries(
  Object.entries(catalog)
    .filter(([, card]) => card?.type === 'Leader')
    .slice(0, 6),
);
const ids = [
  '05178e2c-c17f-4389-8bf6-13d49d9c4b5d',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];
const pool = (id: string): CardPoolEmbed => ({
  id,
  name: id === ids[0] ? 'My sealed pool' : 'My unlisted pool',
  set: 'sor',
  leaders: Object.keys(cards).map((cardId, index) => ({ cardId, copies: index < 2 ? 2 : 1 })),
  boosterCount: 8,
});
let initial: PostDocument | undefined;
const vite = await createServer({
  root: `${root}frontend`,
  configFile: `${root}frontend/vite.config.ts`,
  server: { host: '127.0.0.1', port: 0 },
  plugins: [
    {
      name: 'pool-editor-fixture',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== '/') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            await server.transformIndexHtml(
              '/',
              `<!doctype html><html><body><div id="root"></div>
<script>window.poolFixtureCards = ${JSON.stringify(cards)}; window.poolFixtureInitial = ${JSON.stringify(initial) ?? 'undefined'};</script>
<script type="module" src="/tests/editor-pools.harness.tsx"></script></body></html>`,
            ),
          );
        });
      },
    },
  ],
});
const expect = baseExpect.configure({ timeout: 20_000 });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await vite.listen();
  const origin = vite.resolvedUrls!.local[0]!;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let hidden = false;
  let empty = false;
  await context.route(
    url => url.pathname.startsWith('/api/'),
    async route => {
      expect(route.request().method()).toBe('GET');
      const id = new URL(route.request().url()).pathname.match(
        /^\/api\/card-pools\/([^/]+)\/embed$/,
      )?.[1];
      if (!id) return route.fulfill({ status: 404, json: { message: 'No API fixture' } });
      await new Promise(resolve => setTimeout(resolve, 150));
      const unavailable = id === ids[2] || hidden;
      const data = pool(id);
      if (empty) {
        data.leaders = [];
        data.boosterCount = null;
        data.name = 'A custom sealed pool with no leaders and a longer title';
      }
      return route.fulfill(
        unavailable
          ? { status: 404, json: { message: 'This sealed pool is private or unavailable.' } }
          : { json: { data } },
      );
    },
  );
  await context.route(
    url => /^\/limited\/pool\/[^/]+\/detail$/.test(url.pathname),
    route => route.fulfill({ contentType: 'text/html', body: 'Pool destination' }),
  );
  await page.goto(origin);
  const editor = page.locator('[contenteditable=true]').first();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByRole('textbox', { name: 'SWUBASE pool link or ID' });
  const insert = dialog.getByRole('button', { name: 'Insert pool', exact: true });
  const widget = page.locator('[data-widget-kind=pool]');
  async function open(command: string) {
    await editor.focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(`/${command}`, { delay: 20 });
    await expect(page.getByRole('option', { name: /^Sealed pool/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
  }
  async function find(value: string) {
    await input.fill(value);
    await dialog.getByRole('button', { name: 'Find pool', exact: true }).click();
  }
  await open('sealed');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(editor).toBeFocused();
  await open('pool');
  await find('bad-link');
  await expect(dialog.getByRole('alert')).toContainText('valid pool ID');
  await expect(insert).toBeDisabled();
  await find(ids[2]);
  await expect(dialog.getByRole('alert')).toContainText('unavailable');
  await expect(insert).toBeDisabled();
  await find(`https://steamdeck.tail73a93e.ts.net:5178/limited/pool/${ids[0]}/detail`);
  await expect(dialog.getByRole('status')).toContainText('Loading sealed pool');
  await expect(insert).toBeDisabled();
  await expect(dialog.getByRole('heading', { name: 'My sealed pool' })).toBeVisible();
  await expect(dialog.locator('.today-leader')).toHaveCount(6);
  await expect(dialog.locator('.today-copy-badge')).toHaveCount(2);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(insert).toBeInViewport();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await insert.click();
  await expect(dialog).toBeHidden();
  await expect(widget.getByRole('heading', { name: 'My sealed pool' })).toBeVisible();
  const saved = await page.evaluate(() => window.poolFixtureDocument);
  const blocks = saved.blocks.filter(block => block.type === 'swuBlock');
  expect(blocks).toHaveLength(1);
  expect(JSON.parse(blocks[0].props.data)).toEqual({ kind: 'pool', poolId: ids[0] });
  await widget.getByRole('button', { name: 'Edit pool', exact: true }).click();
  await expect(input).toHaveValue(ids[0]);
  await input.fill(ids[1]);
  const update = dialog.getByRole('button', { name: 'Update pool', exact: true });
  await expect(update).toBeDisabled();
  await dialog.getByRole('button', { name: 'Find pool', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'My unlisted pool' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => window.poolFixtureDocument)).toEqual(saved);
  await widget.getByRole('button', { name: 'Edit pool', exact: true }).click();
  await find(ids[1]);
  await expect(update).toBeEnabled();
  await update.click();
  await expect(dialog).toBeHidden();
  await expect(widget.getByRole('heading', { name: 'My unlisted pool' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview article', exact: true }).click();
  await expect(widget.getByRole('button', { name: 'Edit pool', exact: true })).toHaveCount(0);
  for (const width of [1440, 375])
    for (const theme of ['Light', 'Dark']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('button', { name: theme, exact: true }).click();
      await expect(widget.getByRole('link', { name: 'Build this pool' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await widget.screenshot({
        path: `${screenshots}${width}-${theme.toLowerCase()}.png`,
        animations: 'disabled',
      });
    }
  const build = widget.getByRole('link', { name: 'Build this pool' });
  await expect(build).toHaveAttribute('target', '_blank');
  await expect(build).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(build).toHaveAttribute('href', `/limited/pool/${ids[1]}/detail`);
  const popupPromise = page.waitForEvent('popup');
  await build.click();
  const popup = await popupPromise;
  await popup.waitForURL(new URL(`/limited/pool/${ids[1]}/detail`, origin).href);
  await popup.close();
  hidden = true;
  await page.evaluate(() => window.refreshPoolWidgets());
  await expect(widget.getByRole('alert')).toContainText('Sealed pool unavailable');
  await expect(widget.locator('.today-leader')).toHaveCount(0);
  await expect(widget).not.toContainText('My unlisted pool');
  hidden = false;
  await widget.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(widget.getByRole('heading', { name: 'My unlisted pool' })).toBeVisible();
  initial = saved;
  await page.reload();
  await expect(widget.getByRole('heading', { name: 'My sealed pool' })).toBeVisible();
  empty = true;
  await page.evaluate(() => window.refreshPoolWidgets());
  await expect(
    widget.getByRole('heading', {
      name: 'A custom sealed pool with no leaders and a longer title',
    }),
  ).toBeVisible();
  await expect(widget.locator('.today-leader')).toHaveCount(0);
  await expect(widget.getByRole('link', { name: 'Build this pool' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: /pool and /sealed, URL/ID lookup, private/invalid input, insert/edit/cancel, reference-only save and reload, published fan, new-tab link, revoked access and retry, narrow/wide light/dark, leaderless pool.',
  );
} finally {
  await browser?.close();
  await vite.close();
}
