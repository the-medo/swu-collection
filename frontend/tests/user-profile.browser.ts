// USER_PROFILE_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-profile.browser.ts
// Saves only to a temporary account in the isolated worktree database; cleans it up afterward.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { cardList } from '../../server/db/lists.ts';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { selectDefaultVariant } from '../../server/lib/cards/selectDefaultVariant.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.USER_PROFILE_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw Error('Enable only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw Error('Expected a development origin.');
const sql = postgres(database.toString(), { max: 1 });
const id = `profile-browser-${crypto.randomUUID()}`;
const token = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
const leader = Object.values(cardList).find(
  c => c?.type === 'Leader' && c.title === 'Luke Skywalker',
)!;
const card = Object.values(cardList).find(c => c?.title === 'Battlefield Marine')!;
const group = page.getByRole('group', { name: 'Player favorites', exact: true });
const profileUrl = `${origin}/users/${id}?userTab=calendar`;
const apiUrl = `${origin}/api/user/${id}/profile`;
const getFavorites = async () => (await (await context.request.get(apiUrl)).json()).data;
const screenshots = new URL('../../.swubase/profile-favorites/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${id}, 'Profile Explorer', ${'Profile Explorer ' + id.slice(-6)}, ${id + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${id}, now(), now())`;
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
  await page.goto(profileUrl);
  await expect(group.getByRole('button', { name: 'Edit favorite leader: Not set' })).toBeEnabled();
  await expect(group.getByRole('heading', { name: 'Favorites', exact: true })).toBeVisible();
  await expect(group.getByRole('button')).toHaveCount(3);
  expect((await getFavorites()).favoriteAspects).toEqual([]);
  expect(
    await group
      .locator('button')
      .first()
      .evaluate(el => getComputedStyle(el).borderStyle),
  ).toBe('dashed');

  await group.getByRole('button', { name: 'Edit favorite leader: Not set' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Search', { exact: true }).fill(leader.title);
  await dialog.getByAltText(`card-${leader.cardId}`, { exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    group.getByRole('button', { name: `Edit favorite leader: ${leader.name}`, exact: true }),
  ).toBeEnabled();
  expect((await getFavorites()).favoriteLeaderCardId).toBe(leader.cardId);
  await expect(
    group.getByRole('button', { name: `Edit favorite leader: ${leader.name}`, exact: true }),
  ).toBeFocused();

  const rejectedLeader = Object.values(cardList).find(
    c => c?.type === 'Leader' && c.title === 'Darth Vader',
  )!;
  await group.getByRole('button', { name: `Edit favorite leader: ${leader.name}` }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Search', { exact: true }).fill(rejectedLeader.title);
  await dialog.getByAltText(`card-${rejectedLeader.cardId}`, { exact: true }).first().click();
  await page.route(apiUrl, route =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 400, json: { message: 'Test leader save failure' } })
      : route.continue(),
  );
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Test leader save failure', { exact: true })).toBeVisible();
  await expect(
    group.getByRole('button', { name: `Edit favorite leader: ${leader.name}` }),
  ).toBeFocused();
  await page.unroute(apiUrl);
  await group.getByRole('button', { name: `Edit favorite leader: ${leader.name}` }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: leader.title, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  console.log('Leader focus after successful/failed saves and resetting unsaved selection passed.');

  await group.getByRole('button', { name: 'Edit favorite card: Not set' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Search...', { exact: true }).fill(card.title);
  await page.getByRole('option').filter({ hasText: card.name }).first().click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    group.getByRole('button', { name: `Edit favorite card: ${card.name}`, exact: true }),
  ).toBeEnabled();
  expect((await getFavorites()).favoriteCardId).toBe(card.cardId);

  await group.getByRole('button', { name: 'Edit favorite aspects: Not set' }).click();
  dialog = page.getByRole('dialog');
  for (const [index, aspect] of ['Command', 'Command', 'Heroism'].entries()) {
    await dialog
      .getByRole('group', { name: `Aspect ${index + 1}`, exact: true })
      .locator(`button[aria-label="${aspect}"]`)
      .click();
  }
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await getFavorites()).favoriteAspects).toEqual(['Command', 'Command', 'Heroism']);
  await page.reload();
  await expect(
    group.getByRole('button', { name: 'Edit favorite aspects: Command, Command, Heroism' }),
  ).toBeVisible();
  console.log('Leader, command-search card, duplicate aspects and reload persistence passed.');

  await group.getByRole('button', { name: `Edit favorite card: ${card.name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await getFavorites()).favoriteCardId).toBe(card.cardId);
  await group.getByRole('button', { name: /Edit favorite aspects:/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear', exact: true }).click();
  await page.route(apiUrl, route =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 503, json: { message: 'Test save failure' } })
      : route.continue(),
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Test save failure', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await getFavorites()).favoriteAspects).toEqual(['Command', 'Command', 'Heroism']);
  await page.unroute(apiUrl);
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await getFavorites()).favoriteAspects).toEqual([]);
  console.log('Cancel, save failure recovery and clearing passed.');

  await group.getByRole('button', { name: /Edit favorite aspects:/ }).click();
  for (const index of [1, 2, 3]) {
    await page
      .getByRole('dialog')
      .getByRole('group', { name: `Aspect ${index}`, exact: true })
      .locator('button[aria-label="Command"]')
      .click();
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  for (const [kind, sample] of [
    ['leader', leader],
    ['card', card],
  ] as const) {
    const trigger = group.getByRole('button', {
      name: `Edit favorite ${kind}: ${sample.name}`,
      exact: true,
    });
    const preview = page
      .locator('[data-radix-popper-content-wrapper]')
      .getByAltText(`card-${sample.cardId}`, { exact: true });
    await trigger.hover();
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute(
      'src',
      `https://images.swubase.com/cards/${sample.variants[selectDefaultVariant(sample)!]!.image.front}`,
    );
    const bounds = await preview.boundingBox();
    expect(bounds!.width).toBeGreaterThan(200);
    expect(bounds!.height).toBeGreaterThan(200);
    const originalTrigger = await trigger.elementHandle();
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(preview).toBeHidden();
    expect(await originalTrigger!.evaluate(el => el.isConnected)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await originalTrigger!.evaluate(el => el.isConnected)).toBe(true);
    await group.getByRole('button', { name: /Edit favorite aspects:/ }).focus();
    await page.mouse.move(1000, 100);
    await expect(preview).toBeHidden();
    await trigger.click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: kind === 'leader' ? 'Close' : 'Cancel', exact: true })
      .click();
    await expect(trigger).toBeFocused();
    await page.mouse.move(1000, 100);
    await expect(preview).toBeHidden();
    await page.keyboard.press('Tab');
    await trigger.focus();
    await expect(preview).toBeVisible();
    await group.getByRole('button', { name: /Edit favorite aspects:/ }).focus();
    await expect(preview).toBeHidden();
  }
  await expect(group.getByText(/^(Leader|Card|Aspects)$/)).toHaveCount(0);
  console.log('Full-card hover previews, editor clicks and focus return passed.');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('vite-ui-theme', theme), theme);
    await page.reload();
    await expect(group).toBeVisible();
    for (const width of [1440, 1100, 800, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      const metrics = await page.locator('main').evaluate(main => {
        const header = main.querySelector('h1')!.parentElement!;
        const grid = header.parentElement!;
        const dividers = grid.querySelectorAll('hr');
        const bio = dividers[0].parentElement!;
        const favorites = main.querySelector('[aria-label="Player favorites"]')!;
        const sidebar = main.querySelector('aside[aria-label="Player details"]')!;
        const metadata = sidebar.querySelector('dl')!;
        const actions = sidebar.querySelector('[aria-label="Profile actions"]')!;
        const leaderTile = favorites
          .querySelector('[aria-label^="Edit favorite leader:"]')!
          .getBoundingClientRect();
        const cardTile = favorites
          .querySelector('[aria-label^="Edit favorite card:"]')!
          .getBoundingClientRect();
        const aspectTile = favorites
          .querySelector('[aria-label^="Edit favorite aspects:"]')!
          .getBoundingClientRect();
        return {
          overflow: main.scrollWidth > main.clientWidth + 1,
          dividers: dividers.length,
          lineWidth:
            dividers[0].getBoundingClientRect().width === bio.getBoundingClientRect().width,
          margins: Array.from(dividers).every(el => getComputedStyle(el).margin === '0px'),
          contentPadding: getComputedStyle(dividers[1].nextElementSibling!).padding,
          favoritesInSidebar: sidebar.contains(favorites) && !header.contains(favorites),
          favoritesAfterMetadata:
            favorites.getBoundingClientRect().top >= metadata.getBoundingClientRect().bottom,
          actionsBeforeFavorites:
            actions.getBoundingClientRect().bottom <= favorites.getBoundingClientRect().top,
          cardsSideBySide:
            Math.abs(leaderTile.top - cardTile.top) < 1 && leaderTile.right < cardTile.left,
          aspectsFullWidth:
            Math.abs(aspectTile.width - favorites.getBoundingClientRect().width) < 1,
          aspectSizes: Array.from(favorites.querySelectorAll('img[alt="Command"]')).map(
            el => el.getBoundingClientRect().width,
          ),
        };
      });
      expect(metrics).toEqual({
        overflow: false,
        dividers: 2,
        lineWidth: true,
        margins: true,
        contentPadding: '8px',
        favoritesInSidebar: true,
        favoritesAfterMetadata: true,
        actionsBeforeFavorites: true,
        cardsSideBySide: true,
        aspectsFullWidth: true,
        aspectSizes: [32, 32, 32],
      });
      if (width === 1440 || width === 390)
        await page.screenshot({ path: `${screenshots}/${theme}-${width}.png` });
    }
  }
  await group.getByRole('button', { name: /Edit favorite aspects:/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(group.getByRole('button', { name: /Edit favorite aspects:/ })).toBeFocused();
  console.log(
    'Light/dark desktop/mobile, divider width, compact content and keyboard focus passed.',
  );

  // Red outside the requested artwork rectangle catches borders/overlays;
  // four green corner markers detect a second crop in the profile tile.
  await page.setViewportSize({ width: 1440, height: 1100 });
  const cropCases = [
    {
      label: 'Leader',
      sample: leader,
      side: 'back',
      width: 300,
      height: 418,
      crop: [49, 63, 199, 172],
    },
    {
      label: 'Landscape leader',
      sample: cardList['chancellor-palpatine--playing-both-sides']!,
      side: 'back',
      width: 418,
      height: 300,
      crop: [30, 28, 145, 125.32663316582915],
    },
    {
      label: 'Event',
      sample: cardList['vanquish']!,
      side: 'front',
      width: 300,
      height: 418,
      crop: [54.627906976744185, 217, 189.74418604651163, 164],
    },
    {
      label: 'Base',
      sample: cardList['echo-base']!,
      side: 'front',
      width: 418,
      height: 300,
      crop: [29, 50, 360, 196],
    },
    {
      label: 'Unit',
      sample: cardList['aayla-secura--master-of-the-blade']!,
      side: 'front',
      width: 300,
      height: 419,
      crop: [49, 63, 199, 172],
    },
    {
      label: 'Upgrade',
      sample: cardList['abandoned-the-order']!,
      side: 'front',
      width: 300,
      height: 419,
      crop: [49, 63, 199, 172],
    },
  ] as const;
  for (const { label, sample, side, width, height, crop } of cropCases) {
    const variant = sample.variants[selectDefaultVariant(sample)!]!;
    const src = `https://images.swubase.com/cards/${side === 'back' ? variant.image.back : variant.image.front}`;
    const [x, y, cropWidth, cropHeight] = crop;
    const markerSize = cropWidth * 0.05;
    const insetX = cropWidth * 0.08;
    const insetY = cropHeight * 0.08;
    const corners = [
      [x + insetX, y + insetY],
      [x + cropWidth - insetX - markerSize, y + insetY],
      [x + insetX, y + cropHeight - insetY - markerSize],
      [x + cropWidth - insetX - markerSize, y + cropHeight - insetY - markerSize],
    ]
      .map(
        ([cx, cy]) =>
          `<rect x="${cx}" y="${cy}" width="${markerSize}" height="${markerSize}" fill="#20da40"/>`,
      )
      .join('');
    await page.route(src, route =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f02d2d"/><rect x="${x}" y="${y}" width="${cropWidth}" height="${cropHeight}" fill="#237bd5"/>${corners}<circle cx="${x + cropWidth / 2}" cy="${y + cropHeight / 2}" r="${markerSize}" fill="white"/></svg>`,
      }),
    );
    const response = await context.request.patch(apiUrl, {
      data: { favoriteCardId: sample.cardId },
      headers: { 'X-Requested-With': 'swubase' },
    });
    expect(response.status()).toBe(200);
    await page.reload();
    const tile = group.getByRole('button', {
      name: `Edit favorite card: ${sample.name}`,
      exact: true,
    });
    const artwork = tile.locator('svg[role="img"]');
    await expect(artwork.locator('image')).toHaveAttribute('href', src);
    await page.evaluate(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, src);
    for (const viewportWidth of [1440, ...(['Unit', 'Base'].includes(label) ? [390] : [])]) {
      await page.setViewportSize({ width: viewportWidth, height: 1100 });
      await page.mouse.move(1000, 700);
      const layout = await tile.evaluate(el => {
        const tile = el.getBoundingClientRect();
        const image = el.querySelector('svg[role="img"]')!.getBoundingClientRect();
        return {
          ratio: tile.width / tile.height,
          left: image.left - tile.left - el.clientLeft,
          top: image.top - tile.top - el.clientTop,
          widthGap: el.clientWidth - image.width,
          heightGap: el.clientHeight - image.height,
        };
      });
      expect(Math.abs(layout.ratio - cropWidth / cropHeight)).toBeLessThan(0.015);
      for (const gap of [layout.left, layout.top, layout.widthGap, layout.heightGap])
        expect(Math.abs(gap)).toBeLessThanOrEqual(1);
      if (label === 'Base') {
        const leaderBounds = await group
          .getByRole('button', { name: `Edit favorite leader: ${leader.name}`, exact: true })
          .boundingBox();
        const baseBounds = await tile.boundingBox();
        expect(Math.abs(leaderBounds!.y - baseBounds!.y)).toBeLessThan(1);
      }

      const { data, info } = await sharp(await tile.screenshot())
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let bluePixels = 0,
        redPixels = 0,
        pixels = 0;
      const greenCorners = [0, 0, 0, 0];
      const circle = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      for (let y = 3; y < info.height - 3; y++)
        for (let x = 3; x < info.width - 3; x++) {
          const i = (y * info.width + x) * info.channels;
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          pixels++;
          if (b > 180 && r < 70 && g > 90 && g < 160) bluePixels++;
          if (r < 70 && g > 180 && b < 100)
            greenCorners[(y >= info.height / 2 ? 2 : 0) + (x >= info.width / 2 ? 1 : 0)]++;
          if (r > 200 && g < 80 && b < 80) redPixels++;
          if (r > 245 && g > 245 && b > 245) {
            circle.minX = Math.min(circle.minX, x);
            circle.maxX = Math.max(circle.maxX, x);
            circle.minY = Math.min(circle.minY, y);
            circle.maxY = Math.max(circle.maxY, y);
          }
        }
      expect(redPixels).toBe(0);
      expect(circle.maxX - circle.minX).toBeGreaterThan(4);
      expect(Math.abs(circle.maxX - circle.minX - (circle.maxY - circle.minY))).toBeLessThanOrEqual(
        2,
      );
      expect(bluePixels / pixels).toBeGreaterThan(0.95);
      for (const count of greenCorners) expect(count).toBeGreaterThan(3);
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    console.log(
      `${label}: measured region, preserved corners, tile proportions and no overlays passed.`,
    );
  }

  const failedCard = cropCases.at(-1)!.sample;
  const failedSrc = `https://images.swubase.com/cards/${failedCard.variants[selectDefaultVariant(failedCard)!]!.image.front}`;
  await page.route(failedSrc, route => route.abort());
  await page.reload();
  const failedTile = group.getByRole('button', {
    name: `Edit favorite card: ${failedCard.name}`,
    exact: true,
  });
  await expect(
    failedTile.getByRole('img', { name: `${failedCard.name}: artwork unavailable`, exact: true }),
  ).toBeVisible();
  await failedTile.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(failedTile).toBeFocused();
  const recoveredCard = cropCases.find(c => c.label === 'Unit')!.sample;
  const recoveredSrc = `https://images.swubase.com/cards/${recoveredCard.variants[selectDefaultVariant(recoveredCard)!]!.image.front}`;
  await failedTile.click();
  dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Search...', { exact: true }).fill(recoveredCard.title);
  await page.getByRole('option').filter({ hasText: recoveredCard.name }).first().click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  const recoveredImage = group
    .getByRole('button', { name: `Edit favorite card: ${recoveredCard.name}`, exact: true })
    .locator('svg[role="img"] image');
  await expect(recoveredImage).toBeVisible();
  await expect(recoveredImage).toHaveAttribute('href', recoveredSrc);
  expect((await getFavorites()).favoriteCardId).toBe(recoveredCard.cardId);
  console.log(
    'Failed image placeholder, continued editing, focus return and source recovery passed.',
  );

  const unsupportedCard = cardList['the-force']!;
  expect(
    (
      await context.request.patch(apiUrl, {
        data: { favoriteCardId: unsupportedCard.cardId },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  const unsupportedTile = group.getByRole('button', {
    name: `Edit favorite card: ${unsupportedCard.name}`,
    exact: true,
  });
  await expect(
    unsupportedTile.getByRole('img', {
      name: `${unsupportedCard.name}: artwork unavailable`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(unsupportedTile).toBeEnabled();
  console.log('Unmeasured landscape artwork uses an editable placeholder.');

  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(profileUrl);
  const publicGroup = publicPage.getByRole('group', { name: 'Player favorites', exact: true });
  await expect(publicGroup).toBeVisible();
  await expect(publicGroup.locator('button')).toHaveCount(0);
  const publicLeader = publicGroup.getByLabel(`Favorite leader: ${leader.name}`, { exact: true });
  await expect(publicLeader).toHaveAttribute('role', 'img');
  await expect(publicLeader).toHaveAttribute('tabindex', '0');
  await publicLeader.hover();
  await expect(publicPage.getByAltText(`card-${leader.cardId}`, { exact: true })).toBeVisible();
  await publicPage.mouse.move(1000, 100);
  await expect(publicPage.getByAltText(`card-${leader.cardId}`, { exact: true })).toBeHidden();
  await publicPage.setViewportSize({ width: 390, height: 1100 });
  await expect(publicLeader).not.toHaveAttribute('tabindex', '0');
  for (const populated of ['leader', 'card', 'aspects', 'none']) {
    expect(
      (
        await context.request.patch(apiUrl, {
          data: {
            favoriteLeaderCardId: populated === 'leader' ? leader.cardId : null,
            favoriteCardId: populated === 'card' ? card.cardId : null,
            favoriteAspects: populated === 'aspects' ? ['Command'] : [],
          },
          headers: { 'X-Requested-With': 'swubase' },
        })
      ).status(),
    ).toBe(200);
    const favoritesLoaded = publicPage.waitForResponse(
      response => response.url() === apiUrl && response.request().method() === 'GET',
    );
    await publicPage.reload();
    expect((await favoritesLoaded).status()).toBe(200);
    await expect(publicPage.getByLabel('Loading favorites', { exact: true })).toHaveCount(0);
    if (populated === 'none') {
      await expect(publicGroup).toHaveCount(0);
      await expect(publicPage.getByRole('heading', { name: 'Favorites', exact: true })).toHaveCount(
        0,
      );
    } else {
      await expect(
        publicGroup.getByRole('heading', { name: 'Favorites', exact: true }),
      ).toBeVisible();
      for (const kind of ['leader', 'card', 'aspects']) {
        await expect(publicGroup.getByLabel(new RegExp(`^Favorite ${kind}:`))).toHaveCount(
          kind === populated ? 1 : 0,
        );
      }
      await expect(publicGroup.getByRole('button')).toHaveCount(0);
      const tileBounds = await publicGroup
        .getByLabel(new RegExp(`^Favorite ${populated}:`))
        .boundingBox();
      const sectionBounds = await publicGroup.boundingBox();
      expect(Math.abs(tileBounds!.x - sectionBounds!.x)).toBeLessThan(1);
    }
  }
  await page.reload();
  await expect(group.getByRole('heading', { name: 'Favorites', exact: true })).toBeVisible();
  for (const kind of ['leader', 'card', 'aspects']) {
    await expect(
      group.getByRole('button', { name: `Edit favorite ${kind}: Not set`, exact: true }),
    ).toBeEnabled();
  }
  console.log('Empty/partial visitor sections and all three empty owner editing slots passed.');
  expect(
    (
      await visitor.request.patch(apiUrl, {
        data: { favoriteAspects: [] },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await context.request.patch(`${origin}/api/user/swubase/profile`, {
        data: { favoriteAspects: [] },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.patch(apiUrl, {
        data: { totalSupport: '999.00', activeSupporter: true },
        headers: { 'X-Requested-With': 'swubase' },
      })
    ).status(),
  ).toBe(400);
  expect(Object.keys(await getFavorites()).sort()).toEqual([
    'favoriteAspects',
    'favoriteCardId',
    'favoriteLeaderCardId',
    'userId',
  ]);
  await visitor.close();
  console.log(
    'Public display, anonymous/other-owner rejection and protected support fields passed.',
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await sql`DELETE FROM "user" WHERE id = ${id}`;
  await sql.end();
}
