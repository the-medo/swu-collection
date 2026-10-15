// USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/album-tournaments.browser.ts
// Real API/database; temporary local records and mocked image delivery, no bucket writes.
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
const owner = `album-event-browser-${crypto.randomUUID()}`;
const albumId = crypto.randomUUID();
const eventId = crypto.randomUUID();
const token = crypto.randomUUID();
const eventName = `Community Open ${eventId.slice(0, 8)}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const visitor = await anonymous.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
page.setDefaultTimeout(20_000);
visitor.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
visitor.on('pageerror', error => errors.push(error.message));
const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#4686c2' } })
  .png()
  .toBuffer();
const screenshots = new URL('../../.swubase/album-tournaments/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
for (const ctx of [context, anonymous]) {
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
  });
  await ctx.route(`https://images.swubase.com/user-files/${owner}/**`, route =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
}
for (const active of [page, visitor]) {
  await active.addLocatorHandler(active.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    active.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
let failSearch = false;
let failLink = false;
let patches = 0;
await context.route('**/api/user-albums/tournaments?*', route => {
  if (failSearch) {
    failSearch = false;
    return route.fulfill({ status: 503, json: { message: 'Tournament search unavailable.' } });
  }
  return route.continue();
});
await context.route(`**/api/user-albums/${albumId}`, route => {
  if (route.request().method() === 'PATCH') {
    patches++;
    if (failLink) {
      failLink = false;
      return route.fulfill({ status: 503, json: { message: 'Could not link the tournament.' } });
    }
  }
  return route.continue();
});
const editor = page.getByRole('region', { name: 'Album editor', exact: true });
const event = editor.getByRole('region', { name: 'Album event', exact: true });
const dialog = page.getByRole('dialog');
const state = async () =>
  (await sql`SELECT visibility, tournament_id FROM user_album WHERE id = ${albumId}`)[0];
async function selectEvent(
  search = eventName,
  activation: 'click' | 'double' | 'keyboard' = 'click',
) {
  await event.getByRole('button', { name: /^(Link|Change) tournament$/ }).click();
  await dialog.getByLabel('Search tournaments', { exact: true }).fill(search);
  await dialog.getByRole('button', { name: new RegExp(eventName) }).click();
  const link = dialog.getByRole('button', { name: 'Link tournament', exact: true });
  if (activation === 'double') await link.dblclick();
  else if (activation === 'keyboard') await link.press('Enter');
  else await link.click();
}
async function privacy(name: string) {
  await editor.getByRole('combobox', { name: /^Privacy for/ }).click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(editor.getByRole('combobox', { name: /^Privacy for/ })).toHaveText(name);
  await expect(editor.getByRole('combobox', { name: /^Privacy for/ })).toBeEnabled();
}
try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at) VALUES (${owner}, 'Event photographer', 'Event photographer', ${owner + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${owner}, now(), now())`;
  await sql`INSERT INTO tournament (id, user_id, type, format, location, continent, name, attendance, days, date, bracket_info)
    SELECT ${eventId}, ${owner}, (SELECT id FROM tournament_type ORDER BY sort_value LIMIT 1), (SELECT id FROM format ORDER BY id LIMIT 1), 'FR', 'Europe', ${eventName}, 32, 1, '2026-10-15', 'none'`;
  await sql`INSERT INTO user_album (id, user_id, title) VALUES (${albumId}, ${owner}, 'Event memories')`;
  for (let i = 0; i < 8; i++) {
    const id = crypto.randomUUID();
    await sql`INSERT INTO user_file (id, user_id, file_name, image_key, thumbnail_key, original_byte_size, byte_size, thumbnail_byte_size, width, height)
      VALUES (${id}, ${owner}, 'Event photo.png', ${`user-files/${owner}/${id}.webp`}, ${`user-files/${owner}/${id}-thumb.webp`}, 1000, 800, 200, 600, 400)`;
    await sql`INSERT INTO user_album_item (album_id, file_id, position, caption, alt_text) VALUES (${albumId}, ${id}, ${i}, ${`Event moment ${i + 1}`}, 'Players at the event')`;
  }
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
  await page.goto(`${origin}/settings?page=uploads&uploadView=albums&album=${albumId}`);
  await expect(editor).toBeVisible();
  await visitor.goto(`${origin}/tournaments/${eventId}/details`);
  const photos = visitor.getByRole('region', { name: 'Event photos', exact: true });
  await expect(photos.getByText('No photos yet', { exact: true })).toBeVisible();
  await photos.getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(
    visitor.getByRole('dialog').getByRole('heading', { name: 'Sign In', exact: true }),
  ).toBeVisible();
  await visitor.keyboard.press('Escape');
  await photos.getByRole('link', { name: 'View all event albums' }).click();
  await expect(visitor).toHaveURL(`${origin}/tournaments/${eventId}/photos`);
  const eventAlbums = visitor.getByRole('region', { name: 'Event albums', exact: true });
  await expect(eventAlbums.getByText('No photos yet', { exact: true })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Photos', exact: true })).toHaveCount(0);
  await visitor.reload();
  await expect(eventAlbums.getByText('No photos yet', { exact: true })).toBeVisible();
  await eventAlbums.getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(
    visitor.getByRole('dialog').getByRole('heading', { name: 'Sign In', exact: true }),
  ).toBeVisible();
  await visitor.keyboard.press('Escape');
  await visitor.goBack();
  await expect(photos).toBeVisible();
  // Search failure/retry and empty search are recoverable without mutating privacy.
  failSearch = true;
  await event.getByRole('button', { name: 'Link tournament', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Tournament search unavailable.');
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await dialog.getByLabel('Search tournaments').fill(`no-matching-event-${crypto.randomUUID()}`);
  await expect(
    dialog.getByText('No tournaments found. Try another name or country code.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(event.getByRole('button', { name: 'Link tournament', exact: true })).toBeFocused();
  const beforeDoubleClick = patches;
  await selectEvent(eventName, 'double');
  expect(patches).toBe(beforeDoubleClick);
  expect(await state()).toEqual({ visibility: 'unlisted', tournament_id: null });
  // The second pointer click can also land outside the resized confirmation and close it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  for (const visibility of ['unlisted', 'private'] as const) {
    if (visibility === 'private') await privacy('Private');
    const before = patches;
    await selectEvent(`${origin}/tournaments/${eventId}/details`, 'keyboard');
    await expect(dialog.getByRole('heading', { name: 'Make this album public?' })).toBeVisible();
    await expect(dialog.getByText(/including future uploads/)).toBeVisible();
    // Exercise the second-click guard even when the resized dialog moves the button.
    await dialog
      .getByRole('button', { name: 'Make public and link', exact: true })
      .dispatchEvent('click', { detail: 2 });
    await page.waitForTimeout(150);
    await expect(dialog.getByRole('heading', { name: 'Make this album public?' })).toBeVisible();
    expect(patches).toBe(before);
    expect(await state()).toEqual({ visibility, tournament_id: null });
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    // A repeated Enter must cancel rather than publish the album.
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    expect(patches).toBe(before);
    expect(await state()).toEqual({ visibility, tournament_id: null });
  }
  await selectEvent();
  failLink = true;
  await dialog.getByRole('button', { name: 'Make public and link', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not link the tournament.');
  expect(await state()).toEqual({ visibility: 'private', tournament_id: null });
  // A competing edit must not silently publish the latest revision.
  await sql`UPDATE user_album SET revision = revision + 1 WHERE id = ${albumId}`;
  await dialog.getByRole('button', { name: 'Make public and link', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('This album has changed.');
  expect(await state()).toEqual({ visibility: 'private', tournament_id: null });
  await dialog.getByRole('button', { name: 'Make public and link', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(event.getByRole('link', { name: eventName, exact: true })).toBeVisible();
  expect(await state()).toEqual({ visibility: 'public', tournament_id: eventId });
  await visitor.reload();
  const albumLink = photos.getByRole('link', { name: 'View album: Event memories', exact: true });
  await expect(albumLink).toBeVisible();
  await expect(albumLink).toHaveAccessibleDescription('8 photos');
  await expect(
    photos.getByRole('link', { name: 'Event photographer', exact: true }),
  ).toHaveAttribute('href', `/users/${owner}?userTab=albums`);
  await expect(photos.getByRole('img')).toHaveCount(0); // Decorative cover has an empty alt.
  await expect(photos.locator('img')).toHaveCount(1);
  expect(await photos.locator('img').evaluate(image => image.getBoundingClientRect().height)).toBe(
    64,
  );
  await expect(photos.getByText('8 photos', { exact: false })).toBeVisible();
  await photos.screenshot({ path: `${screenshots}/event-photos-desktop.png` });
  await visitor.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await visitor.reload();
  await expect(albumLink).toBeVisible();
  await photos.screenshot({ path: `${screenshots}/event-photos-dark.png` });
  await albumLink.click();
  await expect(
    visitor
      .getByRole('region', { name: 'Album images' })
      .getByRole('button', { name: /^View image/ }),
  ).toHaveCount(8);
  await visitor.getByRole('link', { name: eventName, exact: true }).click();
  await expect(photos).toBeVisible();
  await photos.getByRole('link', { name: 'View all event albums' }).click();
  await expect(
    eventAlbums.getByRole('link', { name: 'View album: Event memories', exact: true }),
  ).toBeVisible();
  await expect(
    eventAlbums.getByRole('link', { name: 'View album: Event memories', exact: true }),
  ).toHaveAccessibleDescription('8 photos');
  await eventAlbums.getByRole('link', { name: 'View album: Event memories', exact: true }).click();
  await expect(
    visitor
      .getByRole('region', { name: 'Album images' })
      .getByRole('button', { name: /^View image/ }),
  ).toHaveCount(8);
  await visitor.goBack();
  await expect(eventAlbums).toBeVisible();
  await visitor.getByRole('link', { name: 'Details & Bracket', exact: true }).click();
  await visitor.setViewportSize({ width: 390, height: 844 });
  await photos.scrollIntoViewIfNeeded();
  expect(
    await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await photos.screenshot({ path: `${screenshots}/event-photos-mobile.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await event.screenshot({ path: `${screenshots}/album-event-mobile.png` });
  await event.getByRole('button', { name: 'Change tournament', exact: true }).click();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.screenshot({ path: `${screenshots}/event-picker-mobile.png` });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  // Changing privacy in either editor path removes the event link and requires explicit relinking.
  await expect(editor.getByText(/Choosing Private or Unlisted will also unlink/)).toBeVisible();
  await editor.getByRole('button', { name: 'Edit album', exact: true }).click();
  await page.getByLabel('Visibility', { exact: true }).selectOption('unlisted');
  await expect(dialog.getByText(/Saving this privacy setting will also unlink/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Save album', exact: true }).click();
  await expect(event.getByRole('button', { name: 'Link tournament', exact: true })).toBeVisible();
  expect(await state()).toEqual({ visibility: 'unlisted', tournament_id: null });
  await visitor.reload();
  await expect(photos.getByRole('link', { name: /^View album:/ })).toHaveCount(0);
  await visitor.goto(`${origin}/tournaments/${eventId}/photos`);
  await expect(eventAlbums.getByText('No photos yet', { exact: true })).toBeVisible();
  await expect(eventAlbums.getByRole('link', { name: /^View album:/ })).toHaveCount(0);
  await visitor.getByRole('link', { name: 'Details & Bracket', exact: true }).click();
  await privacy('Public');
  expect(await state()).toEqual({ visibility: 'public', tournament_id: null });
  await selectEvent(); // Public albums link without a publication prompt.
  await expect(dialog).toBeHidden();
  await expect(event.getByRole('button', { name: 'Unlink', exact: true })).toBeVisible();
  await event.getByRole('button', { name: 'Unlink', exact: true }).click();
  await expect(event.getByRole('button', { name: 'Link tournament', exact: true })).toBeVisible();
  expect(await state()).toEqual({ visibility: 'public', tournament_id: null });
  await selectEvent();
  await expect(dialog).toBeHidden();
  await privacy('Private');
  expect(await state()).toEqual({ visibility: 'private', tournament_id: null });
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await page.reload();
  await selectEvent();
  await expect(dialog.getByRole('heading', { name: 'Make this album public?' })).toBeVisible();
  await dialog.screenshot({ path: `${screenshots}/publication-confirmation-dark-mobile.png` });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  // Create an album directly from the empty event panel; cancellation and failures create nothing.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${origin}/tournaments/${eventId}/details`);
  const ownerPhotos = page.getByRole('region', { name: 'Event photos', exact: true });
  await expect(ownerPhotos.getByText('No photos yet', { exact: true })).toBeVisible();
  await ownerPhotos.getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(eventName);
  await expect(dialog.getByText('Public event album', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/all photos you add will be visible to everyone/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    ownerPhotos.getByRole('button', { name: 'Create album', exact: true }),
  ).toBeFocused();
  expect(
    Number((await sql`SELECT count(*) FROM user_album WHERE user_id = ${owner}`)[0].count),
  ).toBe(1);
  await context.route('**/api/user-albums', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 503,
      json: { message: 'Could not create the album. Try again.' },
    });
  });
  await ownerPhotos.getByRole('link', { name: 'View all event albums' }).click();
  const ownerAlbums = page.getByRole('region', { name: 'Event albums', exact: true });
  await expect(ownerAlbums.getByText('No photos yet', { exact: true })).toBeVisible();
  await ownerAlbums.getByRole('button', { name: 'Create album', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('My event photos');
  await dialog.getByRole('button', { name: 'Create public album', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not create the album.');
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('My event photos');
  expect(
    Number((await sql`SELECT count(*) FROM user_album WHERE user_id = ${owner}`)[0].count),
  ).toBe(1);
  await context.unroute('**/api/user-albums');
  await dialog.getByRole('button', { name: 'Create public album', exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Upload images', exact: true })).toBeVisible();
  await expect(event.getByRole('link', { name: eventName, exact: true })).toBeVisible();
  const createdId = new URL(page.url()).searchParams.get('album')!;
  expect(
    (await sql`SELECT title, visibility, tournament_id FROM user_album WHERE id = ${createdId}`)[0],
  ).toEqual({ title: 'My event photos', visibility: 'public', tournament_id: eventId });
  const fileId = (
    await sql`SELECT file_id FROM user_album_item WHERE album_id = ${albumId} ORDER BY position LIMIT 1`
  )[0].file_id;
  const added = await context.request.post(`${origin}/api/user-albums/${createdId}/images`, {
    headers: { 'X-Requested-With': 'swubase' },
    data: { revision: 0, fileIds: [fileId] },
  });
  expect(added.status()).toBe(200);
  await page.goto(`${origin}/tournaments/${eventId}/details`);
  await expect(
    ownerPhotos.getByRole('link', { name: 'View album: My event photos' }),
  ).toBeVisible();
  // All three panels share a row on wide screens, and more albums cannot grow the panel indefinitely.
  const attributes = page.getByRole('region', { name: 'Tournament attributes', exact: true });
  const info = page.getByRole('region', { name: 'Event information', exact: true });
  const boxes = await Promise.all([
    attributes.boundingBox(),
    info.boundingBox(),
    ownerPhotos.boundingBox(),
  ]);
  expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
  expect(Math.abs(boxes[1]!.y - boxes[2]!.y)).toBeLessThan(2);
  expect(boxes[2]!.x).toBeGreaterThan(boxes[1]!.x);
  await attributes.locator('..').screenshot({ path: `${screenshots}/compact-top-panels.png` });
  await page.setViewportSize({ width: 1150, height: 1000 });
  const medium = await Promise.all([
    attributes.boundingBox(),
    info.boundingBox(),
    ownerPhotos.boundingBox(),
  ]);
  expect(medium[1]!.y).toBeGreaterThan(medium[0]!.y);
  expect(Math.abs(medium[1]!.y - medium[2]!.y)).toBeLessThan(2);
  expect(medium[2]!.x).toBeGreaterThan(medium[1]!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  for (let i = 0; i < 13; i++) {
    const id = crypto.randomUUID();
    await sql`INSERT INTO user_album (id, user_id, title, visibility, tournament_id) VALUES (${id}, ${owner}, ${`Shared memories ${i}`}, 'public', ${eventId})`;
    await sql`INSERT INTO user_album_item (album_id, file_id, position) VALUES (${id}, ${fileId}, 0)`;
  }
  await page.reload();
  await expect(ownerPhotos.getByRole('link', { name: /^View album:/ })).toHaveCount(4);
  expect((await ownerPhotos.boundingBox())!.height).toBeLessThan(360);
  const compactCards = ownerPhotos.getByRole('article');
  const compactBoxes = await Promise.all([0, 1, 2].map(i => compactCards.nth(i).boundingBox()));
  expect(Math.abs(compactBoxes[0]!.y - compactBoxes[1]!.y)).toBeLessThan(2);
  expect(compactBoxes[1]!.x).toBeGreaterThan(compactBoxes[0]!.x);
  expect(compactBoxes[2]!.y).toBeGreaterThan(compactBoxes[0]!.y);
  await ownerPhotos.screenshot({ path: `${screenshots}/compact-many-albums.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await ownerPhotos.screenshot({ path: `${screenshots}/compact-many-albums-mobile.png` });
  // A direct public route handles loading, retry and pagination independently of imported results.
  await anonymous.route(`**/api/user-albums/by-tournament/${eventId}*`, route =>
    route.fulfill({
      status: 503,
      json: { message: 'Event albums unavailable.' },
    }),
  );
  await visitor.goto(`${origin}/tournaments/${eventId}/photos`);
  await expect(eventAlbums.getByRole('alert')).toContainText('Event albums unavailable.');
  await anonymous.unroute(`**/api/user-albums/by-tournament/${eventId}*`);
  await eventAlbums.getByRole('button', { name: 'Retry event photos' }).click();
  await expect(eventAlbums.getByRole('link', { name: /^View album:/ })).toHaveCount(12);
  await visitor.setViewportSize({ width: 1440, height: 1100 });
  await visitor.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await visitor.reload();
  await expect(eventAlbums.getByRole('link', { name: /^View album:/ })).toHaveCount(12);
  const fullCards = eventAlbums.getByRole('article');
  const fullBoxes = await Promise.all([0, 1, 2].map(i => fullCards.nth(i).boundingBox()));
  expect(Math.abs(fullBoxes[0]!.y - fullBoxes[1]!.y)).toBeLessThan(2);
  expect(fullBoxes[1]!.x).toBeGreaterThan(fullBoxes[0]!.x);
  expect(fullBoxes[2]!.y).toBeGreaterThan(fullBoxes[0]!.y);
  await visitor.screenshot({ path: `${screenshots}/photos-page-desktop.png` });
  await eventAlbums.getByRole('button', { name: 'Load more albums', exact: true }).click();
  await expect(eventAlbums.getByRole('link', { name: /^View album:/ })).toHaveCount(14);
  await expect(eventAlbums.locator('[data-event-album]').nth(12)).toBeFocused();
  await expect(
    eventAlbums.getByRole('button', { name: 'Load more albums', exact: true }),
  ).toHaveCount(0);
  await visitor.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await visitor.reload();
  await expect(eventAlbums.getByRole('link', { name: /^View album:/ })).toHaveCount(12);
  await visitor.evaluate(() => window.scrollTo(0, 0));
  await visitor.screenshot({ path: `${screenshots}/photos-page-dark.png` });
  await visitor.setViewportSize({ width: 390, height: 844 });
  expect(
    await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await visitor.screenshot({ path: `${screenshots}/photos-page-mobile.png` });
  await visitor.goto(`${origin}/tournaments/${crypto.randomUUID()}/photos`);
  await expect(
    visitor.getByText('The tournament you are looking for does not exist or has been deleted.'),
  ).toBeVisible();
  // Smoke-test the existing tournament supplied in the request as well as the isolated fixture.
  await visitor.goto(`${origin}/tournaments/a46bebd8-d980-4be4-97f5-59c5eebf4b9e/details`);
  await expect(photos.getByRole('heading', { name: 'Event photos', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Tournament search, public confirmation/cancel/retry/conflict, two-column album cards, photos page navigation/pagination/retry, event album creation, responsive layout, unlink and privacy withdrawal passed.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM tournament WHERE id = ${eventId}`;
  await sql`DELETE FROM "user" WHERE id = ${owner}`;
  await sql.end();
}
