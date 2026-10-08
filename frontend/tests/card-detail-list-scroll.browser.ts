// CARD_DETAIL_LIST_SCROLL_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-detail-list-scroll.browser.ts
import { chromium, expect as baseExpect, type Locator } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const expect = baseExpect.configure({ timeout: 10_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_DETAIL_LIST_SCROLL_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against an isolated development worktree.');

const sql = postgres(database.toString(), { max: 2 });
const userId = `card-list-scroll-${randomUUID()}`;
const lists = Array.from({ length: 45 }, (_, index) => ({
  id: randomUUID(),
  user_id: userId,
  title: `Scroll list ${index.toString().padStart(2, '0')}`,
  collection_type: Math.floor(index / 15) + 1,
}));
const browser = await chromium.launch();
const context = await browser.newContext({ hasTouch: true });
await context.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));

async function wheelScroll(list: Locator) {
  await expect
    .poll(() => list.evaluate(element => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(100);
  await list.hover();
  const before = await list.evaluate(element => element.scrollTop);
  const maximum = await list.evaluate(element => element.scrollHeight - element.clientHeight);
  const delta = before < maximum / 2 ? 240 : -240;
  await page.mouse.wheel(0, delta);
  if (delta > 0) {
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(before);
  } else {
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeLessThan(before);
  }
  const after = await list.evaluate(element => element.scrollTop);
  await page.mouse.wheel(0, -delta);
  if (delta > 0) {
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeLessThan(after);
  } else {
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(after);
  }
}

async function touchScroll(list: Locator) {
  const session = await context.newCDPSession(page);
  try {
    const box = (await list.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.75;
    const before = await list.evaluate(element => element.scrollTop);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (const distance of [30, 60, 90, 120]) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - distance }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(before);
  } finally {
    await session.detach();
  }
}

try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${userId}, 'List scroll fixture', 'List scroll tester', ${userId + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO collection ${sql(lists, 'id', 'user_id', 'title', 'collection_type')}`;
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
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

  for (const width of [1440, 430]) {
    for (const mode of ['page', 'dialog']) {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(
        mode === 'page'
          ? `${origin}/cards/detail/storm-raider?cardTab=variants`
          : `${origin}/cards/search?modalCardId=storm-raider&modalCardTab=variants`,
      );
      const section = page.getByRole('region', { name: 'Add to list', exact: true });
      const trigger = section.getByLabel('Destination list');
      await trigger.click();
      const list = page.getByRole('listbox');
      await expect(list.getByRole('option')).toHaveCount(45);
      await wheelScroll(list);
      if (width === 430) await touchScroll(list);

      const search = page.getByRole('combobox', { name: 'Search lists', exact: true });
      await search.fill('Scroll list 2');
      await expect(list.getByRole('option')).toHaveCount(10);
      await wheelScroll(list);
      await page.keyboard.press('Escape');
      await expect(list).toHaveCount(0);
      await expect(trigger).toBeFocused();
      if (mode === 'dialog') {
        await expect(
          page.getByRole('dialog').getByRole('tab', { name: /^Variants/ }),
        ).toBeVisible();
      }

      await trigger.click();
      await expect(search).toHaveValue('');
      await search.fill('Scroll list 44');
      await page.keyboard.press('Enter');
      await expect(trigger).toContainText('Scroll list 44');
      await expect(list).toHaveCount(0);
      console.log(
        `PASS: ${mode} at ${width}px, wheel scrolling, search and keyboard selection${width === 430 ? ', touch scrolling' : ''}.`,
      );
    }
  }
  expect(errors).toEqual([]);
} finally {
  await context.close();
  await browser.close();
  await sql`DELETE FROM collection WHERE user_id=${userId}`;
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
