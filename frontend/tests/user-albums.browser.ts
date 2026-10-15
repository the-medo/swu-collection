// USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-albums.browser.ts
// Real album API/database, temporary accounts, mocked image bytes and upload storage.
import { chromium, expect as baseExpect, type Locator } from 'playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { createUserFileService } from '../../server/lib/user-files/service.ts';
import { db } from '../../server/db/index.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.USER_ALBUMS_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 1 });
const owner = `album-browser-${crypto.randomUUID()}`;
const token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const visitor = await anonymous.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
visitor.on('pageerror', error => errors.push(error.message));
const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#4686c2' } })
  .png()
  .toBuffer();
const screenshots = new URL('../../.swubase/user-albums/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
let uploadCount = 0;
let failAttachment = false;
let failAlbumRefresh = false;
let failDelete = false;
let failPrivacy = false;
let albumPatchRequests = 0;
let deleteRequests = 0;
const testStorage = createUserFileService({
  available: () => true,
  publicUrl: key => `https://images.swubase.com/${key}`,
  put: async () => undefined,
  remove: async () => undefined,
});
let uploadGate: Promise<void> | undefined;
let releaseUpload: (() => void) | undefined;
let albumWriteGate: Promise<void> | undefined;
let releaseAlbumWrite: (() => void) | undefined;
const seedImage = async (index: number, filename = `Album photo ${index}.png`) => {
  const id = crypto.randomUUID();
  const imageKey = `user-files/${owner}/${id}.webp`;
  const thumbnailKey = `user-files/${owner}/${id}-thumb.webp`;
  await sql`INSERT INTO user_file (id, user_id, file_name, image_key, thumbnail_key, original_byte_size, byte_size, thumbnail_byte_size, width, height, created_at)
    VALUES (${id}, ${owner}, ${filename}, ${imageKey}, ${thumbnailKey}, 1000, 800, 200, 600, 400, ${new Date(Date.now() - index * 1000)})`;
  return {
    id,
    fileName: filename,
    originalByteSize: 1000,
    byteSize: 800,
    thumbnailByteSize: 200,
    width: 600,
    height: 400,
    createdAt: new Date().toISOString(),
    url: `https://images.swubase.com/${imageKey}`,
    thumbnailUrl: `https://images.swubase.com/${thumbnailKey}`,
  };
};
for (const ctx of [context, anonymous]) {
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
  });
  await ctx.route(`https://images.swubase.com/user-files/${owner}/**`, route =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
}
await context.route('**/api/user-files*', async route => {
  if (route.request().method() === 'POST') {
    uploadCount++;
    if (uploadGate) await uploadGate;
    const saved = await seedImage(-uploadCount, `New upload ${uploadCount}.png`);
    return route.fulfill({ status: 201, json: { data: saved } });
  }
  if (route.request().method() === 'GET') {
    const response = await route.fetch();
    const body = await response.json();
    body.data.uploadsEnabled = true;
    return route.fulfill({ response, json: body });
  }
  return route.continue();
});
await context.route(/\/api\/user-files\/[^/?]+$/, async route => {
  if (route.request().method() !== 'DELETE') return route.continue();
  deleteRequests++;
  if (failDelete) {
    failDelete = false;
    return route.fulfill({
      status: 503,
      json: { message: 'Could not delete the image. Please try again.' },
    });
  }
  const id = new URL(route.request().url()).pathname.split('/').at(-1)!;
  await testStorage.remove(owner, id);
  return route.fulfill({ json: { data: { id } } });
});
await context.route('**/api/user-albums/*/images', route => {
  if (route.request().method() === 'POST' && failAttachment) {
    failAttachment = false;
    return route.fulfill({ status: 503, json: { message: 'Temporary album error.' } });
  }
  return route.continue();
});
for (const activePage of [page, visitor]) {
  await activePage.addLocatorHandler(
    activePage.getByRole('button', { name: 'Dismiss', exact: true }),
    () => activePage.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
await context.route(/\/api\/user-albums\/[0-9a-f-]+(?:\?|$)/, async route => {
  if (route.request().method() === 'PATCH') albumPatchRequests++;
  if (route.request().method() === 'PATCH' && failPrivacy) {
    failPrivacy = false;
    return route.fulfill({ status: 503, json: { message: 'Could not save privacy.' } });
  }
  if (route.request().method() === 'PATCH' && albumWriteGate) await albumWriteGate;
  if (route.request().method() === 'GET' && failAlbumRefresh)
    return route.fulfill({ status: 503, json: { message: 'Temporary album refresh failure.' } });
  return route.continue();
});
async function choosePrivacy(control: Locator, value: string) {
  await control.click();
  await control.page().getByRole('option', { name: value, exact: true }).click();
}
const editor = page.getByRole('region', { name: 'Album editor', exact: true });
const albumImages = editor.getByRole('region', { name: 'Album images', exact: true });
async function visibility(value: 'private' | 'public' | 'unlisted') {
  await choosePrivacy(
    editor.getByRole('combobox', { name: /^Privacy for / }),
    value[0].toUpperCase() + value.slice(1),
  );
  await expect(editor.getByRole('combobox', { name: /^Privacy for / })).toBeEnabled();
  await expect(editor.getByText(new RegExp(`^${value} ·`))).toBeVisible();
}
try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at) VALUES (${owner}, 'Album browser', ${owner}, ${owner + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${owner}, now(), now())`;
  for (let i = 0; i < 14; i++) await seedImage(i);
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
  // Older settings links still select the renamed Albums tab.
  await page.goto(`${origin}/settings?page=uploads&uploadView=galleries`);
  await expect(page.getByRole('tab', { name: 'My albums', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(page.getByLabel('Visibility', { exact: true })).toHaveValue('unlisted');
  await page.getByLabel('Title', { exact: true }).fill('Tournament memories');
  await page.getByLabel('Description (optional)').fill('Pictures from our local events.');
  await page.getByRole('dialog').getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeVisible();
  const albumId = new URL(page.url()).searchParams.get('album')!;
  expect(albumId).toBeTruthy();
  expect(new URL(page.url()).searchParams.get('uploadView')).toBe('albums');
  expect(new URL(page.url()).searchParams.has('gallery')).toBe(false);
  await page.goto(`${origin}/settings?page=uploads&uploadView=galleries&gallery=${albumId}`);
  await expect(editor).toBeVisible();
  expect(new URL(page.url()).searchParams.has('gallery')).toBe(false);

  await expect(editor.getByText('unlisted · 0 images', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Edit album', exact: true }).click();
  await page.getByLabel('Description (optional)').fill('My unsaved album description');
  await sql`UPDATE user_album SET revision = revision + 1, description = 'Edited in another tab', visibility = 'private' WHERE id = ${albumId}`;
  failAlbumRefresh = true;
  await page.getByRole('button', { name: 'Save album', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'This album has changed.',
  );
  await expect(page.getByLabel('Description (optional)')).toHaveValue(
    'My unsaved album description',
  );
  failAlbumRefresh = false;
  await page.getByRole('button', { name: 'Keep edits using latest version' }).click();
  await expect(page.getByLabel('Visibility', { exact: true })).toHaveValue('private');
  await expect(page.getByLabel('Description (optional)')).toHaveValue(
    'My unsaved album description',
  );
  await page.getByRole('button', { name: 'Save album', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(editor.getByText('My unsaved album description', { exact: true })).toBeVisible();
  await expect(editor.getByText('private · 0 images', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Edit album', exact: true }).click();
  await page.getByLabel('Description (optional)').fill('Updated description');
  await sql`UPDATE user_album SET revision = revision + 1, visibility = 'public' WHERE id = ${albumId}`;
  await page.getByRole('button', { name: 'Save album', exact: true }).click();
  await page.getByRole('button', { name: 'Keep edits using latest version' }).click();
  await expect(page.getByLabel('Visibility', { exact: true })).toHaveValue('public');
  await page.getByLabel('Visibility', { exact: true }).selectOption('private');
  await page.getByRole('button', { name: 'Save album', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(editor.getByText('private · 0 images', { exact: true })).toBeVisible();
  await visibility('unlisted');
  await editor.getByRole('button', { name: 'Album link', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Album link', exact: true })).toHaveValue(
    `${origin}/albums/${albumId}`,
  );
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Album link copied.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('button', { name: 'Album link', exact: true })).toBeFocused();

  await editor.getByRole('button', { name: 'Add existing images' }).click();
  const picker = page.getByRole('dialog');
  for (let i = 0; i < 12; i++)
    await picker.getByRole('button', { name: `Select Album photo ${i}.png`, exact: true }).click();
  await picker.getByRole('button', { name: 'Next', exact: true }).click();
  for (let i = 12; i < 14; i++)
    await picker.getByRole('button', { name: `Select Album photo ${i}.png`, exact: true }).click();
  await picker.getByRole('button', { name: 'Add 14 images', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(albumImages.locator('article')).toHaveCount(12);
  await albumImages.getByRole('button', { name: 'Load more images', exact: true }).click();
  await expect(albumImages.locator('article')).toHaveCount(14);
  await expect(
    albumImages.getByRole('button', { name: 'View image 13', exact: true }),
  ).toBeFocused();
  await albumImages.getByRole('button', { name: 'Edit details', exact: true }).first().click();
  await page.getByLabel('Caption', { exact: true }).fill('Final round');
  await sql`UPDATE user_album_item SET alt_text = 'Players at the final table' WHERE album_id = ${albumId} AND position = 0`;
  await sql`UPDATE user_album SET revision = revision + 1 WHERE id = ${albumId}`;
  await page.getByRole('button', { name: 'Save image details' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'This album has changed.',
  );
  await expect(page.getByLabel('Caption', { exact: true })).toHaveValue('Final round');
  await page.getByRole('button', { name: 'Keep edits using latest version' }).click();
  await expect(page.getByLabel('Image description (alt text)')).toHaveValue(
    'Players at the final table',
  );
  await expect(page.getByLabel('Caption', { exact: true })).toHaveValue('Final round');
  await page.getByRole('button', { name: 'Save image details' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(albumImages.locator('article').first()).toContainText('Final round');
  await albumImages.getByRole('button', { name: 'Move image 1 later', exact: true }).click();
  await expect(albumImages.locator('article').nth(1)).toContainText('Final round');
  // Native drag, with the same keyboard operations available to touch users.
  await albumImages.locator('article').nth(1).dragTo(albumImages.locator('article').first());
  await expect(albumImages.locator('article').first()).toContainText('Final round');
  albumWriteGate = new Promise<void>(resolve => {
    releaseAlbumWrite = resolve;
  });
  await albumImages
    .locator('article')
    .nth(1)
    .getByRole('button', { name: 'Set as cover', exact: true })
    .click();
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeDisabled();
  await editor.getByRole('region', { name: 'Upload images', exact: true }).evaluate(element => {
    const data = new DataTransfer();
    data.items.add(new File(['blocked'], 'busy.png', { type: 'image/png' }));
    element.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }),
    );
  });
  await expect(
    editor.getByText('Wait for the album to finish updating before uploading more images.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(uploadCount).toBe(0);
  releaseAlbumWrite!();
  albumWriteGate = undefined;

  await expect(
    albumImages.locator('article').nth(1).getByRole('button', { name: 'Cover image' }),
  ).toBeDisabled();
  await page.reload();
  await expect(editor).toBeVisible();
  await expect(albumImages.locator('article').first()).toContainText('Final round');
  await albumImages.getByRole('button', { name: 'View image 1: Final round', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'Players at the final table' }),
  ).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog').getByRole('heading')).toContainText('image 2');
  await page.keyboard.press('Escape');
  await expect(
    albumImages.getByRole('button', { name: 'View image 1: Final round', exact: true }),
  ).toBeFocused();
  await visitor.goto(`${origin}/galleries/${albumId}`);
  await expect(visitor).toHaveURL(`${origin}/albums/${albumId}`);
  await expect(
    visitor.getByRole('heading', { name: 'Tournament memories', exact: true }),
  ).toBeVisible();
  expect(await visitor.locator('meta[name="robots"]').getAttribute('content')).toBe(
    'noindex, nofollow',
  );
  const publicList = await anonymous.request.get(`${origin}/api/user-albums/by-user/${owner}`);
  expect((await publicList.json()).data.albums).toHaveLength(0);
  albumWriteGate = new Promise<void>(resolve => {
    releaseAlbumWrite = resolve;
  });
  await choosePrivacy(editor.getByRole('combobox', { name: /^Privacy for / }), 'Private');
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Edit album', exact: true })).toBeDisabled();
  releaseAlbumWrite!();
  albumWriteGate = undefined;
  await expect(editor.getByRole('combobox', { name: /^Privacy for / })).toHaveText('Private');
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeEnabled();
  await visitor.goto(`${origin}/galleries/${albumId}`);
  await expect(visitor).toHaveURL(`${origin}/albums/${albumId}`);
  await expect(visitor.getByText('Album not found.', { exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Album link', exact: true })).toHaveCount(0);
  await visibility('public');
  await visitor.goto(`${origin}/users/${owner}?userTab=galleries`);
  await expect(
    visitor
      .getByRole('region', { name: 'Public albums' })
      .getByText('Tournament memories', { exact: true }),
  ).toBeVisible();
  await visitor.goto(`${origin}/albums/${albumId}`);
  await expect(
    visitor.getByRole('heading', { name: 'Tournament memories', exact: true }),
  ).toBeVisible();
  await expect(visitor.getByRole('combobox', { name: /^Privacy for / })).toHaveCount(0);
  await expect(visitor.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(visitor).toHaveTitle('Tournament memories | SWUBase');
  await visitor.screenshot({ path: `${screenshots}/album-desktop.png`, fullPage: true });
  await page.evaluate(() => {
    localStorage.setItem('vite-ui-theme', 'dark');
  });
  await page.reload();
  await expect(editor).toBeVisible();
  await editor.screenshot({ path: `${screenshots}/editor-dark.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor.getByRole('button', { name: 'Add existing images' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await editor.screenshot({ path: `${screenshots}/editor-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 1100 });
  failAttachment = true;
  uploadGate = new Promise<void>(resolve => {
    releaseUpload = resolve;
  });
  const chooseFiles = page.waitForEvent('filechooser');
  await editor.getByRole('button', { name: 'Upload images', exact: true }).click();
  const fileChooser = await chooseFiles;
  expect(fileChooser.isMultiple()).toBe(true);
  await fileChooser.setFiles({ name: 'upload.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('tab', { name: 'All images', exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'View album', exact: true })).toBeDisabled();
  releaseUpload!();
  uploadGate = undefined;
  await expect(editor.getByRole('button', { name: 'Retry adding saved image' })).toBeVisible();
  expect(uploadCount).toBe(1);
  await editor.getByRole('button', { name: 'Retry adding saved image' }).click();
  await expect(editor.getByText('Saved image added to the album.', { exact: true })).toBeVisible();
  expect(uploadCount).toBe(1);
  await expect(editor.getByText('public · 15 images', { exact: true })).toBeVisible();
  await albumImages
    .locator('article')
    .first()
    .getByRole('button', { name: 'Remove from album' })
    .click();
  const removal = page.getByRole('alertdialog');
  await expect(
    removal.getByRole('checkbox', { name: 'Also delete the uploaded file' }),
  ).not.toBeChecked();
  expect(
    Number((await sql`SELECT count(*) FROM user_album_item WHERE album_id = ${albumId}`)[0].count),
  ).toBe(15);
  await removal.getByRole('button', { name: 'Keep image', exact: true }).click();
  expect(deleteRequests).toBe(0);
  await expect(
    albumImages.locator('article').first().getByRole('button', { name: 'Remove from album' }),
  ).toBeFocused();
  await albumImages
    .locator('article')
    .first()
    .getByRole('button', { name: 'Remove from album' })
    .click();
  await removal.getByRole('button', { name: 'Remove from album', exact: true }).click();
  await expect(removal).toBeHidden();
  await expect(
    albumImages.getByRole('button', { name: 'View image 1', exact: true }),
  ).toBeFocused();
  await expect(editor.getByText('public · 14 images', { exact: true })).toBeVisible();
  expect(
    Number((await sql`SELECT count(*) FROM user_file WHERE user_id = ${owner}`)[0].count),
  ).toBe(15);
  // Deleting the original is explicitly opted into and removes all memberships.
  const otherAlbum = crypto.randomUUID();
  const [sharedFile] =
    await sql`SELECT file_id FROM user_album_item WHERE album_id = ${albumId} ORDER BY position, file_id LIMIT 1`;
  await sql`INSERT INTO user_album (id, user_id, title) VALUES (${otherAlbum}, ${owner}, 'Another album')`;
  await sql`INSERT INTO user_album_item (album_id, file_id, position) VALUES (${otherAlbum}, ${sharedFile.file_id}, 0)`;
  await albumImages
    .locator('article')
    .first()
    .getByRole('button', { name: 'Remove from album' })
    .click();
  await removal.getByRole('checkbox', { name: 'Also delete the uploaded file' }).check();
  await expect(removal.getByText('2 albums use this file.', { exact: true })).toBeVisible();
  failDelete = true;
  await removal.getByRole('button', { name: 'Delete file everywhere' }).click();
  await expect(removal.getByRole('alert')).toContainText('Could not delete the image.');
  expect(
    Number(
      (await sql`SELECT count(*) FROM user_album_item WHERE file_id = ${sharedFile.file_id}`)[0]
        .count,
    ),
  ).toBe(2);
  await removal.getByRole('button', { name: 'Delete file everywhere' }).click();
  await expect(removal).toBeHidden();
  await expect(editor.getByText('public · 13 images', { exact: true })).toBeVisible();
  expect(
    Number(
      (await sql`SELECT count(*) FROM user_album_item WHERE file_id = ${sharedFile.file_id}`)[0]
        .count,
    ),
  ).toBe(0);
  expect(
    Number((await sql`SELECT count(*) FROM user_file WHERE user_id = ${owner}`)[0].count),
  ).toBe(14);
  expect(deleteRequests).toBe(2);
  await sql`DELETE FROM user_album WHERE id = ${otherAlbum}`;
  failAttachment = true;
  await page
    .getByLabel('Choose images', { exact: true })
    .setInputFiles({ name: 'saved-for-later.png', mimeType: 'image/png', buffer: png });
  await expect(editor.getByRole('button', { name: 'Retry adding saved image' })).toBeVisible();
  await editor.getByRole('button', { name: 'Keep in All images', exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeEnabled();
  await expect(editor.getByRole('button', { name: 'Retry adding saved image' })).toHaveCount(0);
  expect(uploadCount).toBe(2);
  expect(
    Number((await sql`SELECT count(*) FROM user_file WHERE user_id = ${owner}`)[0].count),
  ).toBe(15);
  await expect(editor.getByText('public · 13 images', { exact: true })).toBeVisible();

  await editor.getByRole('button', { name: 'Back to albums' }).click();
  const overview = page.getByRole('region', { name: 'My albums', exact: true });
  const albumCard = overview
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Tournament memories', exact: true }) });
  const privacy = albumCard.getByRole('combobox', { name: /^Privacy for / });
  await expect(albumCard.getByRole('button', { name: /^Manage album:/ })).toBeVisible();
  await expect(page.getByText('Organize your uploads without using extra storage.')).toHaveCount(0);
  await albumCard
    .getByRole('button', { name: 'Copy link to Tournament memories', exact: true })
    .click();
  await expect(
    albumCard.getByRole('button', { name: 'Copy link to Tournament memories', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${origin}/albums/${albumId}`,
  );
  // Clipboard permission failures offer a selectable URL and restore focus.
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: async () => {
        throw new Error('Clipboard unavailable');
      },
    });
  });
  await albumCard
    .getByRole('button', { name: 'Copy link to Tournament memories', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Album link' })).toHaveValue(
    `${origin}/albums/${albumId}`,
  );
  await page.keyboard.press('Escape');
  await expect(
    albumCard.getByRole('button', { name: 'Copy link to Tournament memories', exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    Reflect.deleteProperty(navigator.clipboard, 'writeText');
  });
  failPrivacy = true;
  await choosePrivacy(privacy, 'Private');
  await expect(albumCard.getByRole('alert')).toContainText('Could not save privacy.');
  await expect(privacy).toHaveText('Public');
  await expect(privacy).toBeEnabled();
  await choosePrivacy(privacy, 'Private');
  await expect(privacy).toHaveText('Private');
  await expect(privacy).toBeEnabled();
  await visitor.goto(`${origin}/albums/${albumId}`);
  await expect(visitor.getByText('Album not found.', { exact: true })).toBeVisible();
  await choosePrivacy(privacy, 'Public');
  await expect(privacy).toHaveText('Public');
  await expect(privacy).toBeEnabled();
  await privacy.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option', { name: 'Public', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('option', { name: 'Unlisted', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('option', { name: 'Private', exact: true })).toBeFocused();
  expect((await sql`SELECT visibility FROM user_album WHERE id = ${albumId}`)[0].visibility).toBe(
    'public',
  );
  await page.keyboard.press('Enter');
  await expect(privacy).toHaveText('Private');
  await expect(privacy).toBeEnabled();
  await expect(privacy).toBeFocused();
  // Closed-trigger typeahead must never publish a private album.
  const patchesBeforeTypeahead = albumPatchRequests;
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
  await expect(privacy).toHaveText('Private');
  expect(albumPatchRequests).toBe(patchesBeforeTypeahead);
  expect((await sql`SELECT visibility FROM user_album WHERE id = ${albumId}`)[0].visibility).toBe(
    'private',
  );

  await albumCard
    .getByRole('button', { name: 'Copy link to Tournament memories', exact: true })
    .click();
  await expect(
    albumCard.getByRole('status').filter({ hasText: 'Only you can open this private album.' }),
  ).toBeVisible();
  // A stale card refetches the current revision without overwriting another tab.
  await sql`UPDATE user_album SET revision = revision + 1, visibility = 'unlisted' WHERE id = ${albumId}`;
  await choosePrivacy(privacy, 'Public');
  await expect(albumCard.getByRole('alert')).toContainText('This album has changed.');
  await expect(privacy).toHaveText('Unlisted');
  await expect(privacy).toBeEnabled();
  await choosePrivacy(privacy, 'Public');
  await expect(privacy).toHaveText('Public');
  await expect(privacy).toBeEnabled();
  const listed = await anonymous.request.get(`${origin}/api/user-albums/by-user/${owner}`);
  expect((await listed.json()).data.albums.map((album: { id: string }) => album.id)).toContain(
    albumId,
  );
  // Owner can also change privacy from the album's shared page.
  const preview = await context.newPage();
  await preview.goto(`${origin}/albums/${albumId}`);
  await choosePrivacy(preview.getByRole('combobox', { name: /^Privacy for / }), 'Unlisted');
  await expect(preview.getByRole('combobox', { name: /^Privacy for / })).toHaveText('Unlisted');
  await expect(preview.getByRole('combobox', { name: /^Privacy for / })).toBeEnabled();
  await expect(preview.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  await preview.close();
  // Include empty cards in responsive/light/dark checks, then clean up fixtures.
  const emptyAlbum = crypto.randomUUID();
  await sql`INSERT INTO user_album (id, user_id, title, description) VALUES (${emptyAlbum}, ${owner}, 'The next adventure', 'A new collection, ready for its first images.')`;
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await expect(overview.locator('article')).toHaveCount(2);
  await expect(privacy).toHaveText('Unlisted');
  await overview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/overview-light.png` });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await page.reload();
  await expect(overview.locator('article')).toHaveCount(2);
  await overview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/overview-dark.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await overview.getByRole('heading', { name: 'My albums', exact: true }).scrollIntoViewIfNeeded();
  expect(await overview.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await overview
    .locator('article')
    .first()
    .screenshot({ path: `${screenshots}/overview-mobile.png` });
  await sql`DELETE FROM user_album WHERE id = ${emptyAlbum}`;
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goBack();
  await expect(editor).toBeVisible();
  await albumImages.getByRole('button', { name: 'Edit details', exact: true }).first().click();
  await page.getByLabel('Caption', { exact: true }).fill('Keep this unsaved caption');
  await sql`DELETE FROM user_album_item WHERE album_id = ${albumId} AND file_id = (SELECT file_id FROM user_album_item WHERE album_id = ${albumId} ORDER BY position, file_id LIMIT 1)`;
  await sql`UPDATE user_album SET revision = revision + 1 WHERE id = ${albumId}`;
  await page.getByRole('button', { name: 'Save image details' }).click();
  await page.getByRole('button', { name: 'Keep edits using latest version' }).click();
  await expect(page.getByRole('dialog').getByText(/This image was removed or moved/)).toBeVisible();
  await expect(page.getByLabel('Caption', { exact: true })).toHaveValue(
    'Keep this unsaved caption',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await editor.getByRole('button', { name: 'Delete album', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete album', exact: true })
    .click();
  await expect(
    page.getByText('Create your first album to collect your images.', { exact: true }),
  ).toBeVisible();
  expect(
    Number((await sql`SELECT count(*) FROM user_file WHERE user_id = ${owner}`)[0].count),
  ).toBe(15);
  expect(errors).toEqual([]);
  console.log(
    'Album creation, selection, pagination, editing, privacy controls/recovery, card link copying/fallback, keyboard/drag order, cover, sharing, mobile/dark, upload recovery and deletion passed.',
  );
} finally {
  releaseUpload?.();
  releaseAlbumWrite?.();
  await browser.close();
  await sql`DELETE FROM "user" WHERE id = ${owner}`;
  await sql.end();
  await db.$client.end();
}
