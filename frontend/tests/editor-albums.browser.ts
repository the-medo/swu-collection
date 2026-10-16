// EDITOR_ALBUMS_TEST=1 bun frontend/tests/editor-albums.browser.ts
// Uses the real editor with API fixtures; no article or album is written.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import type { UserAlbum, UserAlbumPage } from '../../types/UserAlbum.ts';
import type { PostDocument } from '../../shared/posts/content.ts';

const origin = process.env.EDITOR_TEST_ORIGIN ?? 'http://localhost:5178';
if (
  process.env.EDITOR_ALBUMS_TEST !== '1' ||
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
)
  throw new Error('Explicitly enable this check against a local worktree frontend.');
const expect = baseExpect.configure({ timeout: 15_000 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
const errors: string[] = [];
const requests: string[] = [];
page.on('pageerror', error => errors.push(error.message));
// Prevent a cookie-banner dismissal from stealing editor focus during slash selection.
await page.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
const screenshots = new URL('../../.swubase/editor-album-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const url = `${origin}/users/swubase`;
let initial: PostDocument | undefined;
let editorType: 'rich' | 'comments' = 'rich';
let viewer: string | null = 'album-author';
let listError = true;
let empty = false;
let detailError = false;
let detailStatus = 404;
let waitForDetail: Promise<void> | undefined;
const album = (
  index: number,
  title: string,
  visibility: UserAlbum['visibility'],
  count: number,
): UserAlbumPage => {
  const id = `${index}1111111-1111-4111-8111-111111111111`;
  const images = Array.from({ length: count }, (_, position) => ({
    fileId: `${id}-${position}`,
    thumbnailUrl: `${origin}/album-fixture-images/${index}/${position}.svg`,
    url: `${origin}/album-fixture-original/${index}/${position}.jpg`,
    width: 1000,
    height: 800,
    caption: '',
    altText: `Photo ${position + 1} in ${title}`,
    position,
  }));
  return {
    album: {
      id,
      userId: 'album-author',
      title,
      visibility,
      imageCount: count,
      description: 'A weekend of great games, familiar faces, and new memories.',
      coverFileId: images[0]?.fileId ?? null,
      cover: images[0] ?? null,
      tournamentId: null,
      tournament: null,
      revision: 1,
      createdAt: '2026-10-16T10:00:00Z',
      updatedAt: '2026-10-16T10:00:00Z',
    },
    owner: { id: 'album-author', displayName: 'Leia' },
    images,
    hasMore: false,
  };
};
const publicAlbum = album(1, 'Galactic Championship · Prague', 'public', 6);
const smallAlbum = album(2, 'Friday with the squad', 'unlisted', 2);
const privateAlbum = album(3, 'Older private album', 'private', 0);
const allAlbums = [publicAlbum, smallAlbum, privateAlbum];
await page.route(`${url}**`, route =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body><div id="root"></div>
<script>window.editorFixtureInitialContent = ${JSON.stringify(initial) ?? 'undefined'}; window.editorFixtureOptions = { type: '${editorType}' };</script>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script>
<script type="module" src="/@vite/client"></script><script type="module" src="/tests/rich-text-editor.harness.tsx"></script></body></html>`,
  }),
);
await page.route('**/api/auth/get-session**', route =>
  route.fulfill({
    json: viewer
      ? {
          user: {
            id: viewer,
            name: 'Leia',
            displayName: 'Leia',
            email: 'album@example.invalid',
            emailVerified: false,
            role: 'user',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          session: { id: 'album-session', userId: viewer, expiresAt: '2099-01-01T00:00:00Z' },
        }
      : null,
  }),
);
await page.route(`${origin}/api/user-albums**`, async route => {
  const request = route.request();
  expect(request.method()).toBe('GET');
  const location = new URL(request.url());
  requests.push(location.pathname);
  const id = location.pathname.split('/')[3];
  if (!id) {
    const older = location.searchParams.has('beforeId');
    return route.fulfill(
      listError
        ? { status: 503, json: { message: 'Try later' } }
        : {
            json: {
              data: {
                albums: empty
                  ? []
                  : (older ? [privateAlbum] : [publicAlbum, smallAlbum]).map(item => item.album),
                hasMore: !empty && !older,
                nextCursor:
                  !empty && !older
                    ? { beforeCreatedAt: smallAlbum.album.createdAt, beforeId: smallAlbum.album.id }
                    : null,
              },
            },
          },
    );
  }
  await waitForDetail;
  const data = allAlbums.find(item => item.album.id === id);
  return route.fulfill(
    detailError || !data || (data.album.visibility === 'private' && viewer !== data.album.userId)
      ? { status: detailError ? detailStatus : 404, json: { message: 'Album unavailable' } }
      : { json: { data } },
  );
});
await page.route('**/album-fixture-images/**', route => {
  const index = Number(route.request().url().split('/').at(-1)?.split('.')[0]);
  const colors = ['#326149', '#526f97', '#a97243', '#705d88'];
  return route.fulfill({
    contentType: 'image/svg+xml',
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${colors[index % 4]}"/><circle cx="300" cy="70" r="38" fill="#f5dfb1"/><path d="M0 250L100 100L230 240L310 150L400 260V300H0Z" fill="#17352e"/><path d="M0 285L200 230L400 280V300H0Z" fill="#b9d4a8" opacity=".5"/></svg>`,
  });
});
const editor = page.locator('[contenteditable=true]').first();
const dialog = page.getByRole('dialog');
const preview = dialog.getByRole('region', { name: 'Album preview' });
const insert = dialog.getByRole('button', { name: 'Insert album', exact: true });
const widget = page.locator('[data-widget-kind="album"]');
async function open() {
  await editor.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/album');
  await expect(page.getByRole('option', { name: /^Add album/ })).toBeVisible();
  await page.getByRole('option', { name: /^Add album/ }).click();
  await expect(dialog).toBeVisible();
}
async function invalidateAlbums() {
  await page.evaluate(async () => {
    const path = '/src/queryClient.ts';
    const { queryClient } = await import(path);
    await queryClient.invalidateQueries({ queryKey: ['user-albums'] });
  });
}
try {
  await page.goto(url);
  await open();
  await expect(dialog.getByRole('alert')).toContainText('Could not load your albums');
  await expect(insert).toBeDisabled();
  listError = false;
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /^Choose album:/ })).toHaveCount(2);
  await dialog.getByLabel('Your albums', { exact: true }).fill('Older');
  await expect(dialog).toContainText('No matching albums');
  await dialog.getByRole('button', { name: 'Load more albums', exact: true }).click();
  await dialog.getByRole('button', { name: `Choose album: ${privateAlbum.album.title}` }).click();
  await expect(preview).toContainText('No photos yet');
  await expect(preview.locator('img')).toHaveCount(0);
  await expect(dialog).toContainText('Only you can see this private album');
  await expect(insert).toBeEnabled();
  await dialog.getByLabel('Your albums', { exact: true }).fill('Galactic');
  let releaseDetail!: () => void;
  waitForDetail = new Promise<void>(resolve => {
    releaseDetail = resolve;
  });
  detailError = true;
  detailStatus = 503;
  await dialog.getByRole('button', { name: `Choose album: ${publicAlbum.album.title}` }).click();
  await expect(dialog).toContainText('Loading album preview');
  await expect(insert).toBeDisabled();
  releaseDetail();
  waitForDetail = undefined;
  await expect(dialog.getByRole('alert')).toContainText('Could not load album preview');
  await expect(insert).toBeDisabled();
  detailError = false;
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(preview.locator('img')).toHaveCount(4);
  await expect(preview).toContainText('+2');
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    // The dialog is portaled; theme tokens follow the root without changing selection.
    await page.evaluate(theme => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(insert).toBeInViewport();
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(901);
      await dialog.screenshot({
        path: `${screenshots}picker-${width}-${theme}.png`,
        animations: 'disabled',
      });
    }
  }
  await insert.click();
  await expect(dialog).toBeHidden();
  await expect(editor).toBeFocused();
  await expect(widget.locator('img')).toHaveCount(4);
  const saved = await page.evaluate(() => window.editorFixtureDocument);
  const albumBlocks = saved.blocks.filter(block => block.type === 'swuBlock');
  expect(albumBlocks).toHaveLength(1);
  expect(JSON.parse(albumBlocks[0].props.data)).toEqual({
    kind: 'album',
    albumId: publicAlbum.album.id,
  });
  const openLink = widget.getByRole('link', { name: /Open album:/ });
  await expect(openLink).toHaveAttribute('href', `/albums/${publicAlbum.album.id}`);
  await expect(openLink).toHaveAttribute('target', '_blank');
  await expect(openLink).toHaveAttribute('rel', 'noopener noreferrer');
  await widget.getByRole('button', { name: 'Edit album', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Edit album', exact: true })).toBeVisible();
  await expect(preview).toContainText(publicAlbum.album.title);
  await dialog.getByRole('button', { name: `Choose album: ${smallAlbum.album.title}` }).click();
  await expect(preview.locator('img')).toHaveCount(2);
  await expect(dialog).toContainText(
    'Readers of your article will be able to open this unlisted album',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => window.editorFixtureDocument)).toEqual(saved);
  await expect(widget.getByRole('button', { name: 'Edit album', exact: true })).toBeFocused();
  await widget.getByRole('button', { name: 'Edit album', exact: true }).click();
  await dialog.getByRole('button', { name: `Choose album: ${smallAlbum.album.title}` }).click();
  await dialog.getByRole('button', { name: 'Update album', exact: true }).click();
  await expect(widget.locator('img')).toHaveCount(2);
  await expect(widget).toHaveCount(1);
  // Editing a deleted or inaccessible album prompts a replacement without a futile retry.
  detailStatus = 404;
  detailError = true;
  await invalidateAlbums();
  await widget.getByRole('button', { name: 'Edit album', exact: true }).click();
  await expect(dialog).toContainText('Choose another album above');
  await expect(dialog.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Update album', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  detailError = false;
  await widget.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(widget.locator('img')).toHaveCount(2);
  await page.getByRole('button', { name: 'Preview post', exact: true }).click();
  await expect(widget.getByRole('button', { name: 'Edit album', exact: true })).toHaveCount(0);
  await expect(widget.locator('img')).toHaveCount(2);
  // A failed refresh hides the cached preview until a successful access check.
  detailStatus = 503;
  detailError = true;
  await invalidateAlbums();
  await expect(widget).toContainText('Could not load album');
  await expect(widget.locator('img')).toHaveCount(0);
  detailError = false;
  await widget.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(widget.locator('img')).toHaveCount(2);
  // Revoked access must hide formerly cached metadata and thumbnails.
  detailStatus = 404;
  detailError = true;
  await invalidateAlbums();
  await expect(widget).toContainText('Album unavailable');
  await expect(widget.locator('img')).toHaveCount(0);
  await expect(widget).not.toContainText(smallAlbum.album.title);
  detailError = false;
  await widget.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(widget.locator('img')).toHaveCount(2);
  // Reader mode reloads the reference; no title or photo URL is stored in the post.
  initial = saved;
  viewer = null;
  await page.reload();
  await expect(widget.locator('img')).toHaveCount(4);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await widget.screenshot({ path: `${screenshots}article-preview.png`, animations: 'disabled' });
  initial = {
    version: 1,
    blocks: [
      {
        id: 'private',
        type: 'swuBlock',
        props: { data: JSON.stringify({ kind: 'album', albumId: privateAlbum.album.id }) },
        children: [],
      },
    ],
  };
  await page.reload();
  await expect(widget).toContainText('Album unavailable');
  await expect(widget).not.toContainText(privateAlbum.album.title);
  await expect(widget.locator('img')).toHaveCount(0);
  // Signed-out and empty-library states cannot insert albums.
  initial = undefined;
  await page.reload();
  await open();
  await expect(dialog).toContainText('Sign in to choose one of your albums');
  await expect(insert).toBeDisabled();
  await page.keyboard.press('Escape');
  viewer = 'album-author';
  empty = true;
  await page.reload();
  await open();
  await expect(dialog).toContainText('Your stories deserve a photo album');
  await expect(insert).toBeDisabled();
  await page.keyboard.press('Escape');
  editorType = 'comments';
  await page.reload();
  await editor.focus();
  await page.keyboard.type('/album');
  await expect(page.getByRole('option', { name: /^Add album/ })).toHaveCount(0);
  expect(requests).not.toContain('/api/user-albums/');
  expect(requests).not.toContain('/api/user-albums/undefined');
  expect(errors).toEqual([]);
  console.log(
    'PASS: album command, own-album paging/search, loading/error/retry/empty states, four-photo preview, privacy changes, insert/edit/cancel, read-only reload, new-tab links, mobile and light/dark layouts.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  await page.screenshot({ path: `${screenshots}failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
