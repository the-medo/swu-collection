// USER_UPLOADS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-uploads.browser.ts
// Runs against an isolated worktree with a temporary session. Upload responses are
// mocked to test browser gestures, queueing and errors without writing to R2.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir, writeFile } from 'node:fs/promises';
import type { UserFile } from '../../types/UserFile.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.USER_UPLOADS_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable this test against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 1 });
const userId = `uploads-browser-${crypto.randomUUID()}`;
const token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
await context.addInitScript(() => {
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
const png = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#4686c2' } })
  .png()
  .toBuffer();
const webp = await sharp(png).webp().toBuffer();
const files: UserFile[] = [];
let uploads = 0,
  active = 0,
  maxActive = 0;
let failNext = false;
let gate: Promise<void> | undefined;
let release: (() => void) | undefined;
let listGate: Promise<void> | undefined;
let releaseList: (() => void) | undefined;
let failListPage: number | undefined;
let holdFirstPage = false;
const listRequests: number[] = [];
let quotaBytes = 100_000_000;
const screenshots = new URL('../../.swubase/upload-dropzone/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const desktopImage = `${screenshots}/desktop-drop.png`;
await writeFile(desktopImage, png);
const box = page.getByRole('region', { name: 'Upload images', exact: true });
const uploadButton = box.getByRole('button', { name: /^(Upload images|Uploading )/ });

await page.route('https://images.swubase.com/user-files/browser-test/**', route =>
  route.fulfill({ contentType: 'image/webp', body: webp }),
);
await page.route(/^https?:\/\/[^/]+\/api\/user-files(?:[/?]|$)/, async route => {
  if (route.request().method() === 'GET') {
    const pageIndex = Number(new URL(route.request().url()).searchParams.get('page') ?? 0);
    listRequests.push(pageIndex);
    if (pageIndex > 0 || holdFirstPage) await listGate;
    if (pageIndex === failListPage) {
      await route.fulfill({
        status: 503,
        json: {
          error: pageIndex ? 'Could not load more images.' : 'Could not load your image library.',
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          files: files.slice(pageIndex * 12, (pageIndex + 1) * 12),
          usedBytes: files.length * webp.length * 2,
          quotaBytes,
          fileCount: files.length,
          hasMore: (pageIndex + 1) * 12 < files.length,
          uploadsEnabled: true,
        },
      },
    });
    return;
  }
  if (route.request().method() === 'DELETE') {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)!;
    const index = files.findIndex(file => file.id === id);
    expect(index).toBeGreaterThanOrEqual(0);
    files.splice(index, 1);
    await route.fulfill({ json: { data: { id } } });
    return;
  }
  if (route.request().method() !== 'POST') return route.continue();
  uploads++;
  active++;
  maxActive = Math.max(active, maxActive);
  try {
    await gate;
    if (failNext) {
      failNext = false;
      await route.fulfill({
        status: 503,
        json: { error: 'Image storage is temporarily unavailable.' },
      });
      return;
    }
    const form = await new Request(route.request().url(), {
      method: 'POST',
      headers: { 'Content-Type': route.request().headers()['content-type'] },
      body: route.request().postDataBuffer()!,
    }).formData();
    const file = form.get('file') as File;
    const id = crypto.randomUUID();
    const data: UserFile = {
      id,
      fileName: file.name,
      originalByteSize: file.size,
      byteSize: webp.length,
      thumbnailByteSize: webp.length,
      width: 320,
      height: 180,
      createdAt: new Date().toISOString(),
      url: `https://images.swubase.com/user-files/browser-test/${id}.webp`,
      thumbnailUrl: `https://images.swubase.com/user-files/browser-test/${id}-thumb.webp`,
    };
    files.unshift(data);
    await route.fulfill({ status: 201, json: { data } });
  } finally {
    active--;
  }
});

async function transfer(names: string[], type = 'image/png', size?: number) {
  return page.evaluateHandle(
    ({ names, type, bytes, size }) => {
      const data = new DataTransfer();
      for (const name of names)
        data.items.add(
          new File([size ? new Uint8Array(size) : new Uint8Array(bytes)], name, { type }),
        );
      return data;
    },
    { names, type, bytes: Array.from(png), size },
  );
}
async function pasteImage() {
  await page.evaluate(async bytes => {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': new Blob([new Uint8Array(bytes)], { type: 'image/png' }) }),
    ]);
  }, Array.from(png));
  await page.keyboard.press('Control+V');
}
async function dropFromDesktop() {
  await box.scrollIntoViewIfNeeded();
  const bounds = (await box.boundingBox())!;
  // Native drag data is needed here: script-created DataTransfer objects ignore
  // writes to dropEffect and synthetic drops bypass the browser's acceptance check.
  const observed = await page.evaluateHandle(() => {
    const state = { prevented: false, effect: '', trusted: false };
    document.addEventListener(
      'dragover',
      event => {
        state.prevented = event.defaultPrevented;
        state.effect = event.dataTransfer?.dropEffect ?? '';
        state.trusted = event.isTrusted;
      },
      { once: true },
    );
    return state;
  });
  const input = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    data: { items: [], files: [desktopImage], dragOperationsMask: 1 },
  };
  await cdp.send('Input.dispatchDragEvent', { ...input, type: 'dragEnter' });
  await cdp.send('Input.dispatchDragEvent', { ...input, type: 'dragOver' });
  expect(await observed.jsonValue()).toEqual({ prevented: true, effect: 'copy', trusted: true });
  await cdp.send('Input.dispatchDragEvent', { ...input, type: 'drop' });
  await observed.dispose();
}
async function dismissToast() {
  await page.locator('[toast-close]').click();
  await expect(page.locator('[toast-close]')).toBeHidden();
}

try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${userId}, ${userId}, ${userId}, ${userId + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
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
  await page.goto(`${origin}/settings?page=uploads`);
  await expect(page.getByRole('region', { name: 'Upload', exact: true })).toBeVisible();
  const gallery = page.getByRole('region', { name: 'Gallery', exact: true });
  await expect(gallery).toBeVisible();
  await expect(box.getByRole('button', { name: 'Upload images', exact: true })).toBeEnabled();
  expect(await box.evaluate(element => getComputedStyle(element).borderStyle)).toBe('dashed');
  expect(
    await box.evaluate(element => parseFloat(getComputedStyle(element).borderRadius)),
  ).toBeGreaterThan(0);
  await box.screenshot({ path: `${screenshots}/desktop-light.png`, animations: 'disabled' });
  const chooser = page.waitForEvent('filechooser');
  await box.getByRole('button', { name: 'Upload images', exact: true }).click();
  await (await chooser).setFiles({ name: 'selected.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'View selected.png', exact: true })).toBeVisible();

  const dropped = await transfer(['drop-a.png', 'drop-b.png']);
  await box.dispatchEvent('dragenter', { dataTransfer: dropped });
  await expect(box.getByText('Drop to upload', { exact: true })).toBeVisible();
  await uploadButton.dispatchEvent('dragenter', { dataTransfer: dropped });
  await uploadButton.dispatchEvent('dragleave', { dataTransfer: dropped });
  await expect(box.getByText('Drop to upload', { exact: true })).toBeVisible();
  gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await box.dispatchEvent('drop', { dataTransfer: dropped });
  await expect(box.getByRole('status')).toHaveText('Optimizing and uploading image 1 of 2…');
  await expect(uploadButton).toBeDisabled();
  // A second event during the batch must not start another request.
  const busyPaste = await transfer(['overlap.png']);
  await dropFromDesktop();
  await expect(
    page.getByText('Wait for your current images to finish uploading.', { exact: true }),
  ).toBeVisible();
  await dismissToast();
  await page.evaluate(
    data =>
      document.body.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
      ),
    busyPaste,
  );
  await expect(
    page.getByText('Wait for your current images to finish uploading.', { exact: true }),
  ).toBeVisible();
  await expect.poll(() => uploads).toBe(2);
  release!();
  gate = undefined;
  await expect(page.getByRole('button', { name: 'View drop-b.png', exact: true })).toBeVisible();
  await expect(uploadButton).toBeEnabled();
  expect(maxActive).toBe(1);
  expect(files).toHaveLength(3);
  await uploadButton.focus();
  await pasteImage();
  await expect.poll(() => files.length).toBe(4);
  await expect(uploadButton).toBeEnabled();
  console.log(
    'File button, nested drag highlighting, sequential multi-drop, busy guard and real clipboard image paste passed',
  );

  const previous = uploads;
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Paste test field');
    document.body.append(input);
  });
  const field = page.getByRole('textbox', { name: 'Paste test field' });
  await field.focus();
  await page.evaluate(() => navigator.clipboard.writeText('ordinary pasted text'));
  await page.keyboard.press('Control+V');
  await expect(field).toHaveValue('ordinary pasted text');
  expect(
    await field.evaluate((element, data) => {
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }, dropped),
  ).toBe(false);
  await field.evaluate(element => element.remove());
  await page.getByRole('button', { name: 'View selected.png', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await pasteImage();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(uploads).toBe(previous);

  const mixed = await transfer(['valid-before.png']);
  await mixed.evaluate(data => {
    data.items.add(new File(['not an image'], 'notes.txt', { type: 'text/plain' }));
    data.items.add(new File([data.files[0]!], 'valid-after.png', { type: 'image/png' }));
  });
  await box.dispatchEvent('drop', { dataTransfer: mixed });
  await expect(
    page.getByText('notes.txt: choose a JPEG, PNG, WebP or still GIF image.', { exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(previous);
  await box.dispatchEvent('drop', {
    dataTransfer: await transfer(['vector.svg'], 'image/svg+xml'),
  });
  await expect(
    page.getByText('vector.svg: choose a JPEG, PNG, WebP or still GIF image.', { exact: true }),
  ).toBeVisible();
  await box.dispatchEvent('drop', {
    dataTransfer: await transfer(['large.png'], 'image/png', 10_000_001),
  });
  await expect(
    page.getByText('large.png: images must be 10 MB or smaller.', { exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(previous);
  expect(
    await page.evaluate(data => {
      const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    }, dropped),
  ).toBe(true);

  failNext = true;
  await box.dispatchEvent('drop', { dataTransfer: await transfer(['retry.png']) });
  await expect(
    page.getByText('Image storage is temporarily unavailable.', { exact: true }),
  ).toBeVisible();
  await expect(uploadButton).toBeEnabled();
  await box.dispatchEvent('drop', { dataTransfer: await transfer(['retry.png']) });
  await expect(page.getByRole('button', { name: 'View retry.png', exact: true })).toBeVisible();
  console.log(
    'Text editing, modal paste, mixed/invalid/oversized files, missed drops and retry after failure passed',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await page.reload();
  await expect(uploadButton).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await box.screenshot({ path: `${screenshots}/mobile-dark.png`, animations: 'disabled' });
  quotaBytes = files.length * webp.length * 2;
  await page.reload();
  await expect(uploadButton).toBeDisabled();
  const fullCount = uploads;
  await dropFromDesktop();
  await expect(page.getByText('Delete an image to make room.', { exact: true })).toBeVisible();
  expect(uploads).toBe(fullCount);
  await dismissToast();
  await box.getByText('Add images to your library').click();
  await pasteImage();
  await expect(page.getByText('Delete an image to make room.', { exact: true })).toBeVisible();
  expect(uploads).toBe(fullCount);
  await dismissToast();
  await page.getByRole('combobox', { name: 'Settings section' }).click();
  await page.getByRole('option', { name: 'Profile', exact: true }).click();
  await expect(box).toBeHidden();
  const afterNavigation = await transfer(['after-navigation.png']);
  expect(
    await page.evaluate(data => {
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    }, afterNavigation),
  ).toBe(false);
  expect(uploads).toBe(fullCount);
  expect(errors).toEqual([]);
  console.log('Mobile/dark layout, quota guard and page-scoped clipboard cleanup passed');

  const example = files[0]!;
  files.splice(
    0,
    files.length,
    ...Array.from({ length: 25 }, (_, index) => {
      const id = crypto.randomUUID();
      return {
        ...example,
        id,
        fileName: `gallery-${String(index).padStart(2, '0')}.png`,
        createdAt: new Date(Date.UTC(2026, 0, 25 - index)).toISOString(),
        url: `https://images.swubase.com/user-files/browser-test/${id}.webp`,
        thumbnailUrl: `https://images.swubase.com/user-files/browser-test/${id}-thumb.webp`,
      };
    }),
  );
  quotaBytes = 100_000_000;
  listRequests.length = 0;
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.goto(`${origin}/settings?page=uploads`);
  const tiles = gallery.getByRole('button', { name: /^View / });
  const loadMore = gallery.getByRole('button', { name: 'Load more images', exact: true });
  await expect(tiles).toHaveCount(12);
  expect(listRequests.every(index => index === 0)).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Image gallery pages' })).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/desktop-sections.png`, animations: 'disabled' });
  listGate = new Promise<void>(resolve => {
    releaseList = resolve;
  });
  // Focus scrolls the footer into view without activating it: intersection must
  // fetch the batch and leave focus on the control while it still exists.
  await loadMore.focus();
  await expect(gallery.getByText('Loading more images…', { exact: true })).toBeVisible();
  await expect(tiles).toHaveCount(12);
  await expect(loadMore).toBeDisabled();
  releaseList!();
  listGate = undefined;
  await expect(tiles).toHaveCount(24);
  await expect(loadMore).toBeFocused();
  expect(listRequests.filter(index => index === 1)).toHaveLength(1);
  failListPage = 2;
  await loadMore.scrollIntoViewIfNeeded();
  await expect(gallery.getByRole('alert')).toHaveText('Could not load more images.Try again');
  await expect(tiles).toHaveCount(24);
  // A failed request must not restart just because the sentinel remains visible.
  await page.waitForTimeout(400);
  expect(listRequests.filter(index => index === 2)).toHaveLength(1);
  failListPage = undefined;
  await gallery.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(tiles).toHaveCount(25);
  await expect(loadMore).toHaveCount(0);
  await expect(gallery.getByRole('status')).toHaveText('25 of 25 images');
  const displayedNames = () =>
    tiles.evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  expect(await displayedNames()).toEqual(files.map(file => `View ${file.fileName}`));
  expect(listRequests.every(index => index <= 2)).toBe(true);

  const nextChooser = page.waitForEvent('filechooser');
  await uploadButton.click();
  await (
    await nextChooser
  ).setFiles({ name: 'after-scroll.png', mimeType: 'image/png', buffer: png });
  await expect(tiles).toHaveCount(26);
  expect(await displayedNames()).toEqual(files.map(file => `View ${file.fileName}`));
  await dismissToast();
  await gallery.getByRole('button', { name: 'View gallery-00.png', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete image', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(tiles).toHaveCount(25);
  expect(await displayedNames()).toEqual(files.map(file => `View ${file.fileName}`));
  await expect(page.getByRole('progressbar', { name: 'Image storage used' })).toHaveAttribute(
    'value',
    String(files.length * webp.length * 2),
  );
  await expect(loadMore).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'Separate sections, 12-image batches, infinite scroll, retry without a loop, and upload/delete refresh passed',
  );

  // Suppress observer events in this last scenario to exercise the keyboard
  // fallback independently from the automatic scrolling tested above.
  await page.addInitScript(() => {
    IntersectionObserver.prototype.observe = () => {};
  });
  failListPage = 0;
  listRequests.length = 0;
  await page.goto(`${origin}/settings?page=uploads`);
  await expect(uploadButton).toBeDisabled();
  await expect(
    page.getByRole('region', { name: 'Upload', exact: true }).getByRole('status'),
  ).toHaveText('Uploads are unavailable until your library loads. Use Try again in Gallery below.');
  await expect(gallery.getByRole('alert')).toContainText('Could not load your image library.');
  failListPage = undefined;
  holdFirstPage = true;
  listGate = new Promise<void>(resolve => {
    releaseList = resolve;
  });
  await gallery.getByRole('button', { name: 'Try again', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Upload', exact: true }).getByRole('status'),
  ).toHaveText('Checking available storage…');
  releaseList!();
  listGate = undefined;
  holdFirstPage = false;
  await expect(tiles).toHaveCount(12);
  await expect(tiles.first()).toBeFocused();
  listGate = new Promise<void>(resolve => {
    releaseList = resolve;
  });
  await loadMore.focus();
  await page.keyboard.press('Enter');
  await expect(loadMore).toHaveAttribute('aria-disabled', 'true');
  await expect(loadMore).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  expect(listRequests.filter(index => index === 1)).toHaveLength(1);
  releaseList!();
  listGate = undefined;
  await expect(tiles).toHaveCount(24);
  await expect(tiles.nth(12)).toBeFocused();
  await loadMore.focus();
  await page.keyboard.press('Enter');
  await expect(tiles).toHaveCount(25);
  await expect(tiles.nth(24)).toBeFocused();
  await expect(loadMore).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'Initial-error recovery and keyboard loading preserve focus through busy and final batches',
  );
  files.length = 0;
  quotaBytes = 0;
  failListPage = 0;
  await page.goto(`${origin}/settings?page=uploads`);
  await expect(gallery.getByRole('alert')).toContainText('Could not load your image library.');
  failListPage = undefined;
  await gallery.getByRole('button', { name: 'Try again', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(gallery.getByText('Your image library starts here', { exact: true })).toBeVisible();
  await expect(uploadButton).toBeDisabled();
  await expect(gallery.getByRole('heading', { name: 'Gallery', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
  console.log('Empty-library recovery preserves focus even when uploads are disabled');
} catch (error) {
  if (errors.length) console.error('Browser page errors:', errors);
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  throw error;
} finally {
  release?.();
  releaseList?.();
  await browser.close();
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
