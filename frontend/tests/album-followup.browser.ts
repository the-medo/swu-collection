// USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/album-followup.browser.ts
// Real local API/database and admin permissions; image uploads/delivery are mocked, never sent to R2.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';

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
const owner = `album-followup-${crypto.randomUUID()}`;
const admin = `album-admin-${crypto.randomUUID()}`;
const albumId = crypto.randomUUID();
const albumTitle = `Followup memories ${albumId.slice(0, 8)}`;
const eventId = crypto.randomUUID();
const eventName = `Followup Open ${eventId.slice(0, 8)}`;
const browser = await chromium.launch();
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const anonymous = await browser.newContext();
const page = await ownerContext.newPage();
const moderator = await adminContext.newPage();
const visitor = await anonymous.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#4686c2' } })
  .png()
  .toBuffer();
const screenshots = new URL('../../.swubase/album-followup/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
for (const ctx of [ownerContext, adminContext, anonymous]) {
  await ctx.addInitScript(() => localStorage.setItem('vite-ui-theme', 'light'));
  await ctx.route(`https://images.swubase.com/user-files/${owner}/**`, route =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
}
for (const current of [page, moderator, visitor]) {
  current.setDefaultTimeout(20_000);
  current.on('pageerror', error => errors.push(error.message));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
let uploadCount = 0;
let uploadGate: Promise<void> | undefined;
let releaseUpload: (() => void) | undefined;
let attachmentGate: Promise<void> | undefined;
let releaseAttachment: (() => void) | undefined;
let attaching = false;
let moderationFailure = false;
let blockedListFailure = false;
let moderationRequests = 0;
const seedFile = async () => {
  const id = crypto.randomUUID();
  const imageKey = `user-files/${owner}/${id}.webp`;
  const thumbnailKey = `user-files/${owner}/${id}-thumb.webp`;
  await sql`INSERT INTO user_file (id, user_id, file_name, image_key, thumbnail_key, original_byte_size, byte_size, thumbnail_byte_size, width, height)
    VALUES (${id}, ${owner}, 'Event.png', ${imageKey}, ${thumbnailKey}, 1000, 800, 200, 600, 400)`;
  return {
    id,
    fileName: 'Event.png',
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
await ownerContext.route('**/api/user-files*', async route => {
  if (route.request().method() === 'POST') {
    uploadCount++;
    if (uploadGate) {
      await uploadGate;
      return route.abort();
    }
    return route.fulfill({ status: 201, json: { data: await seedFile() } });
  }
  const response = await route.fetch();
  const body = await response.json();
  body.data.uploadsEnabled = true;
  return route.fulfill({ response, json: body });
});
await ownerContext.route(`**/api/user-albums/${albumId}/images`, async route => {
  if (route.request().method() === 'POST' && attachmentGate) {
    const response = await route.fetch();
    attaching = true;
    await attachmentGate;
    return route.fulfill({ response });
  }
  return route.continue();
});
await adminContext.route(`**/api/admin/user-albums/${albumId}/event-link`, route => {
  moderationRequests++;
  if (moderationFailure) {
    moderationFailure = false;
    return route.fulfill({ status: 503, json: { message: 'Moderation temporarily unavailable.' } });
  }
  return route.continue();
});
await adminContext.route('**/api/admin/user-albums/blocked*', route => {
  if (blockedListFailure) {
    return route.fulfill({
      status: 503,
      json: { message: 'Blocked albums temporarily unavailable.' },
    });
  }
  return route.continue();
});
const state = async () =>
  (
    await sql`SELECT event_link_blocked, tournament_id, visibility FROM user_album WHERE id = ${albumId}`
  )[0];
const editorUrl = `${origin}/settings?page=uploads&uploadView=albums&album=${albumId}`;
const photosUrl = `${origin}/tournaments/${eventId}/photos`;
const editor = page.getByRole('region', { name: 'Album editor', exact: true });
const event = editor.getByRole('region', { name: 'Album event', exact: true });
const confirmation = moderator.getByRole('alertdialog');
try {
  for (const [id, role, context] of [
    [owner, 'user', ownerContext],
    [admin, 'admin', adminContext],
  ] as const) {
    await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, role, created_at, updated_at)
      VALUES (${id}, 'Event photographer', ${id}, ${id + '@invalid.local'}, false, 'USD', ${role}, now(), now())`;
    const token = crypto.randomUUID();
    await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${id}, now(), now())`;
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
  }
  await sql`INSERT INTO tournament (id, user_id, type, format, location, continent, name, attendance, days, date, bracket_info)
    SELECT ${eventId}, ${owner}, (SELECT id FROM tournament_type ORDER BY sort_value LIMIT 1), (SELECT id FROM format ORDER BY id LIMIT 1), 'FR', 'Europe', ${eventName}, 32, 1, '2026-10-15', 'none'`;
  await sql`INSERT INTO user_album (id, user_id, title, visibility, tournament_id) VALUES (${albumId}, ${owner}, ${albumTitle}, 'public', ${eventId})`;
  const image = await seedFile();
  await sql`INSERT INTO user_album_item (album_id, file_id, position) VALUES (${albumId}, ${image.id}, 0)`;
  await visitor.goto(photosUrl);
  await expect(visitor.getByRole('link', { name: `View album: ${albumTitle}` })).toBeVisible();
  await expect(visitor.getByRole('button', { name: 'Remove from events' })).toHaveCount(0);
  await page.goto(photosUrl);
  await expect(page.getByRole('link', { name: `View album: ${albumTitle}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove from events' })).toHaveCount(0);
  await moderator.goto(photosUrl);
  const remove = moderator.getByRole('button', { name: 'Remove from events', exact: true });
  await remove.click();
  await expect(confirmation).toContainText('cannot link it to any event');
  await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(remove).toBeFocused();
  expect(moderationRequests).toBe(0);
  moderationFailure = true;
  await remove.click();
  await confirmation.getByRole('button', { name: 'Remove from events', exact: true }).click();
  await expect(confirmation.getByRole('alert')).toContainText(
    'Moderation temporarily unavailable.',
  );
  expect((await state()).event_link_blocked).toBe(false);
  await confirmation.getByRole('button', { name: 'Remove from events', exact: true }).click();
  await expect(moderator.getByText('No photos yet', { exact: true })).toBeVisible();
  await expect(moderator.getByRole('region', { name: 'Event albums', exact: true })).toBeFocused();
  expect(await state()).toMatchObject({
    event_link_blocked: true,
    tournament_id: null,
    visibility: 'public',
  });
  await visitor.reload();
  await expect(visitor.getByText('No photos yet', { exact: true })).toBeVisible();
  await page.goto(editorUrl);
  await expect(event.getByRole('button', { name: 'Link tournament', exact: true })).toBeDisabled();
  await expect(event).toContainText('Only an admin can restore it');
  await editor.getByRole('combobox', { name: /^Privacy for/ }).click();
  await page.getByRole('option', { name: 'Private', exact: true }).click();
  await expect.poll(async () => (await state()).visibility).toBe('private');
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await event.screenshot({ path: `${screenshots}/owner-blocked-mobile.png` });
  blockedListFailure = true;
  await moderator.getByRole('link', { name: 'Manage blocked albums' }).click();
  const moderation = moderator.getByRole('region', { name: 'Album moderation', exact: true });
  await expect(moderation.getByRole('alert')).toContainText(
    'Blocked albums temporarily unavailable.',
  );
  blockedListFailure = false;
  await moderation.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(moderation.locator('article').first()).toBeVisible();
  const blockedAlbum = moderation.getByRole('heading', { name: albumTitle, exact: true });
  const loadMore = moderation.getByRole('button', {
    name: 'Load more blocked albums',
    exact: true,
  });
  while (!(await blockedAlbum.count()) && (await loadMore.count())) {
    await loadMore.click();
    await expect(moderation.getByRole('button', { name: 'Loading…', exact: true })).toHaveCount(0);
  }
  await expect(blockedAlbum).toBeVisible();
  expect(await moderation.locator('img').count()).toBe(0);
  await moderator.evaluate(() => document.documentElement.classList.add('dark'));
  await moderator.setViewportSize({ width: 390, height: 844 });
  await moderation.screenshot({ path: `${screenshots}/moderation-mobile-dark.png` });
  await moderation
    .locator('article')
    .filter({ hasText: albumTitle })
    .getByRole('button', { name: 'Restore event linking', exact: true })
    .click();
  await confirmation.getByRole('button', { name: 'Restore event linking', exact: true }).click();
  await expect(moderation.getByRole('heading', { name: albumTitle, exact: true })).toHaveCount(0);
  await expect(
    moderation.getByRole('heading', { name: 'Album moderation', exact: true }),
  ).toBeFocused();
  expect(await state()).toMatchObject({
    event_link_blocked: false,
    tournament_id: null,
    visibility: 'private',
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.reload();
  await event.getByRole('button', { name: 'Link tournament', exact: true }).click();
  const picker = page.getByRole('dialog');
  await picker.getByLabel('Search tournaments').fill(eventName);
  await picker.getByRole('button', { name: new RegExp(eventName) }).click();
  await picker.getByRole('button', { name: 'Link tournament', exact: true }).click();
  await picker.getByRole('button', { name: 'Make public and link', exact: true }).click();
  await expect.poll(async () => (await state()).tournament_id).toBe(eventId);
  console.log(
    'Admin removal, confirmation, failure/retry, persistent owner restriction, private-album restore, focus, mobile/dark and explicit relinking passed.',
  );

  // The shared queue must not upload the next file after confirmed navigation,
  // including while an already uploaded file is finishing its album attachment.
  attachmentGate = new Promise<void>(resolve => {
    releaseAttachment = resolve;
  });
  await page.getByLabel('Choose images', { exact: true }).setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: png },
    { name: 'remaining.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect.poll(() => attaching).toBe(true);
  expect(uploadCount).toBe(1);
  const home = page.locator('a[href="/"]').first();
  page.once('dialog', dialog => dialog.dismiss());
  await home.click();
  await expect(editor).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await home.click();
  await expect(page).toHaveURL(`${origin}/`);
  releaseAttachment!();
  attachmentGate = undefined;
  await page.goto(editorUrl);
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeEnabled();
  expect(uploadCount).toBe(1);
  expect(
    Number((await sql`SELECT count(*) FROM user_album_item WHERE album_id = ${albumId}`)[0].count),
  ).toBe(2);
  await page.getByLabel('Choose images', { exact: true }).setInputFiles([
    { name: 'batch-a.png', mimeType: 'image/png', buffer: png },
    { name: 'batch-b.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(editor.getByText('2 images added to this album.', { exact: true })).toBeVisible();
  expect(uploadCount).toBe(3);
  await page.goto(`${origin}/settings?page=uploads`);
  const uploadButton = page.getByRole('button', { name: 'Upload images', exact: true });
  await expect(uploadButton).toBeEnabled();
  uploadGate = new Promise<void>(resolve => {
    releaseUpload = resolve;
  });
  const requestFailed = page.waitForEvent('requestfailed', {
    predicate: request => request.method() === 'POST' && request.url().endsWith('/api/user-files'),
  });
  await page.getByLabel('Choose images', { exact: true }).setInputFiles([
    { name: 'cancel-active.png', mimeType: 'image/png', buffer: png },
    { name: 'cancel-queued.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect.poll(() => uploadCount).toBe(4);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('a[href="/"]').first().click();
  await expect(page).toHaveURL(`${origin}/`);
  await requestFailed;
  releaseUpload!();
  uploadGate = undefined;
  await page.goto(`${origin}/settings?page=uploads`);
  await expect(uploadButton).toBeEnabled();
  expect(uploadCount).toBe(4);
  expect(errors).toEqual([]);
  console.log(
    'Shared upload queue: serial multi-file attachment, declined/confirmed navigation, durable attachment, active request cancellation and no queued uploads after leaving passed.',
  );
} catch (error) {
  await moderator.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  throw error;
} finally {
  releaseUpload?.();
  releaseAttachment?.();
  await browser.close();
  await sql`DELETE FROM tournament WHERE id = ${eventId}`;
  await sql`DELETE FROM "user" WHERE id IN (${owner}, ${admin})`;
  await sql.end();
}
