// CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creation-reports.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { creationDocumentSchema, creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

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
const id = crypto.randomUUID();
const creatorId = crypto.randomUUID();
const userIds = ['reporter', 'admin'].map(name => `video-report-browser-${name}-${id}`);
const title = `Video report browser ${id.slice(0, 8)}`;
const browser = await chromium.launch();
const reporter = await browser.newContext({ viewport: { width: 390, height: 844 } });
const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const visitor = await browser.newContext();
const page = await reporter.newPage(),
  staff = await admin.newPage(),
  anonymous = await visitor.newPage();
const expect = baseExpect.configure({ timeout: 20_000 });
const errors: string[] = [];
const screenshots = new URL('../../.swubase/creation-report-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
for (const current of [page, staff, anonymous]) {
  current.setDefaultTimeout(20_000);
  current.on('pageerror', error => errors.push(error.message));
  await current.route('https://www.youtube.com/**', route => route.fulfill({ body: '' }));
  await current.addLocatorHandler(
    current.getByRole('button', { name: 'Dismiss', exact: true }),
    () => current.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
try {
  const profile = creatorProfileSchema.parse({
    slug: `report-browser-${creatorId}`,
    name: 'Video report browser creator',
    bio: emptyPostDocument(),
    languages: ['en'],
    specialties: [],
    links: [],
  });
  const document = creationDocumentSchema.parse({
    title,
    medium: 'video',
    body: emptyPostDocument(),
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    tags: [],
    references: [],
    chapters: [],
  });
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i],
      token = crypto.randomUUID();
    await sql`INSERT INTO "user" (id, name, email, email_verified, display_name, currency, role, created_at, updated_at)
      VALUES (${userId}, 'Video report browser', ${userId + '@invalid.local'}, false, ${userId}, 'USD', ${i === 1 ? 'user,admin' : 'user'}, now(), now())`;
    await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
    const cookie = getCookies({
      baseURL: origin,
      advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
    }).sessionToken.name;
    const signed = (
      await serializeSignedCookie(cookie, token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0];
    await [reporter, admin][i].addCookies([
      {
        name: cookie,
        value: signed.slice(signed.indexOf('=') + 1),
        url: origin,
        httpOnly: true,
        secure: origin.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
  }
  await sql`INSERT INTO creator_profile (id, slug, owner_id, profile) VALUES (${creatorId}, ${profile.slug}, ${userIds[0]}, ${sql.json(profile)})`;
  await sql`INSERT INTO creation (id, creator_id, draft, published, published_revision, published_at, public_updated_at)
    VALUES (${id}, ${creatorId}, ${sql.json(document)}, ${sql.json(document)}, 1, now(), now())`;
  await anonymous.goto(`${origin}/content/${id}`);
  await expect(
    anonymous.getByRole('button', { name: 'Sign in to report as non-SWU', exact: true }),
  ).toBeVisible();
  await page.goto(`${origin}/content/${id}`);
  await page.getByRole('button', { name: 'Report as non-SWU', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Report as non-SWU', exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel('Additional details (optional)')
    .fill('This video covers a different game.');
  await page.screenshot({ path: `${screenshots}/report-mobile.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Report as non-SWU', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Report as non-SWU', exact: true }).click();
  await dialog.getByRole('button', { name: 'Submit report', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reported as non-SWU', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Reported as non-SWU', exact: true }),
  ).toBeDisabled();
  expect((await sql`SELECT id FROM creation_report WHERE creation_id = ${id}`).length).toBe(1);
  expect((await reporter.request.get(`${origin}/api/creator-hub/reports`)).status()).toBe(403);
  await staff.goto(`${origin}/admin?page=creation-reports`);
  const report = staff
    .getByRole('article')
    .filter({ has: staff.getByRole('heading', { name: title, exact: true }) });
  await expect(
    report.getByText('This video covers a different game.', { exact: true }),
  ).toBeVisible();
  await staff.screenshot({ path: `${screenshots}/admin-desktop.png` });
  if (await staff.locator('html').evaluate(element => element.classList.contains('dark'))) {
    await staff.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  }
  await expect(staff.locator('html')).toHaveClass(/light/);
  await staff.screenshot({ path: `${screenshots}/admin-desktop-light.png` });
  await report.getByRole('button', { name: 'Unpublish video', exact: true }).click();
  await staff
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm non-SWU', exact: true })
    .click();
  await expect(report).toHaveCount(0);
  await staff.getByRole('button', { name: 'Resolved reports', exact: true }).click();
  await staff.waitForURL(url => url.searchParams.get('creationReportStatus') === 'resolved');
  expect(new URL(staff.url()).pathname).toBe('/admin');
  await expect(report.getByText('unpublished', { exact: true })).toBeVisible();
  expect((await anonymous.request.get(`${origin}/api/creator-hub/creations/${id}`)).status()).toBe(
    404,
  );
  const [stored] = await sql`SELECT draft, published FROM creation WHERE id = ${id}`;
  expect(stored.draft.title).toBe(title);
  expect(stored.published).toBeNull();
  await staff.setViewportSize({ width: 390, height: 844 });
  await staff.screenshot({ path: `${screenshots}/admin-mobile.png` });
  expect(
    await staff.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'Creation report browser checks passed: sign-in, submission, deduplication, admin review, unpublishing and responsive layouts.',
  );
} finally {
  await browser.close();
  await sql`DELETE FROM creator_profile WHERE id = ${creatorId}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql(userIds)}`;
  await sql.end();
}
