// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-claims.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import { seal } from '../../server/lib/creators/youtube-credentials.ts';
import { stateHash } from '../../server/lib/creators/youtube-ownership.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CREATOR_HUB_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Run explicitly against an isolated development worktree.');
const sql = postgres(database.toString(), { max: 2 });
const random = () => crypto.randomUUID().replaceAll('-', '');
const userId = `claim-browser-${random()}`,
  sessionId = crypto.randomUUID(),
  token = crypto.randomUUID(),
  creatorId = crypto.randomUUID(),
  claimedDeckId = crypto.randomUUID();
const channelIds = [0, 1].map(() => `UC${random().slice(0, 22)}`);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitor = await browser.newContext();
for (const current of [context, visitor])
  await current.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', 'light');
  });
const page = await context.newPage(),
  anonymous = await visitor.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
const screenshots = new URL('../../.swubase/creator-claim-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
for (const current of [page, anonymous]) {
  current.setDefaultTimeout(20_000);
  current.on('pageerror', error => errors.push(error.message));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
const pending = async (expired = false) => {
  const claimId = randomBytes(32).toString('base64url');
  const connection = seal(
    JSON.stringify({
      channel: { id: channelIds[1], title: 'New browser channel', avatarUrl: '' },
      accessToken: 'browser-fixture',
      refreshToken: null,
      verifiedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    }),
  );
  await sql`INSERT INTO creator_oauth_state (hash, user_id, session_id, verifier, purpose, pending_connection, expires_at)
    VALUES (${stateHash(claimId)}, ${userId}, ${sessionId}, '', 'confirm', ${connection}, ${new Date(Date.now() + (expired ? -1000 : 600_000))})`;
  return `${origin}/creator-studio?youtube=confirm&youtubeClaimId=${claimId}`;
};
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, display_name, currency, role, created_at, updated_at)
    VALUES (${userId}, 'Claim browser', ${userId + '@invalid.local'}, false, ${userId}, 'USD', 'user', now(), now())`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${sessionId}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const cookie = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookie, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0];
  await context.addCookies([
    {
      name: cookie,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  const profile = creatorProfileSchema.parse({
    slug: `claim-browser-${creatorId}`,
    name: 'Unclaimed browser creator',
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [{ label: 'YouTube', url: `https://www.youtube.com/channel/${channelIds[0]}` }],
  });
  await sql`INSERT INTO creator_profile (id, slug, profile) VALUES (${creatorId}, ${profile.slug}, ${sql.json(profile)})`;
  await anonymous.goto(`${origin}/creators/${profile.slug}`);
  await expect(anonymous.getByRole('heading', { name: profile.name })).toBeVisible();
  await expect(anonymous.getByRole('button', { name: 'Claim this profile' })).toHaveCount(0);
  await expect(anonymous.getByText('Claimed', { exact: true })).toHaveCount(0);
  await anonymous.getByRole('link', { name: 'Is this your channel?' }).click();
  await expect(anonymous).toHaveURL(`${origin}/creators/${profile.slug}/claim`);
  await anonymous.reload();
  await anonymous.getByRole('button', { name: 'Sign in to get started' }).click();
  await expect(anonymous.getByRole('dialog', { name: 'Sign In', exact: true })).toBeVisible();
  await anonymous.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(anonymous.getByRole('button', { name: 'Connect YouTube to claim' })).toHaveCount(0);
  await page.goto(`${origin}/creators/${profile.slug}`);
  const nav = page.getByRole('navigation', { name: 'Creator content', exact: true });
  const claimLink = nav.getByRole('link', { name: 'Is this your channel?' });
  await expect(claimLink).toBeVisible();
  await expect(page.getByRole('button', { name: 'Claim this profile' })).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(claimLink).toBeInViewport();
    const linkBox = (await claimLink.boundingBox())!;
    const tabBox = (await nav
      .getByRole('link', { name: 'All content', exact: true })
      .boundingBox())!;
    expect(Math.abs(linkBox.y + linkBox.height / 2 - tabBox.y - tabBox.height / 2)).toBeLessThan(2);
  }
  await claimLink.click();
  await expect(page).toHaveURL(`${origin}/creators/${profile.slug}/claim`);
  await page.goBack();
  await expect(claimLink).toBeVisible();
  await page.goForward();
  await page.reload();
  const claimButton = page.getByRole('button', { name: 'Connect YouTube to claim' });
  await expect(claimButton).toBeEnabled();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      document.documentElement.classList.toggle('dark', value === 'dark');
      document.documentElement.classList.toggle('light', value === 'light');
    }, theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page
        .locator('[data-creator-layout]')
        .screenshot({ path: `${screenshots}/${theme}-claim-${width}.png` });
    }
  }
  await page.route(
    '**/api/creator-hub/youtube/claim',
    route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Claim connection unavailable' }),
      }),
    { times: 1 },
  );
  await claimButton.click();
  await expect(page.getByRole('alert')).toContainText('Claim connection unavailable');
  await expect(claimButton).toBeEnabled();
  await page.route('https://accounts.google.com/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<p>Mock Google account selector</p>' }),
  );
  const claimRequest = page.waitForRequest(
    request =>
      request.url().endsWith('/api/creator-hub/youtube/claim') && request.method() === 'POST',
  );
  await claimButton.click();
  expect((await claimRequest).postDataJSON()).toEqual({ creatorId });
  await page.waitForURL('https://accounts.google.com/**');
  const authorize = new URL(page.url());
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorize.searchParams.get('redirect_uri')).toBe(
    `${origin}/api/creator-hub/youtube/callback`,
  );
  await page.goto(`${origin}/creator-studio`);
  await expect(
    page.getByRole('button', { name: 'Connect or claim a channel', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My articles', exact: true })).toBeVisible();
  await expect(page.getByLabel('Publish as')).toHaveValue('');
  await page.getByRole('button', { name: 'Write an article', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect or claim a channel', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('Creator or brand name')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create creator profile', exact: true }).click();
  await expect(page.getByLabel('Creator or brand name')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Connect or claim a channel', exact: true }),
  ).toBeVisible();
  await page.goto(await pending());
  await expect(page.getByRole('heading', { name: 'Create your creator profile?' })).toBeVisible();
  await expect(page.getByLabel('Creator name', { exact: true })).toHaveValue('New browser channel');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Connect or claim a channel', exact: true }),
  ).toBeVisible();
  expect(await sql`SELECT id FROM creator_profile WHERE owner_id = ${userId}`).toHaveLength(0);
  await page.goto(await pending(true));
  await expect(page.getByText('This YouTube connection expired. Connect again.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to studio' }).click();
  await expect(
    page.getByRole('button', { name: 'Connect or claim a channel', exact: true }),
  ).toBeVisible();
  await page.goto(await pending());
  await expect(page.getByRole('heading', { name: 'Create your creator profile?' })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      theme => document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    );
    await page.setViewportSize({ width: theme === 'light' ? 1440 : 390, height: 1000 });
    await expect(
      page.getByRole('button', { name: 'Create creator profile', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `${screenshots}/${theme}-confirmation.png` });
  }
  await page.getByLabel('Creator name', { exact: true }).fill('My browser channel');
  await page.getByLabel('Profile address', { exact: true }).fill(`owned-${random()}`);
  await page.getByRole('button', { name: 'Create creator profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your creations' })).toBeVisible();
  const [owned] = await sql`SELECT id, slug FROM creator_profile WHERE owner_id = ${userId}`;
  expect(owned).toBeTruthy();
  await sql`INSERT INTO deck (id, user_id, name, format, public)
    VALUES (${claimedDeckId}, ${userId}, 'Claimed unlisted deck', 1, 2)`;
  const draftResponse = await page.request.post(`${origin}/api/creator-hub/creations`, {
    headers: { 'X-Requested-With': 'swubase' },
    data: {
      creatorId: owned.id,
      document: creationDocumentSchema.parse({
        title: 'Claimed deck article',
        medium: 'article',
        tags: [],
        chapters: [],
        body: emptyPostDocument(),
        references: [{ type: 'deck', id: claimedDeckId, startSeconds: null }],
      }),
    },
  });
  expect(draftResponse.ok()).toBe(true);
  const draft = (await draftResponse.json()).data;
  await page.goto(`${origin}/creator-studio?creatorId=${owned.id}&creationId=${draft.id}`);
  const connections = page.getByRole('region', { name: 'Connect to SWUBASE', exact: true });
  await expect(connections.getByRole('link', { name: 'Claimed unlisted deck' })).toBeVisible();
  await connections.getByRole('button', { name: 'Deck', exact: true }).click();
  await expect(connections.getByRole('group', { name: 'deck choices' })).toContainText(
    'Claimed unlisted deck',
  );
  await page.goto(`${origin}/creators/${owned.slug}`);
  await expect(page.getByText('Claimed', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Is this your channel?' })).toHaveCount(0);
  await page.goto(`${origin}/creators/${owned.slug}/claim`);
  await expect(page.getByRole('heading', { name: 'This profile is yours' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open creator studio' })).toHaveAttribute(
    'href',
    `/creator-studio?creatorId=${owned.id}`,
  );
  await expect(page.getByRole('button', { name: 'Connect YouTube to claim' })).toHaveCount(0);
  await anonymous.goto(`${origin}/creators/${owned.slug}/claim`);
  await expect(
    anonymous.getByRole('heading', { name: 'This profile is already claimed' }),
  ).toBeVisible();
  await expect(anonymous.getByRole('button', { name: 'Connect YouTube to claim' })).toHaveCount(0);
  await page.goto(`${origin}/creators`);
  await page.getByRole('textbox', { name: 'Find a creator' }).fill('My browser channel');
  await expect(page.getByText('Claimed', { exact: true })).toBeVisible();
  await page.goto(`${origin}/creator-studio?youtube=failed&youtubeError=already_claimed`);
  await expect(
    page.getByRole('alert').filter({ hasText: 'already been claimed by another user' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Creator claim browser checks passed: claim-page navigation, sign-in, direct load/history, responsive themes, retry, OAuth initiation, create/cancel, expired state, onboarding, claimed badges and ownership errors.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  await Bun.write(
    `${screenshots}/failure.txt`,
    `${page.url()}\n${await page.locator('body').innerText()}`,
  );
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM creator_profile WHERE id = ${creatorId} OR owner_id = ${userId}`;
  await sql`DELETE FROM creator_youtube_channel WHERE channel_id IN ${sql(channelIds)}`;
  await sql`DELETE FROM deck WHERE id = ${claimedDeckId}`;
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
