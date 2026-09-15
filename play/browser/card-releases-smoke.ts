import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { CardCatalog, catalogFor } from '../cards/catalog.ts';
import {
  initializeCardBundles,
  activeCardVersions,
  installCardBundle,
  ACTIVE_CARD_BUNDLE,
} from '../storage/card-bundles.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Select the running worktree database');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 3, onnotice: () => {} }),
  browser = await chromium.launch();
const userId = `card-release-browser-${randomUUID()}`,
  token = randomUUID(),
  sessionId = randomUUID();
let original: CardCatalog | undefined, candidate: CardCatalog | undefined;
try {
  await initializeCardBundles(sql);
  original = catalogFor({ versions: await activeCardVersions(sql) });
  const data = structuredClone(original.data);
  data.version = `1.0.${Date.now()}`;
  const marine = data.cards.find(c => c.cardId === 'battlefield-marine')!;
  if (marine.kind === 'unit') marine.power = 9;
  candidate = new CardCatalog(data);
  await installCardBundle(sql, candidate, 'a'.repeat(40));
  await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${userId},'Release admin',${userId + '@invalid.local'},false,now(),now(),'Release admin','USD','admin')`;
  await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${sessionId},${token},now()+interval '1 hour',${userId},now(),now())`;
  const context = await browser.newContext({ viewport: { width: 1450, height: 1000 } });
  const anonymous = await browser.newContext();
  await expect
    .poll(async () => (await anonymous.request.get(`${origin}/api/admin/crossfire-cards`)).status())
    .toBe(401);
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const cookie = (await serializeSignedCookie(name, token, process.env.BETTER_AUTH_SECRET!)).split(
    ';',
  )[0]!;
  await context.addCookies([
    {
      name,
      value: cookie.slice(cookie.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage(),
    errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/admin?page=crossfire-cards`);
  await expect(page.getByRole('heading', { name: 'Crossfire card releases' })).toBeVisible();
  const row = page.getByText(candidate.data.version, { exact: true }).locator('../../..');
  await row.getByRole('button', { name: 'Review changes' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Battlefield Marine', { exact: true })).toBeVisible();
  await mkdir('.swubase/crossfire-home', { recursive: true });
  await page.screenshot({
    path: '.swubase/crossfire-home/card-release-preview.png',
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Activate release' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Card release ${candidate.data.version} is active`,
  );
  expect((await activeCardVersions(sql)).cards).toBe(candidate.pin);
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(page.getByRole('button', { name: 'Check for updates' })).toBeVisible();
  await page.screenshot({
    path: '.swubase/crossfire-home/card-releases-mobile.png',
    fullPage: true,
  });
  await sql`UPDATE "user" SET role='user' WHERE id=${userId}`;
  expect(
    (
      await context.request.post(`${origin}/api/admin/crossfire-cards/activate`, {
        data: {
          version: original.data.version,
          checksum: original.hash,
          source: 'installed',
          expectedActive: candidate.data.version,
        },
      })
    ).status(),
  ).toBe(403);
  expect(errors).toEqual([]);
  console.log(
    'Crossfire card release admin: anonymous/member denial, preview, activation, responsive UI passed',
  );
} finally {
  if (original && candidate)
    await sql`UPDATE public.application_configuration SET value=${original.data.version} WHERE key=${ACTIVE_CARD_BUNDLE} AND value=${candidate.data.version}`;
  await sql`DELETE FROM session WHERE id=${sessionId}`;
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  if (candidate)
    await sql`DELETE FROM play.card_bundles WHERE version=${candidate.data.version} AND NOT EXISTS(SELECT 1 FROM play.games WHERE versions->>'cards'=${candidate.pin}) AND NOT EXISTS(SELECT 1 FROM play.lobbies WHERE versions->>'cards'=${candidate.pin})`;
  await browser.close();
  await sql.end();
}
