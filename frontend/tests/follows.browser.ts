// FOLLOWS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/follows.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { creatorProfileSchema, creationDocumentSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.FOLLOWS_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable explicitly against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Use a development origin.');
const db = postgres(database.toString(), { max: 2 });
const suffix = crypto.randomUUID();
const viewer = `follow-browser-${suffix}`;
const author = `follow-author-${suffix}`;
const creatorId = crypto.randomUUID();
const slug = `follow-browser-${suffix}`;
const creatorName = `Follow Studio ${suffix.slice(0, 8)}`;
const authorName = `Follow Player ${suffix.slice(0, 8)}`;
const deckId = crypto.randomUUID();
const unfollowedDeckId = crypto.randomUUID();
const sessionToken = crypto.randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const anonymous = await browser.newContext({ viewport: { width: 390, height: 844 } });
for (const current of [context, anonymous])
  await current.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'light');
  });
const page = await context.newPage();
const visitor = await anonymous.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
for (const current of [page, visitor]) {
  current.setDefaultTimeout(20_000);
  current.on('pageerror', e => {
    errors.push(e.message);
    console.log('Browser error:', e.message);
  });
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
const shots = new URL('../../.swubase/follows-screenshots/', import.meta.url).pathname;
await mkdir(shots, { recursive: true });
try {
  for (const [id, name] of [
    [viewer, 'Follow viewer ' + suffix.slice(0, 8)],
    [author, authorName],
  ]) {
    await db`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
      VALUES (${id!}, 'Private name', ${name!}, ${id + '@invalid.local'}, false, 'USD', now(), now())`;
  }
  const profile = creatorProfileSchema.parse({
    slug,
    name: creatorName,
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  });
  await db`INSERT INTO creator_profile (id, slug, profile) VALUES (${creatorId}, ${slug}, ${db.json(profile)})`;
  for (const [title, creator, owner, published] of [
    ['Follow creator publication', creatorId, null, true],
    ['Follow personal publication', null, author, true],
    ['Private follow draft', creatorId, null, false],
  ] as const) {
    const doc = creationDocumentSchema.parse({
      title,
      medium: 'article',
      body: emptyPostDocument(),
      language: 'en',
      tags: [],
      references: [],
      chapters: [],
    });
    await db`INSERT INTO creation (creator_id, owner_user_id, author_id, draft, published, published_revision, published_at)
      VALUES (${creator}, ${owner}, ${author}, ${db.json(doc)}, ${published ? db.json(doc) : null}, ${published ? 1 : null}, ${published ? new Date() : null})`;
  }
  await db`INSERT INTO deck (id, user_id, format, name, public) VALUES (${deckId}, ${author}, 1, 'Follow public deck', 1)`;
  await db`INSERT INTO deck_information (deck_id) VALUES (${deckId})`;
  await db`INSERT INTO deck (id, user_id, format, name, public) VALUES (${unfollowedDeckId}, ${viewer}, 1, 'Unfollowed public deck', 1)`;
  await db`INSERT INTO deck_information (deck_id) VALUES (${unfollowedDeckId})`;
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

  await page.goto(`${origin}/creators`);
  await page.getByLabel('Find a creator').fill(creatorName);
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: creatorName, exact: true }) });
  await expect(
    card.getByRole('button', { name: `Follow ${creatorName}`, exact: true }),
  ).toBeEnabled();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      localStorage.setItem('vite-ui-theme', value);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const follow = card.getByRole('button', { name: `Follow ${creatorName}`, exact: true });
      const nameBox = (await card
        .getByRole('heading', { name: creatorName, exact: true })
        .boundingBox())!;
      const followBox = (await follow.boundingBox())!;
      const cardBox = (await card.boundingBox())!;
      const flagBox = (await card
        .getByRole('img', { name: 'English', exact: true })
        .boundingBox())!;
      expect(followBox.y + followBox.height).toBeLessThanOrEqual(nameBox.y + 1);
      expect(cardBox.x + cardBox.width - followBox.x - followBox.width).toBeLessThan(33);
      expect(flagBox.x).toBeGreaterThanOrEqual(nameBox.x + nameBox.width);
      await expect(follow.locator('svg.lucide-heart')).toHaveCount(1);
      await expect(card.getByText(/^[0-9]+ followers?$/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await card.screenshot({ path: `${shots}/creator-card-${theme}-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const followPath = `${origin}/api/follows/creators/${creatorId}`;
  let release: (() => void) | undefined;
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(
    followPath,
    async route => {
      await held;
      await route.continue();
    },
    { times: 1 },
  );
  await card.getByRole('button', { name: `Follow ${creatorName}`, exact: true }).click();
  await expect(
    card.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }),
  ).toBeDisabled();
  await expect(card.getByText(/^[0-9]+ followers?$/)).toHaveCount(0);
  release!();
  await expect(
    card.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }),
  ).toBeEnabled();
  await page.route(
    followPath,
    route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Follow retry fixture' }),
      }),
    { times: 1 },
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await card.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('Follow retry fixture');
  await expect(
    card.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }),
  ).toBeEnabled();
  await expect(card.getByText(/^[0-9]+ followers?$/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.screenshot({ path: `${shots}/creator-card-mobile-error.png` });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await card.getByRole('link', { name: creatorName, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }),
  ).toBeEnabled();

  const creatorHeader = page.locator('[data-creator-layout] > header');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const follow = creatorHeader.getByRole('button', {
      name: `Unfollow ${creatorName}`,
      exact: true,
    });
    const headerBox = (await creatorHeader.boundingBox())!;
    const followBox = (await follow.boundingBox())!;
    const nameBox = (await creatorHeader
      .getByRole('heading', { name: creatorName, exact: true })
      .boundingBox())!;
    expect(followBox.y + followBox.height).toBeLessThanOrEqual(nameBox.y + 1);
    expect(headerBox.x + headerBox.width - followBox.x - followBox.width).toBeLessThan(35);
    await expect(follow.locator('svg.lucide-heart')).toHaveClass(/fill-current/);
    await expect(creatorHeader.getByText(/^[0-9]+ followers?$/)).toHaveCount(0);
    await creatorHeader.screenshot({ path: `${shots}/creator-profile-dark-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('Creator directory, optimistic updates, rollback and profile passed.');
  await page.goto(`${origin}/users/${author}`);
  await page.getByRole('button', { name: `Follow ${authorName}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Unfollow ${authorName}`, exact: true }),
  ).toBeEnabled();
  // Completing a request after navigating to another profile must not move its state.
  let releaseUser: (() => void) | undefined;
  const heldUser = new Promise<void>(resolve => {
    releaseUser = resolve;
  });
  await page.route(
    `${origin}/api/follows/users/${author}`,
    async route => {
      await heldUser;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: `Unfollow ${authorName}`, exact: true }).click();
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Follow viewer ' + suffix.slice(0, 8), exact: true }),
  ).toBeVisible();
  const completedUser = page.waitForResponse(
    response =>
      response.url() === `${origin}/api/follows/users/${author}` &&
      response.request().method() === 'DELETE',
  );
  releaseUser!();
  await completedUser;
  await expect(
    page.getByRole('group', { name: 'Profile actions' }).getByText('0 followers', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Follow Follow viewer ' + suffix.slice(0, 8), exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await page.getByRole('button', { name: `Follow ${authorName}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Unfollow ${authorName}`, exact: true }),
  ).toBeEnabled();
  await page.goto(`${origin}/following?kind=users`);
  await expect(page.getByRole('link', { name: authorName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Creators', exact: true }).click();
  await expect(page.getByRole('link', { name: creatorName, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: creatorName, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('link', { name: authorName, exact: true })).toBeVisible();
  await page.goForward();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      localStorage.setItem('vite-ui-theme', value);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(
        page.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `${shots}/following-${theme}-${width}.png`, fullPage: true });
    }
  }
  console.log('Following list, routing and responsive screenshots passed.');
  await db`UPDATE creation SET published_at = now() - interval '1 hour' WHERE creator_id = ${creatorId} OR owner_user_id = ${author}`;
  for (let index = 0; index < 7; index++) {
    const doc = creationDocumentSchema.parse({
      title: `Latest followed publication ${index}`,
      medium: index % 2 ? 'article' : 'video',
      sourceUrl: index % 2 ? undefined : `https://example.com/follow-video-${index}`,
      durationSeconds: index % 2 ? undefined : 432,
      body: emptyPostDocument(),
      language: 'en',
      pinned: index === 0,
      tags: [],
      references: [],
      chapters: [],
    });
    await db`INSERT INTO creation (creator_id, owner_user_id, author_id, draft, published, published_revision, published_at)
      VALUES (${index % 2 ? null : creatorId}, ${index % 2 ? author : null}, ${author}, ${db.json(doc)}, ${db.json(doc)}, 1, ${new Date(Date.now() - (7 - index) * 60_000)})`;
  }
  const unrelatedDoc = creationDocumentSchema.parse({
    title: 'Unfollowed publication',
    medium: 'article',
    body: emptyPostDocument(),
    language: 'en',
    tags: [],
    references: [],
    chapters: [],
  });
  await db`INSERT INTO creation (owner_user_id, author_id, draft, published, published_revision, published_at)
    VALUES (${viewer}, ${viewer}, ${db.json(unrelatedDoc)}, ${db.json(unrelatedDoc)}, 1, now())`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('link', { name: 'Content from follows', exact: true }).click();
  const contentResults = page.getByRole('region', { name: 'Discover content', exact: true });
  const latest = page.getByRole('region', { name: 'Latest from your follows', exact: true });
  const latestTitles = [6, 5, 4, 3, 2].map(index => `Latest followed publication ${index}`);
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(latestTitles);
  await expect(latest.getByText(creatorName, { exact: true }).first()).toBeVisible();
  await expect(latest.getByText(authorName, { exact: true }).first()).toBeVisible();
  const sourceBox = (await page.getByRole('group', { name: 'Content source' }).boundingBox())!;
  const searchBox = (await contentResults
    .getByRole('textbox', { name: 'Search content' })
    .boundingBox())!;
  expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(searchBox.x);
  expect(
    Math.abs(sourceBox.y + sourceBox.height / 2 - searchBox.y - searchBox.height / 2),
  ).toBeLessThan(2);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      document.documentElement.classList.toggle('light', value === 'light');
      document.documentElement.classList.toggle('dark', value === 'dark');
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const cards = await latest.locator('article').all();
      const first = (await cards[0].boundingBox())!;
      for (const card of cards) expect((await card.boundingBox())!.y).toBe(first.y);
      const fullCard = (await contentResults.locator('article').first().boundingBox())!;
      expect(first.height * 2).toBeLessThan(fullCard.height);
      expect(
        await latest
          .getByRole('group', { name: 'Latest followed publications' })
          .evaluate(el => el.scrollWidth > el.clientWidth),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await latest.screenshot({ path: `${shots}/latest-${theme}-${width}.png` });
      await page
        .getByRole('search', { name: 'Find content' })
        .screenshot({ path: `${shots}/content-toolbar-${theme}-${width}.png` });
    }
  }
  const lastLatest = latest.getByRole('link', {
    name: `${latestTitles[4]} by ${creatorName}`,
    exact: true,
  });
  await lastLatest.focus();
  await expect(lastLatest).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: latestTitles[4], exact: true })).toBeVisible();
  await page.goBack();
  await contentResults
    .getByRole('textbox', { name: 'Search content' })
    .fill('no matching follow fixture');
  await contentResults.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    contentResults.getByRole('heading', { name: 'Room for a new perspective' }),
  ).toBeVisible();
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(latestTitles);
  await page.goBack();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page
      .getByRole('group', { name: 'Content source' })
      .getByRole('button', { name: 'Following', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    contentResults.getByRole('heading', { name: 'Follow creator publication', exact: true }),
  ).toBeVisible();
  await expect(
    contentResults.getByRole('heading', { name: 'Follow personal publication', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Private follow draft', { exact: true })).toHaveCount(0);
  await page.goto(`${origin}/decks/public?deckFollowing=true&deckFormat=1`);
  const deckNavigation = page.getByRole('navigation', { name: 'Deck library navigation' });
  const followingTab = deckNavigation.getByRole('link', { name: 'Following', exact: true });
  const publicTab = deckNavigation.getByRole('link', { name: 'Public decks', exact: true });
  await expect(deckNavigation.getByRole('link')).toHaveText([
    'Public decks',
    'Following',
    'Your decks',
    'Favorites',
  ]);
  await expect(page.getByText('Follow public deck', { exact: true })).toBeVisible();
  await expect(page.getByText('Unfollowed public deck', { exact: true })).toHaveCount(0);
  await expect(followingTab).toHaveAttribute('aria-current', 'page');
  await expect(publicTab).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('group', { name: 'Deck source' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Manage follows', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(followingTab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Follow public deck', { exact: true })).toBeVisible();
  await publicTab.click();
  await expect(page).not.toHaveURL(/deckFollowing/);
  await expect(page).toHaveURL(/deckFormat=1/);
  await expect(publicTab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Unfollowed public deck', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(followingTab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Unfollowed public deck', { exact: true })).toHaveCount(0);
  await page.goForward();
  await expect(publicTab).toHaveAttribute('aria-current', 'page');
  await followingTab.focus();
  await page.keyboard.press('Enter');
  await expect(followingTab).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/deckFormat=1/);
  for (const tab of ['Your decks', 'Favorites']) {
    await deckNavigation.getByRole('link', { name: tab, exact: true }).click();
    await expect(deckNavigation.getByRole('link', { name: tab, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await followingTab.click();
    await expect(followingTab).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Follow public deck', { exact: true })).toBeVisible();
    await expect(page.getByText('Unfollowed public deck', { exact: true })).toHaveCount(0);
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      document.documentElement.classList.toggle('light', value === 'light');
      document.documentElement.classList.toggle('dark', value === 'dark');
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(followingTab).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator('.browse-page').screenshot({
        path: `${shots}/deck-following-${theme}-${width}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  console.log('Content and deck discovery passed.');
  await visitor.goto(`${origin}/creators/${slug}`);
  await expect(visitor.getByRole('heading', { name: creatorName, exact: true })).toBeVisible();
  await expect(visitor.getByText(/^[0-9]+ followers?$/)).toHaveCount(0);
  await expect(
    visitor.getByRole('button', { name: /^(Sign in to follow|Follow |Unfollow )/ }),
  ).toHaveCount(0);
  await visitor.goto(`${origin}/creators`);
  await visitor.getByLabel('Find a creator').fill(creatorName);
  await expect(visitor.getByRole('heading', { name: creatorName, exact: true })).toBeVisible();
  await expect(
    visitor.getByRole('button', { name: /^(Sign in to follow|Follow |Unfollow )/ }),
  ).toHaveCount(0);
  await visitor.goto(`${origin}/users/${author}`);
  await expect(
    visitor
      .getByRole('group', { name: 'Profile actions' })
      .getByText('1 follower', { exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('button', { name: /^(Sign in to follow|Follow |Unfollow )/ }),
  ).toHaveCount(0);
  await visitor.goto(`${origin}/content?following=true`);
  await expect(visitor.getByRole('region', { name: 'Latest from your follows' })).toHaveCount(0);
  await expect(
    visitor.getByText('Sign in to see publications from users and creators you follow.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('heading', { name: 'Follow creator publication', exact: true }),
  ).toHaveCount(0);
  await visitor.goto(`${origin}/decks/public?deckFollowing=true`);
  await expect(
    visitor.getByText('Sign in to see public decks from users you follow.', { exact: true }),
  ).toBeVisible();
  await expect(
    visitor.locator('.browse-panel').getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await expect(visitor.getByText('Follow public deck', { exact: true })).toHaveCount(0);
  const privateList = await anonymous.request.get(`${origin}/api/follows?kind=creators`);
  expect(privateList.status()).toBe(401);
  console.log('Anonymous privacy checks passed.');
  await page.goto(`${origin}/content`);
  await page.getByRole('link', { name: 'Manage follows', exact: true }).click();
  await page.getByRole('button', { name: `Unfollow ${creatorName}`, exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('You are not following any creators yet.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Content from follows', exact: true }).click();
  await expect(
    contentResults.getByRole('heading', { name: 'Follow personal publication', exact: true }),
  ).toBeVisible();
  await expect(
    contentResults.getByRole('heading', { name: 'Follow creator publication', exact: true }),
  ).toHaveCount(0);
  await expect(latest.getByText(creatorName, { exact: true })).toHaveCount(0);
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(
    [5, 3, 1]
      .map(index => `Latest followed publication ${index}`)
      .concat('Follow personal publication'),
  );
  await page.getByRole('link', { name: 'Manage follows', exact: true }).click();
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await page.getByRole('button', { name: `Unfollow ${authorName}`, exact: true }).click();
  await expect(
    page.getByText('You are not following any users yet.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Content from follows', exact: true }).click();
  await expect(
    latest.getByText('New publications from the people you follow will appear here.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Follow browser checks passed: optimistic updates and rollback, profile/directory parity, private lists, discovery, URL navigation, keyboard, light/dark and mobile.',
  );
} catch (error) {
  await page.screenshot({ path: `${shots}/failure.png`, fullPage: true }).catch(() => {});
  console.log('Failure URL:', page.url());
  console.log('Browser errors:', errors);
  console.log((await page.locator('body').innerText()).slice(-1800));
  throw error;
} finally {
  await browser.close();
  await db`DELETE FROM deck_information WHERE deck_id IN (${deckId}, ${unfollowedDeckId})`;
  await db`DELETE FROM deck WHERE id IN (${deckId}, ${unfollowedDeckId})`;
  await db`DELETE FROM creator_profile WHERE id = ${creatorId}`;
  await db`DELETE FROM "user" WHERE id IN (${viewer}, ${author})`;
  await db.end();
}
