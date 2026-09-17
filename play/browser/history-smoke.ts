// Local, real API/worker/browser acceptance. Fixtures never bypass production auth.
import { chromium } from 'playwright';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir, copyFile } from 'node:fs/promises';
import { galleryBoard } from './gallery-scenarios.ts';
import { scenario } from '../testing/scenario.ts';
import { historyFixture } from '../testing/history-fixture.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { encodeArchive } from '../history/archive.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || url !== process.env.DATABASE_URL) throw new Error('Explicit worktree DB required');
const database = new URL(url),
  origin = process.env.BETTER_AUTH_URL!;
if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
  throw new Error('Local DB only');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Local origin only');
const sql = postgres(url, { max: 3 }),
  store = new PostgresGameStore(sql);
const gameId = `history-browser-${randomUUID()}`,
  lobbyId = randomUUID();
const users = [0, 1].map(n => ({
  id: `${gameId}-${n}`,
  session: randomUUID(),
  token: randomUUID(),
}));
const browser = await chromium.launch();
const folder = '.swubase/crossfire-gallery',
  served = 'frontend/.swubase/crossfire-gallery';
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const errors: string[] = [];
const live = process.env.CROSSFIRE_HISTORY_LIVE === '1';
try {
  const fixture = historyFixture(gameId, scenario(galleryBoard(gameId)).state);
  fixture.choose('pass');
  if (!live) {
    fixture.undo(0, 'p1', 'p2');
    fixture.choose('take-initiative');
    fixture.finish();
  }
  await store.create(fixture.history.checkpoint.checkpoint);
  const lease = (await store.claim(gameId, 'history-browser', 60_000))!;
  for (const { sequence, ...entry } of fixture.history.journal)
    await store.append(lease, {
      ...entry,
      inputs: JSON.parse(JSON.stringify(entry.inputs)),
      facts: JSON.parse(JSON.stringify(entry.facts)),
      expectedSequence: sequence - 1,
      checkpoint: encodeState(fixture.positions.get(sequence)!.state),
      ...(fixture.history.summary && sequence === fixture.history.sequence
        ? { summary: fixture.history.summary! }
        : {}),
    });
  if (!live)
    await store.publishArchive(gameId, await encodeArchive(await store.readHistory(gameId)));
  await store.release(lease);
  for (const user of users) {
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${user.id},'Replay fixture',${user.id + '@invalid.local'},false,now(),now(),${user.id},'USD', 'crossfire')`;
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${user.session},${user.token},now()+interval '1 hour',${user.id},now(),now())`;
  }
  await sql`INSERT INTO play.lobbies (id,creator_user_id,game_id,status,versions,allow_spectators) VALUES (${lobbyId},${users[0]!.id},${gameId},'started',${sql.json(fixture.state.versions)},true)`;
  for (const [i, user] of users.entries())
    await sql`INSERT INTO play.participants (lobby_id,seat,user_id,session_id,deck_snapshot) VALUES (${lobbyId},${i ? 'p2' : 'p1'},${user.id},${user.session},'{}')`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, users[0]!.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
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
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', error => errors.push(error.message));
  const frames: any[] = [];
  page.on('websocket', ws =>
    ws.on('framereceived', frame => {
      try {
        frames.push(JSON.parse(frame.payload.toString()));
      } catch {}
    }),
  );
  await page.goto(`${origin}/crossfire`);
  if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  if (live) {
    const otherContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const otherSigned = (
      await serializeSignedCookie(cookieName, users[1]!.token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0]!;
    await otherContext.addCookies([
      {
        name: cookieName,
        value: otherSigned.slice(otherSigned.indexOf('=') + 1),
        url: origin,
        httpOnly: true,
        secure: origin.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
    const other = await otherContext.newPage();
    await page.goto(`${origin}/crossfire/${lobbyId}`);
    await other.goto(`${origin}/crossfire/${lobbyId}`);
    await other.locator('.cf-match').waitFor();
    await other.evaluate(async () => {
      await document.fonts.ready;
      await Promise.race([
        Promise.all([...document.images].map(img => img.decode().catch(() => undefined))),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
    });
    await other.waitForTimeout(700);
    if (await other.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await other.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await other.getByRole('button', { name: 'Allow undo', exact: true }).waitFor();
    if (await other.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await other.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await mkdir(folder, { recursive: true });
    await mkdir(served, { recursive: true });
    await other.waitForTimeout(700);
    await other.screenshot({ path: `${folder}/history-undo-pending.png` });
    await other.getByRole('button', { name: 'Allow undo', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${folder}/history-undo-accepted.png` });
    if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Message to opponent' })
      .fill('Could we review that interaction after the game?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await other
      .getByText('Could we review that interaction after the game?', { exact: true })
      .waitFor();
    await other.screenshot({ path: `${folder}/playtesting-chat.png` });
    await other.reload();
    await other.locator('.cf-match').waitFor();
    await other
      .getByText('Could we review that interaction after the game?', { exact: true })
      .waitFor();
    await page.goto(`${origin}/crossfire`);
  }
  await page.getByRole('heading', { name: 'Your games' }).waitFor();
  await page.getByRole('link', { name: 'Replay', exact: true }).first().click();
  await page.getByTestId('crossfire-replay').waitFor();
  await page.getByRole('button', { name: 'Next step', exact: true }).waitFor({ state: 'visible' });
  const seek = async (button: string) => {
    const before = frames.filter(f => f.type === 'replay').length;
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.cf-connection-notice'));
    const deadline = Date.now() + 20_000;
    while (frames.filter(f => f.type === 'replay').length === before && Date.now() < deadline)
      await new Promise(r => setTimeout(r, 20));
    assert(frames.filter(f => f.type === 'replay').length > before, 'Replay response missing');
  };
  await seek('Next step');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
  await page.getByLabel('Label (optional)', { exact: true }).fill('Review this action');
  await page.getByRole('button', { name: 'Save bookmark', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const saved = frames.find(f => f.type === 'bookmark-saved')?.bookmark;
  assert(saved?.position, 'Bookmark was not acknowledged');

  await seek('Previous step');
  assert(
    frames.filter(f => f.type === 'replay').at(-1).position.atStart,
    'Backwards seek did not restore initial position',
  );
  await mkdir(folder, { recursive: true });
  await mkdir(served, { recursive: true });
  await page.screenshot({ path: `${folder}/history-replay.png` });
  await seek('Go to latest position');
  await page.getByRole('combobox', { name: 'Replay branch' }).selectOption({ index: 1 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/history-branch.png` });
  await page.getByRole('combobox', { name: 'Replay perspective' }).selectOption('public');
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByTestId('crossfire-replay').waitFor();
  await page.setViewportSize({ width: 430, height: 900 });
  await page.screenshot({ path: `${folder}/history-mobile.png` });
  assert(
    !frames.some(f => f.type === 'replay' && ('checkpoint' in f || 'journal' in f || 'state' in f)),
    'Private history payload in browser',
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`${origin}/crossfire`);
  await page.getByRole('heading', { name: 'Your bookmarks', exact: true }).waitFor();
  await page.getByText('Review this action', { exact: true }).waitFor();
  await page.screenshot({ path: `${folder}/history-bookmarks.png` });
  await page.getByRole('button', { name: 'Rename bookmark', exact: true }).click();
  await page.getByRole('textbox', { name: 'Bookmark label', exact: true }).fill('Changed label');
  await page.getByRole('button', { name: 'Save label', exact: true }).click();
  await page.getByText('Changed label', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'View', exact: true }).click();
  await page.waitForFunction(() => !!document.querySelector('.cf-match'));
  await page.waitForTimeout(500);
  assert(
    frames.filter(f => f.type === 'replay').at(-1).position.position === saved.position,
    'Bookmark opened the wrong step',
  );
  if (!live) {
    await page.goto(`${origin}/crossfire`);
    await page.getByRole('button', { name: 'Play from here', exact: true }).click();
    await page.getByText('Invitation sent', { exact: true }).waitFor();
    const otherContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const otherSigned = (
      await serializeSignedCookie(cookieName, users[1]!.token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0]!;
    await otherContext.addCookies([
      {
        name: cookieName,
        value: otherSigned.slice(otherSigned.indexOf('=') + 1),
        url: origin,
        httpOnly: true,
        secure: origin.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
    const other = await otherContext.newPage();
    await other.goto(`${origin}/crossfire`);
    await other.getByRole('link', { name: 'Review invitation', exact: true }).click();
    await other
      .getByRole('button', { name: 'Accept and create practice game', exact: true })
      .waitFor();
    await other.waitForTimeout(500);
    if (await other.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await other.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await other.screenshot({ path: `${folder}/history-practice-invitation.png` });
    await other
      .getByRole('button', { name: 'Accept and create practice game', exact: true })
      .click();
    await other.getByRole('link', { name: 'Enter practice game', exact: true }).click();
    await other.locator('.cf-wordmark small').filter({ hasText: 'PRACTICE' }).waitFor();
    await other.locator('.cf-match').waitFor();
    await other.waitForTimeout(1000);
    await other.screenshot({ path: `${folder}/history-practice-game.png` });
    assert(other.url() !== `${origin}/crossfire/${lobbyId}`, 'Practice reused the source lobby');
  }
  await page.goto(`${origin}/crossfire/replay/${lobbyId}`);
  await page.getByTestId('crossfire-replay').waitFor();
  await page.getByRole('button', { name: 'Report a problem', exact: true }).click();
  await page.getByLabel('Short title', { exact: true }).fill('Review target interaction');
  await page
    .getByLabel('What went wrong?', { exact: true })
    .fill('Expected the selected unit to receive damage. Please check the ability resolution.');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${folder}/playtesting-report.png` });
  await page.getByRole('button', { name: 'Submit report', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.goto(`${origin}/crossfire`);
  const reports = page.getByRole('region', { name: 'Your problem reports' });
  await reports.getByText('Review target interaction', { exact: true }).waitFor();
  const reportPath = await reports
    .getByRole('link', { name: 'Open report', exact: true })
    .getAttribute('href');
  assert(reportPath, 'Saved report link missing');
  const reportId = reportPath!.split('/').at(-1)!;
  const endpoint = `${origin}/api/crossfire/reports/${reportId}`;
  const response = await context.request.get(endpoint);
  assert(response.ok(), 'Owner cannot read their saved report');
  const detail = (await response.json()).data;
  assert(
    detail.snapshot?.view &&
      !JSON.stringify(detail).includes('"checkpoint"') &&
      !JSON.stringify(detail).includes('"execution"'),
    'Report missing permitted view or leaking authoritative state',
  );
  assert(
    (
      await sql`SELECT count(*)::int AS n FROM play.report_notifications WHERE report_id=${reportId}`
    )[0]!.n === 1,
    'Report did not enqueue a notification',
  );
  const outsider = await browser.newContext();
  assert((await outsider.request.get(endpoint)).status() === 401, 'Anonymous report access');
  const otherSigned = (
    await serializeSignedCookie(cookieName, users[1]!.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await outsider.addCookies([
    {
      name: cookieName,
      value: otherSigned.slice(cookieName.length + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  assert(
    (await outsider.request.get(endpoint)).status() === 404,
    'Opponent can read a private report',
  );
  await sql`UPDATE "user" SET role='admin,crossfire' WHERE id=${users[1]!.id}`;
  assert(
    (await outsider.request.get(endpoint)).ok(),
    'Existing admin permission cannot open the report',
  );
  await sql`UPDATE "user" SET role=NULL WHERE id=${users[1]!.id}`;
  assert(
    (await outsider.request.get(endpoint)).status() === 404,
    'Revoked reviewer retains report access',
  );
  await outsider.close();
  await reports.getByRole('link', { name: 'Open report', exact: true }).click();
  await page.getByTestId('crossfire-report').waitFor();
  await page.locator('.cf-match').waitFor();
  await page.waitForTimeout(1000);
  if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page.screenshot({ path: `${folder}/report-inspector-desktop.png` });
  await page.reload();
  await page.getByTestId('crossfire-report').waitFor();
  await page.setViewportSize({ width: 430, height: 900 });
  if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${folder}/report-inspector-mobile.png` });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`${origin}/crossfire`);
  await reports.getByText('Review target interaction', { exact: true }).waitFor();
  await reports.getByRole('link', { name: 'Open reported position' }).click();
  await page.getByTestId('crossfire-replay').waitFor();
  assert(errors.length === 0, errors.join('; '));
  const candidates = [
    'report-inspector-desktop.png',
    'report-inspector-mobile.png',
    'playtesting-chat.png',
    'playtesting-report.png',
    'history-replay.png',
    'history-branch.png',
    'history-mobile.png',
    'history-bookmarks.png',
    'history-practice-invitation.png',
    'history-practice-game.png',
    'history-undo-pending.png',
    'history-undo-accepted.png',
  ];
  const files: string[] = [];
  for (const file of candidates) if (await Bun.file(`${folder}/${file}`).exists()) files.push(file);
  for (const file of files) await copyFile(`${folder}/${file}`, `${served}/${file}`);
  await Bun.write(
    `${folder}/history.html`,
    `<!doctype html><meta name="viewport" content="width=device-width"><title>Crossfire replay gallery</title><style>body{background:#091421;color:#dfecf7;font:16px system-ui;margin:2rem}img{max-width:100%}</style><h1>Crossfire replays</h1>${files.map(f => `<p>${f}</p><a href="${f}"><img src="${f}"></a>`).join('')}`,
  );
  await copyFile(`${folder}/history.html`, `${served}/history.html`);
  const index = Bun.file(`${folder}/index.html`);
  if (await index.exists()) {
    const html = await index.text();
    if (!html.includes('href="history.html"')) {
      const link = '<p><a href="history.html">Replays, undo, bookmarks and practice</a></p>';
      const container = /<(?:main|body)\b[^>]*>/i;
      await Bun.write(
        index,
        container.test(html) ? html.replace(container, match => match + link) : html + link,
      );
    }
    await copyFile(`${folder}/index.html`, `${served}/index.html`);
  }
  console.log(
    'History browser passed: account history, archived replay, backwards seek, branch, perspective, reload and mobile.',
  );
} finally {
  await browser.close();
  const forks =
    await sql`SELECT game_id FROM play.practice_requests WHERE source_game_id = ${gameId}`;
  if (forks.length) await sql`DELETE FROM play.games WHERE id = ANY(${forks.map(f => f.game_id)})`;
  await sql`DELETE FROM play.games WHERE id = ${gameId}`;
  await sql`DELETE FROM session WHERE user_id = ANY(${users.map(u => u.id)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${users.map(u => u.id)})`;
  await sql.end();
}
