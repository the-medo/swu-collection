// CREATOR_RANKING_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-ranking.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const target = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_RANKING_BROWSER_TEST !== '1' ||
  target.hostname !== '127.0.0.1' ||
  !target.pathname.startsWith('/swubase_')
)
  throw new Error('Use an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Use a development origin.');
const db = postgres(target.toString(), { max: 2 });
const suffix = crypto.randomUUID();
const viewer = `ranking-browser-${suffix}`;
const search = `Ranking ${suffix.slice(0, 8)}`;
const creators = Array.from({ length: 2 }, (_, i) => ({
  id: crypto.randomUUID(),
  slug: `${viewer}-${i}`,
  name: `${search} ${i}`,
}));
const sessionToken = crypto.randomUUID();
const channelId = `UC${suffix.replaceAll('-', '').slice(0, 22)}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
try {
  await db`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${viewer}, 'Ranking fixture', 'Ranking fixture', ${viewer + '@invalid.local'}, false, 'USD', now(), now())`;
  for (const creator of creators) {
    const profile = creatorProfileSchema.parse({
      slug: creator.slug,
      name: creator.name,
      bio: emptyPostDocument(),
      languages: ['en'],
      specialties: [],
      links: [],
    });
    await db`INSERT INTO creator_profile (id, slug, profile) VALUES (${creator.id}, ${creator.slug}, ${db.json(profile)})`;
  }
  await db`INSERT INTO creator_youtube_channel (channel_id, subscriber_count, subscribers_updated_at)
    VALUES (${channelId}, 100000, now())`;
  await db`INSERT INTO creator_channel (creator_id, channel_id, origin)
    VALUES (${creators[1].id}, ${channelId}, 'public')`;
  await db`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${sessionToken}, now() + interval '1 hour', ${viewer}, now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, sessionToken, process.env.BETTER_AUTH_SECRET!)
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
  await page.goto(`${origin}/creators?q=${encodeURIComponent(search)}`);
  const names = page.locator('[data-creator-results] article').getByRole('heading');
  const card = (index: number) =>
    page.locator('article').filter({
      has: page.getByRole('heading', { name: creators[index].name, exact: true }),
    });
  const returnToDirectory = async () => {
    await card(0).getByRole('link', { name: creators[0].name, exact: true }).click();
    await expect(page.locator('[data-creator-layout]')).toBeVisible();
    await page.goBack();
  };
  await expect(names).toHaveText([creators[1].name, creators[0].name]);
  await card(0)
    .getByRole('button', { name: `Follow ${creators[0].name}`, exact: true })
    .click();
  await expect(
    card(0).getByRole('button', { name: `Unfollow ${creators[0].name}`, exact: true }),
  ).toBeEnabled();
  await expect(names).toHaveText([creators[1].name, creators[0].name]);
  await returnToDirectory();
  await expect(names).toHaveText([creators[0].name, creators[1].name]);
  await page.setViewportSize({ width: 390, height: 844 });
  await card(0)
    .getByRole('button', { name: `Unfollow ${creators[0].name}`, exact: true })
    .click();
  await expect(
    card(0).getByRole('button', { name: `Follow ${creators[0].name}`, exact: true }),
  ).toBeEnabled();
  await expect(names).toHaveText([creators[0].name, creators[1].name]);
  await returnToDirectory();
  await expect(names).toHaveText([creators[1].name, creators[0].name]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'Creator ranking passed: subscriber ties, follower priority, follow/unfollow cache refresh on navigation, desktop and mobile.',
  );
} finally {
  await browser.close();
  await db`DELETE FROM creator_profile WHERE id IN (${creators[0].id}, ${creators[1].id})`;
  await db`DELETE FROM creator_youtube_channel WHERE channel_id = ${channelId}`;
  await db`DELETE FROM "user" WHERE id = ${viewer}`;
  await db.end();
}
