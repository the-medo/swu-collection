import { CrossfireAiConsent } from '../../server/lib/crossfire/aiConsent.ts';
import { CrossfireHistory } from '../../server/lib/crossfire/history.ts';
import { chromium, expect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { releaseFixture } from '../testing/ai/release-fixtures.ts';
import type { AiReleaseStatus } from '../../shared/types/crossfire-ai-releases.ts';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { ids } from '../testing/helpers.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Select the running local worktree database');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 3, onnotice: () => {} }),
  browser = await chromium.launch();
const users = [0, 1].map(() => ({
  userId: `ai-browser-${randomUUID()}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
  token: randomUUID(),
}));
const a = users[0]!,
  b = users[1]!;
let lobbyId: string | undefined,
  gameId: string | null = null;
try {
  for (const u of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${u.userId},'AI browser fixture',${u.userId + '@invalid.local'},false,now(),now(),${u.userId},'USD',${u === a ? 'admin,crossfire' : 'crossfire'})`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${u.sessionId},${u.token},now()+interval '1 hour',${u.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,format,leader_card_id_1,base_card_id) VALUES(${u.deckId},${u.userId},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES(${u.deckId},${ids.marine},1,12)`;
  }
  const identities = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const lobbies = new CrossfireLobbies(sql, identities),
    policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
  const principal = (u: typeof a) => ({ userId: u.userId, sessionId: u.sessionId });
  const lobby = await lobbies.create(principal(a), a.deckId, policy);
  lobbyId = lobby.id;
  gameId = (await lobbies.join(principal(b), lobby.id, b.deckId, policy)).gameId;
  const context = await browser.newContext({ viewport: { width: 1450, height: 1000 } });
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const cookie = (
    await serializeSignedCookie(name, a.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
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
  const anonymous = await browser.newContext();
  await expect
    .poll(async () => (await anonymous.request.get(`${origin}/api/admin/crossfire-ai`)).status(), {
      timeout: 15000,
    })
    .toBe(401);
  const statusResponse = await context.request.get(`${origin}/api/admin/crossfire-ai`);
  expect(statusResponse.status()).toBe(200);
  const actual = (await statusResponse.json()).data as AiReleaseStatus;
  const page = await context.newPage(),
    errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/admin?page=crossfire-ai`);
  await expect(page.getByTestId('crossfire-ai-admin')).toBeVisible();
  await page.screenshot({ path: '.swubase/crossfire-ai/releases-admin-empty.png', fullPage: true });
  const uploadDirectory = process.env.CROSSFIRE_PLAYABLE_RELEASE;
  if (uploadDirectory) {
    const root = resolve('.swubase/crossfire-ai'),
      directory = resolve(uploadDirectory);
    if (relative(root, directory).startsWith('..') || actual.remoteConfigured)
      throw new Error('Upload smoke requires a local artifact and no remote R2 writes');
    const manifest = await Bun.file(directory + '/release.json').json();
    await page.getByText('Upload an evaluated model release', { exact: true }).click();
    await page
      .getByLabel('Release manifest', { exact: true })
      .setInputFiles(directory + '/release.json');
    await page.getByLabel('Model weights', { exact: true }).setInputFiles(directory + '/model.pt');
    await page.getByRole('button', { name: 'Upload release', exact: true }).click();
    await expect(
      page.getByText('Imported. Review the release to make it available for new games.', {
        exact: true,
      }),
    ).toBeVisible({ timeout: 30000 });
    const updated = (await (await context.request.get(`${origin}/api/admin/crossfire-ai`)).json())
      .data;
    expect(
      updated.releases.some(
        (r: { id: string; playable: boolean }) => r.id === manifest.id && r.playable,
      ),
    ).toBe(true);
    expect(updated.active).toEqual(actual.active);
    await page.screenshot({
      path: '.swubase/crossfire-ai/play-ai-admin-upload.png',
      fullPage: true,
    });
  }
  // Synthetic transport isolates UI release review from real R2 writes/activation.
  const { release } = releaseFixture();
  const {
    contract: _contract,
    artifact: _artifact,
    datasets: _datasets,
    deckSnapshots: _snapshots,
    ...publicRelease
  } = release;
  const summary = {
    ...publicRelease,
    checksum: 'a'.repeat(64),
    compatible: true,
    installed: false,
    eligible: true,
    playable: false,
  };
  const status = {
    ...actual,
    releases: [summary],
    remoteConfigured: true,
    inferenceConfigured: true,
    remoteError: null,
    active: [],
    history: [],
  } as AiReleaseStatus;
  await page.route('**/api/admin/crossfire-ai', route => route.fulfill({ json: { data: status } }));
  await page.route('**/api/admin/crossfire-ai/preview', route =>
    route.fulfill({
      json: {
        data: {
          release: summary,
          versions: actual.versions,
          current: null,
          ready: true,
          message: 'Fixture validation passed',
        },
      },
    }),
  );
  await page.route('**/api/admin/crossfire-ai/activate', async route => {
    expect(route.request().postDataJSON()).toMatchObject({ id: release.id, expectedActive: null });
    status.active = [
      { leaderCardId: release.leader.cardId, target: actual.versions, releaseId: release.id },
    ];
    await route.fulfill({ json: { data: { activated: true } } });
  });
  await page.getByRole('button', { name: 'Check for releases' }).click();
  await expect(page.getByRole('button', { name: 'Review release' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Review release' }).click();
  await expect(page.getByRole('dialog')).toContainText('Fixture validation passed');
  await page.getByRole('dialog').getByRole('button', { name: 'Activate for this leader' }).click();
  await expect(page.getByText('now uses', { exact: false })).toBeVisible();
  await page.screenshot({ path: '.swubase/crossfire-ai/releases-admin.png', fullPage: true });
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(page.getByRole('button', { name: 'Check for releases' })).toBeVisible();
  await page.screenshot({
    path: '.swubase/crossfire-ai/releases-admin-mobile.png',
    fullPage: true,
  });
  // Exercise human consent through fixture-owned transport; route authorization has
  // separate HTTP and DB tests, with no application auth bypass.
  const consent = new CrossfireAiConsent(sql),
    history = new CrossfireHistory(sql);
  await page.route('**/api/crossfire/history*', async route =>
    route.fulfill({ json: await history.list(principal(a)) }),
  );
  await page.route('**/api/crossfire/games/*/ai-training', async route => {
    const result =
      route.request().method() === 'PUT'
        ? await consent.set(principal(a), gameId!, route.request().postDataJSON())
        : await consent.get(principal(a), gameId!);
    await route.fulfill({ json: { data: result } });
  });
  await page.goto(`${origin}/crossfire`);
  await page.getByRole('button', { name: 'AI training', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Both players must agree');
  await page.getByRole('button', { name: 'Allow training for this game' }).click();
  await expect(page.getByRole('dialog')).toContainText('You have allowed training use');
  await page.getByRole('button', { name: 'Withdraw permission' }).click();
  await expect(page.getByRole('dialog')).toContainText('You have not allowed training use');
  await page.screenshot({
    path: '.swubase/crossfire-ai/releases-consent-mobile.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    'Admin real auth/status, synthetic release review/activation, mobile rendering, real per-game consent/withdrawal passed',
  );
} finally {
  if (gameId) await sql`DELETE FROM play.games WHERE id=${gameId}`;
  if (lobbyId) await sql`DELETE FROM play.lobbies WHERE id=${lobbyId}`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${users.map(u => u.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${users.map(u => u.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${users.map(u => u.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${users.map(u => u.userId)})`;
  await browser.close();
  await sql.end();
}
