// USER_HEADER_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/profile-header.browser.ts
// Uses a temporary local account and mocks image APIs; no R2 objects are written.
import { chromium, expect as baseExpect, type Locator } from 'playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';
import { dragCropBody, dragCropCorner } from './image-crop.helpers.ts';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import type {
  UserHeaderInput,
  UserHeaderSettings,
  HeaderImageOption,
} from '../../types/UserHeader.ts';
import type { GalleryImage } from '../../types/ImageGallery.ts';
import type { UserFile } from '../../types/UserFile.ts';
import { userAvatarInputSchema, type UserAvatarInput } from '../../types/UserAvatar.ts';

const database = new URL(process.env.DATABASE_URL!);
if (
  process.env.USER_HEADER_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable against an isolated worktree database.');
const origin = process.env.BETTER_AUTH_URL!;
const expect = baseExpect.configure({ timeout: 30_000 });
const sql = postgres(database.toString(), { max: 2 });
const userId = 'header-browser-' + crypto.randomUUID();
const token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));

await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
await mkdir('.swubase/header-screenshots', { recursive: true });

const sourceBytes = await sharp({
  create: { width: 2600, height: 1000, channels: 3, background: '#365879' },
})
  .png()
  .toBuffer();
const sourceUrl = 'data:image/png;base64,' + sourceBytes.toString('base64');
const narrowBytes = await sharp({
  create: { width: 1500, height: 1000, channels: 3, background: '#365879' },
})
  .png()
  .toBuffer();
const narrowUrl = 'data:image/png;base64,' + narrowBytes.toString('base64');
const smallBytes = await sharp({
  create: { width: 800, height: 400, channels: 3, background: '#365879' },
})
  .png()
  .toBuffer();
const smallUrl = 'data:image/png;base64,' + smallBytes.toString('base64');
const large: UserFile = {
  id: crypto.randomUUID(),
  fileName: 'My header art',
  originalByteSize: 1000,
  byteSize: 1000,
  thumbnailByteSize: 500,
  width: 2600,
  height: 1000,
  createdAt: new Date().toISOString(),
  url: sourceUrl,
  thumbnailUrl: sourceUrl,
};
const narrow: UserFile = {
  ...large,
  id: crypto.randomUUID(),
  fileName: 'Minimum-width art',
  width: 1500,
  url: narrowUrl,
  thumbnailUrl: narrowUrl,
};
const small: UserFile = {
  ...large,
  id: crypto.randomUUID(),
  fileName: 'Small art',
  width: 800,
  height: 400,
  url: smallUrl,
  thumbnailUrl: smallUrl,
};
let files = [large, narrow, small];
const galleryImage: GalleryImage = {
  id: crypto.randomUUID(),
  title: 'Gallery header art',
  width: 2600,
  height: 1000,
  createdAt: new Date().toISOString(),
  url: sourceUrl,
  thumbnailUrl: sourceUrl,
};
let gallery = [
  galleryImage,
  {
    ...galleryImage,
    id: crypto.randomUUID(),
    title: 'Small gallery art',
    width: 800,
    height: 400,
    url: smallUrl,
    thumbnailUrl: smallUrl,
  },
];
let galleryFailure = false;
let settings: UserHeaderSettings = {
  header: { source: 'battlefield', image: null, width: null, height: null },
  selection: null,
  crop: null,
};
const saves: UserHeaderInput[] = [];
const avatarSaves: UserAvatarInput[] = [];
const section = page.locator('section[aria-labelledby="header-heading"]');
const headerImage = () =>
  page.locator('div.flex.min-h-dvh.flex-col > div[aria-hidden="true"] > img');
const battlefield = () =>
  page.locator('div.flex.min-h-dvh.flex-col > div[aria-hidden="true"] > div.rounded-full');

async function saveHeader(name = 'Save header') {
  const response = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/user/header' &&
      response.request().method() === 'POST',
  );
  await section.getByRole('button', { name, exact: true }).click();
  expect((await response).status()).toBe(200);
}

async function setSliderValue(slider: Locator, value: string) {
  await slider.evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function setTheme(theme: 'dark' | 'light') {
  if (
    await page
      .locator('html')
      .evaluate((element, theme) => element.classList.contains(theme), theme)
  )
    return;
  await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(new RegExp(theme));
}

try {
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency) VALUES (${userId},'Header fixture',${userId + '@invalid.local'},false,now(),now(),'Header fixture','USD')`;
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${crypto.randomUUID()},${token},now() + interval '1 hour',${userId},now(),now())`;
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
  await page.route(
    url => url.pathname === '/api/image-gallery',
    async route =>
      route.fulfill(
        galleryFailure
          ? { status: 503, json: { message: 'Gallery temporarily unavailable.' } }
          : { json: { data: { images: gallery, hasMore: false, uploadsEnabled: true } } },
      ),
  );
  await page.route(
    url => url.pathname === '/api/user-files',
    async route => {
      if (route.request().method() === 'POST') {
        const form = await new Response(new Uint8Array(route.request().postDataBuffer()!), {
          headers: { 'Content-Type': route.request().headers()['content-type'] },
        }).formData();
        expect(form.get('purpose')).toBe('header');
        const file = form.get('file') as File;
        const uploaded = {
          ...(file.name === 'small-upload.png' ? small : large),
          id: crypto.randomUUID(),
          fileName: file.name,
        };
        files = [uploaded, ...files];
        await route.fulfill({ status: 201, json: { data: uploaded } });
      } else
        await route.fulfill({
          json: {
            data: {
              files,
              hasMore: false,
              uploadsEnabled: true,
              usedBytes: 4500,
              quotaBytes: 100_000_000,
              fileCount: files.length,
            },
          },
        });
    },
  );
  await page.route(
    url => url.pathname === '/api/user/header',
    async route => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ json: { data: settings } });
        return;
      }
      expect(route.request().headers()['x-requested-with']).toBe('swubase');
      const input = route.request().postDataJSON() as UserHeaderInput;
      saves.push(input);
      if (input.source === 'battlefield')
        settings = {
          header: { source: 'battlefield', image: null, width: null, height: null },
          selection: null,
          crop: null,
        };
      else {
        const original =
          input.source === 'upload'
            ? files.find(file => file.id === input.fileId)!
            : gallery.find(image => image.id === input.galleryImageId)!;
        const selection: HeaderImageOption = {
          source:
            input.source === 'upload'
              ? { source: 'upload', fileId: input.fileId }
              : { source: 'gallery', galleryImageId: input.galleryImageId },
          url: original.url,
          name: 'fileName' in original ? original.fileName : original.title,
          width: original.width,
          height: original.height,
        };
        const bytes = await sharp(
          original.url === smallUrl
            ? smallBytes
            : original.url === narrowUrl
              ? narrowBytes
              : sourceBytes,
        )
          .extract(input.crop)
          .webp()
          .toBuffer();
        settings = {
          header: {
            source: input.source,
            image: 'data:image/webp;base64,' + bytes.toString('base64'),
            width: input.crop.width,
            height: input.crop.height,
          },
          crop: input.crop,
          selection,
        };
      }
      await route.fulfill({ json: { data: settings.header } });
    },
  );
  await page.route(
    url => url.pathname === `/api/user/${userId}/header`,
    route => route.fulfill({ json: { data: settings.header } }),
  );
  await page.route(
    url => url.pathname === '/api/user/avatar',
    async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const input = userAvatarInputSchema.parse(route.request().postDataJSON());
      if (!('fileId' in input)) throw new Error('Expected an uploaded avatar source.');
      avatarSaves.push(input);
      const { left, top, size } = input.crop;
      const bytes = await sharp(sourceBytes)
        .extract({ left, top, width: size, height: size })
        .resize(256, 256)
        .webp()
        .toBuffer();
      await route.fulfill({
        json: { data: { image: 'data:image/webp;base64,' + bytes.toString('base64') } },
      });
    },
  );
  await page.goto(origin + '/settings?page=profile');
  await expect(section.getByRole('heading', { name: 'Profile header', exact: true })).toBeVisible();
  await expect(section.getByRole('tab', { name: 'Battlefield', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(battlefield()).toBeVisible();
  const avatar = page.locator('section[aria-labelledby="avatar-heading"]');
  await avatar.getByRole('tab', { name: 'Images', exact: true }).click();
  await avatar.getByRole('button', { name: 'Select My header art', exact: true }).click();
  await expect(avatar.getByRole('slider', { name: 'Square size', exact: true })).toHaveValue('650');
  await dragCropCorner(page, avatar.locator('svg.touch-none'), 200, 200);
  await expect(avatar.getByRole('slider', { name: 'Square size', exact: true })).toHaveValue('850');
  await expect(avatar.locator('svg.touch-none rect')).toHaveAttribute('width', '850');
  await expect(avatar.locator('svg.touch-none rect')).toHaveAttribute('height', '850');
  const avatarResponse = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/user/avatar' &&
      response.request().method() === 'POST',
  );
  await avatar.getByRole('button', { name: 'Save avatar', exact: true }).click();
  expect((await avatarResponse).status()).toBe(200);
  await expect(avatar.locator('svg.touch-none')).toHaveCount(0);
  expect(avatarSaves.at(-1)).toMatchObject({ fileId: large.id, crop: { size: 850 } });
  await section.getByRole('tab', { name: 'My images', exact: true }).click();
  await section
    .getByRole('button', { name: 'Select Small art (low resolution)', exact: true })
    .click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('800');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('200');
  await expect(
    section.getByRole('status').filter({ hasText: 'Low-resolution header' }),
  ).toBeVisible();
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: small.id,
    crop: { width: 800, height: 200 },
  });
  await section.getByRole('button', { name: 'Select Minimum-width art', exact: true }).click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1500');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('375');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveAttribute('max', '375');
  await setSliderValue(section.getByRole('slider', { name: /^Height:/ }), '300');
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: narrow.id,
    crop: { width: 1500, height: 300 },
  });
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await page
    .getByRole('navigation', { name: 'User settings', exact: true })
    .getByRole('link', { name: 'Uploads', exact: true })
    .click();
  await expect(page).toHaveURL(origin + '/settings?page=uploads');
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await page.reload();
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  const refreshedProfileHeader = page.waitForResponse(
    response => new URL(response.url()).pathname === `/api/user/${userId}/header`,
  );
  await page.getByRole('link', { name: 'View profile', exact: true }).click();
  expect((await refreshedProfileHeader).status()).toBe(200);
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  // Simulate an update from another tab while the existing header is still cached.
  const legacyCrop = { left: 0, top: 100, width: 1500, height: 400 };
  const legacyBytes = await sharp(narrowBytes).extract(legacyCrop).webp().toBuffer();
  settings = {
    ...settings,
    crop: legacyCrop,
    header: {
      ...settings.header,
      height: 400,
      image: 'data:image/webp;base64,' + legacyBytes.toString('base64'),
    },
  };
  await page.getByRole('link', { name: 'User settings', exact: true }).click();
  await expect(page).toHaveURL(origin + '/settings?page=profile');
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1500');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('375');
  await expect(section.getByRole('slider', { name: /^Vertical position:/ })).toHaveValue('112');
  const updatedCrop = { ...legacyCrop, top: 112, height: 375 };
  const updatedBytes = await sharp(narrowBytes).extract(updatedCrop).webp().toBuffer();
  settings = {
    ...settings,
    crop: updatedCrop,
    header: {
      ...settings.header,
      height: 375,
      image: 'data:image/webp;base64,' + updatedBytes.toString('base64'),
    },
  };
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await section.getByRole('button', { name: 'Select My header art', exact: true }).click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1600');
  await dragCropCorner(page, section.locator('svg.touch-none'), 400, 100);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('2000');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('500');
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: large.id,
    crop: { width: 2000, height: 500 },
  });
  await setSliderValue(section.getByRole('slider', { name: /^Width:/ }), '1600');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('400');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveAttribute('max', '400');
  await setSliderValue(section.getByRole('slider', { name: /^Width:/ }), '1599');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('399');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveAttribute('max', '399');
  await setSliderValue(section.getByRole('slider', { name: /^Width:/ }), '1500');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('375');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveAttribute('max', '375');
  await section.getByRole('slider', { name: /^Width:/ }).press('Home');
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('4');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('1');
  const oldLeft = Number(
    await section.getByRole('slider', { name: /^Horizontal position:/ }).inputValue(),
  );
  const tinyTop = Number(
    await section.getByRole('slider', { name: /^Vertical position:/ }).inputValue(),
  );
  await dragCropBody(page, section.locator('svg.touch-none'), 100, 80);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('4');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('1');
  expect(
    Number(await section.getByRole('slider', { name: /^Horizontal position:/ }).inputValue()),
  ).toBeGreaterThan(oldLeft);
  expect(
    Number(await section.getByRole('slider', { name: /^Vertical position:/ }).inputValue()),
  ).toBeGreaterThan(tinyTop);
  await dragCropCorner(page, section.locator('svg.touch-none'), 100, 25);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('104');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('26');
  await section.getByRole('slider', { name: /^Horizontal position:/ }).press('End');
  await section.getByRole('slider', { name: /^Vertical position:/ }).press('End');
  await expect(section.getByRole('slider', { name: /^Horizontal position:/ })).toHaveValue('2496');
  await expect(section.getByRole('slider', { name: /^Vertical position:/ })).toHaveValue('974');
  await dragCropCorner(page, section.locator('svg.touch-none'), -40, -10);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('64');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('16');
  await expect(section.getByRole('slider', { name: /^Horizontal position:/ })).toHaveValue('2496');
  await expect(section.getByRole('slider', { name: /^Vertical position:/ })).toHaveValue('974');
  await section.getByRole('slider', { name: /^Width:/ }).press('End');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveAttribute('max', '650');
  await section.getByRole('slider', { name: /^Height:/ }).press('End');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('650');
  await expect(section.getByText('Height: 650 px', { exact: true })).toBeVisible();
  const cropSvg = section.locator('svg.touch-none');
  const oldTop = Number(
    await section.getByRole('slider', { name: /^Vertical position:/ }).inputValue(),
  );
  await dragCropBody(page, cropSvg, 0, -100);
  expect(
    Number(await section.getByRole('slider', { name: /^Vertical position:/ }).inputValue()),
  ).toBeLessThan(oldTop);
  await section.getByRole('slider', { name: /^Width:/ }).press('End');
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: large.id,
    crop: { width: 2600, height: 650 },
  });
  await page.goto(origin + '/users/' + userId);
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  const box = (await headerImage().boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(400);
  expect(box.height).toBeCloseTo((box.width * 650) / 2600, 0);
  expect(await headerImage().evaluate(image => getComputedStyle(image).objectFit)).toBe('contain');
  await page.reload();
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await page.goto(origin + '/settings?page=profile');
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('2600');
  await section
    .getByLabel('Choose header image', { exact: true })
    .setInputFiles({ name: 'small-upload.png', mimeType: 'image/png', buffer: smallBytes });
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('800');
  await expect(
    section.getByRole('status').filter({ hasText: 'Low-resolution header' }),
  ).toBeVisible();
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: files[0].id,
    crop: { width: 800, height: 200 },
  });
  await section
    .getByLabel('Choose header image', { exact: true })
    .setInputFiles({ name: 'upload.png', mimeType: 'image/png', buffer: sourceBytes });
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1600');
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({ source: 'upload', fileId: files[0].id });
  await section.getByRole('tab', { name: 'Gallery', exact: true }).click();
  await section
    .getByRole('button', { name: 'Select Small gallery art (low resolution)', exact: true })
    .click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('800');
  await expect(
    section.getByRole('status').filter({ hasText: 'Low-resolution header' }),
  ).toBeVisible();
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'gallery',
    galleryImageId: gallery[1].id,
    crop: { width: 800, height: 200 },
  });
  await section.getByRole('button', { name: 'Select Gallery header art', exact: true }).click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1600');
  await setTheme('light');
  await section.screenshot({ path: '.swubase/header-screenshots/wide-light.png' });
  await setTheme('dark');
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: '.swubase/header-screenshots/narrow-dark.png' });
  await saveHeader();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'gallery',
    galleryImageId: galleryImage.id,
    crop: { width: 1600, height: 400 },
  });
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  settings.selection = null;
  await page.reload();
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await expect(section.getByText(/The original image is no longer available/)).toBeVisible();
  await section.getByRole('tab', { name: 'Battlefield', exact: true }).click();
  await saveHeader('Use battlefield');
  await expect(
    section.getByRole('button', { name: 'Use battlefield', exact: true }),
  ).toBeDisabled();
  expect(saves.at(-1)).toEqual({ source: 'battlefield' });
  await expect(headerImage()).toHaveCount(0);
  await expect(battlefield()).toBeVisible();
  await page.goto(origin + '/users/' + userId);
  await expect(page.getByRole('heading', { name: 'Header fixture', exact: true })).toBeVisible();
  await expect(headerImage()).toHaveCount(0);
  gallery = [];
  await page.goto(origin + '/settings?page=profile');
  await section.getByRole('tab', { name: 'Gallery', exact: true }).click();
  await expect(
    section.getByText('No gallery images yet. Check back when artwork has been added.'),
  ).toBeVisible();
  galleryFailure = true;
  await page.reload();
  await section.getByRole('tab', { name: 'Gallery', exact: true }).click();
  await expect(section.getByText('Gallery temporarily unavailable.')).toBeVisible();
  galleryFailure = false;
  await section.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    section.getByText('No gallery images yet. Check back when artwork has been added.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Header browser checks passed: crop drag/keyboard, uploads, gallery, matching settings/profile headers, settings tabs/refresh, source deletion, battlefield, empty/error states, phone/desktop, light/dark.',
  );
} catch (error) {
  await page.screenshot({ path: '.swubase/header-screenshots/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
