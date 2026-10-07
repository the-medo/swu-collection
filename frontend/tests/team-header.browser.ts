// TEAM_HEADER_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/team-header.browser.ts
// Isolated local fixtures and mocked image APIs; no R2 objects are written.
import { chromium, expect as baseExpect, type BrowserContext, type Locator } from 'playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';
import { dragCropBody, dragCropCorner } from './image-crop.helpers.ts';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import type { TeamHeaderInput, TeamHeaderSettings } from '../../types/TeamHeader.ts';
import type { HeaderImageOption } from '../../types/UserHeader.ts';
import type { GalleryImage } from '../../types/ImageGallery.ts';
import type { UserFile } from '../../types/UserFile.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.TEAM_HEADER_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const expect = baseExpect.configure({ timeout: 30_000 });
const sql = postgres(database.toString(), { max: 2 });
const teamId = crypto.randomUUID();
const shortcut = 'header-' + teamId.slice(0, 8);
const users = ['owner', 'member'].map(role => `team-header-browser-${role}-${crypto.randomUUID()}`);
const browser = await chromium.launch();
const contexts: BrowserContext[] = [];
const errors: string[] = [];
const screenshotDir = '.swubase/team-header-screenshots';
await mkdir(screenshotDir, { recursive: true });
const headerPath = `/api/teams/${teamId}/header`;
let settings: TeamHeaderSettings = {
  header: { source: null, image: null, width: null, height: null },
  selection: null,
  crop: null,
};
let settingsFailure = false,
  saveFailure = false,
  galleryFailure = false;
const saves: TeamHeaderInput[] = [];
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
  fileName: 'My team art',
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
  title: 'Gallery team art',
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

async function setSliderValue(slider: Locator, value: string) {
  await slider.evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function pageFor(index?: number) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  contexts.push(context);
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
  });
  if (index !== undefined) {
    const token = crypto.randomUUID();
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${crypto.randomUUID()},${token},now() + interval '1 hour',${users[index]},now(),now())`;
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
  await context.route(
    url => url.pathname === headerPath,
    route => route.fulfill({ json: { data: settings.header } }),
  );
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
  return page;
}

try {
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency)
    VALUES (${users[0]},'Header owner',${users[0] + '@invalid.local'},false,now(),now(),'Header owner','USD'),
    (${users[1]},'Header member',${users[1] + '@invalid.local'},false,now(),now(),'Header member','USD')`;
  await sql`INSERT INTO team (id,name,shortcut,privacy) VALUES (${teamId},'Team header fixture',${shortcut},'public')`;
  await sql`INSERT INTO team_member (team_id,user_id,role) VALUES (${teamId},${users[0]},'owner'),(${teamId},${users[1]},'member')`;
  const page = await pageFor(0);
  const section = page.locator('section[aria-labelledby="team-header-heading"]');
  const headerImage = () => page.locator('div[aria-hidden="true"] > img').first();
  const teamUrl = `${origin}/teams/${shortcut}`;
  const settingsUrl = teamUrl + '?teamTab=settings';
  const navigation = page.getByRole('navigation', { name: 'Team sections', exact: true });
  await page.route(
    url => url.pathname === headerPath + '/settings',
    route =>
      route.fulfill(
        settingsFailure
          ? { status: 503, json: { message: 'Header settings temporarily unavailable.' } }
          : { json: { data: settings } },
      ),
  );
  await page.route(
    url => url.pathname === headerPath,
    async route => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ json: { data: settings.header } });
        return;
      }
      expect(route.request().headers()['x-requested-with']).toBe('swubase');
      if (saveFailure) {
        await route.fulfill({ status: 502, json: { message: 'Could not store this header.' } });
        return;
      }
      const input = route.request().postDataJSON() as TeamHeaderInput;
      saves.push(input);
      if (input.source === 'none')
        settings = {
          header: { source: null, image: null, width: null, height: null },
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
          name: 'fileName' in original ? original.fileName : original.title,
          url: original.url,
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
          selection,
          crop: input.crop,
        };
      }
      await route.fulfill({ json: { data: settings.header } });
    },
  );
  await page.route(
    url => url.pathname === '/api/image-gallery',
    route =>
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
        expect(route.request().postData()).toContain('header');
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
  async function save(name = 'Save header', expectedStatus = 200) {
    const response = page.waitForResponse(
      response =>
        new URL(response.url()).pathname === headerPath && response.request().method() === 'POST',
    );
    await section.getByRole('button', { name, exact: true }).click();
    expect((await response).status()).toBe(expectedStatus);
  }
  async function theme(value: 'light' | 'dark') {
    if (await page.locator('html').evaluate((node, value) => node.classList.contains(value), value))
      return;
    await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Toggle theme', exact: true }).click();
    await expect(page.locator('html')).toHaveClass(new RegExp(value));
  }
  await page.goto(settingsUrl);
  await expect(section.getByRole('heading', { name: 'Team header', exact: true })).toBeVisible();
  await expect(section.getByRole('tab')).toHaveCount(2);
  await expect(section.getByRole('tab', { name: 'Battlefield', exact: true })).toHaveCount(0);
  await expect(
    section.getByRole('button', { name: 'Remove header image', exact: true }),
  ).toHaveCount(0);
  await section
    .getByRole('button', { name: 'Select Small art (low resolution)', exact: true })
    .click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('800');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('200');
  await expect(
    section.getByRole('status').filter({ hasText: 'Low-resolution header' }),
  ).toBeVisible();
  await save();
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
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: narrow.id,
    crop: { width: 1500, height: 300 },
  });
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
  await page.reload();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1500');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('375');
  await expect(section.getByRole('slider', { name: /^Vertical position:/ })).toHaveValue('112');
  await section.getByRole('button', { name: 'Select My team art', exact: true }).click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1600');
  await dragCropCorner(page, section.locator('svg.touch-none'), 400, 100);
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('2000');
  await expect(section.getByRole('slider', { name: /^Height:/ })).toHaveValue('500');
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: large.id,
    crop: { width: 2000, height: 500 },
  });
  await setSliderValue(section.getByRole('slider', { name: /^Width:/ }), '1600');
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
  await section.getByRole('slider', { name: /^Width:/ }).press('End');
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: large.id,
    crop: { width: 2600, height: 650 },
  });
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await navigation.getByRole('link', { name: 'Decks', exact: true }).click();
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  await page.reload();
  await expect(headerImage()).toHaveAttribute('src', settings.header.image!);
  const box = (await headerImage().boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(400);
  expect(box.height).toBeCloseTo((box.width * 650) / 2600, 0);
  await navigation.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('2600');
  await section
    .getByLabel('Choose header image', { exact: true })
    .setInputFiles({ name: 'small-upload.png', mimeType: 'image/png', buffer: smallBytes });
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('800');
  await expect(
    section.getByRole('status').filter({ hasText: 'Low-resolution header' }),
  ).toBeVisible();
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'upload',
    fileId: files[0].id,
    crop: { width: 800, height: 200 },
  });
  await section
    .getByLabel('Choose header image', { exact: true })
    .setInputFiles({ name: 'team-upload.png', mimeType: 'image/png', buffer: sourceBytes });
  await expect(section.getByRole('slider', { name: /^Width:/ })).toHaveValue('1600');
  await save();
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
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'gallery',
    galleryImageId: gallery[1].id,
    crop: { width: 800, height: 200 },
  });
  await section.getByRole('button', { name: 'Select Gallery team art', exact: true }).click();
  saveFailure = true;
  const previous = settings.header.image!;
  await save('Save header', 502);
  await expect(section.getByText('Could not store this header.', { exact: true })).toBeVisible();
  await expect(headerImage()).toHaveAttribute('src', previous);
  saveFailure = false;
  for (const value of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await theme(value);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await section
        .getByRole('heading', { name: 'Team header', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshotDir}/${value}-${width}.png` });
    }
  }
  await save();
  await expect(section.getByRole('button', { name: 'Save header', exact: true })).toBeEnabled();
  expect(saves.at(-1)).toMatchObject({
    source: 'gallery',
    galleryImageId: galleryImage.id,
    crop: { width: 1600, height: 400 },
  });
  const anonymous = await pageFor();
  await anonymous.goto(teamUrl);
  await expect(anonymous.locator('div[aria-hidden="true"] > img').first()).toHaveAttribute(
    'src',
    settings.header.image!,
  );
  expect((await anonymous.request.get(origin + headerPath + '/settings')).status()).toBe(401);
  await expect(anonymous.getByRole('heading', { name: 'Team header', exact: true })).toHaveCount(0);
  const member = await pageFor(1);
  await member.goto(teamUrl + '?teamTab=settings');
  await expect(member).not.toHaveURL(/teamTab=settings/);
  await expect(member.getByRole('heading', { name: 'Team header', exact: true })).toHaveCount(0);
  expect((await member.request.get(origin + headerPath + '/settings')).status()).toBe(403);
  settings.selection = null;
  await page.reload();
  await expect(
    section.getByText(/The original image is unavailable or belongs to another owner/),
  ).toBeVisible();
  await save('Remove header image');
  await expect(
    section.getByRole('button', { name: 'Remove header image', exact: true }),
  ).toHaveCount(0);
  expect(saves.at(-1)).toEqual({ source: 'none' });
  await expect(headerImage()).toHaveCount(0);
  gallery = [];
  await page.reload();
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
  settingsFailure = true;
  await page.reload();
  await expect(section.getByText('Header settings temporarily unavailable.')).toBeVisible();
  settingsFailure = false;
  await section.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(section.getByRole('tab')).toHaveCount(2);
  expect(errors).toEqual([]);
  console.log(
    'Team header browser checks passed: own images/uploads, gallery/crops, immediate display/refresh, removal/default, owner/member/anonymous access, failures/retry, source privacy message, phone/desktop and light/dark.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await sql`DELETE FROM team WHERE id=${teamId}`;
  for (const id of users) await sql`DELETE FROM "user" WHERE id=${id}`;
  await sql.end();
}
