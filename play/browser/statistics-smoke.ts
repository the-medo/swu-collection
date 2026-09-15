// Real local account/API/socket acceptance; no external notification endpoints.
import { chromium, expect, type BrowserContext } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import postgres from 'postgres';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { choose, ids } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Select the running local worktree DB explicitly');
if (
  !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const browser = await chromium.launch();
const users = ['Alex', 'Nova'].map(name => ({
  name,
  userId: `statistics-browser-${randomUUID()}`,
  sessionId: randomUUID(),
  token: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b] = users as [(typeof users)[number], (typeof users)[number]];
const teams = [randomUUID(), randomUUID()];
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog),
  matches = new CrossfireMatches(sql, catalog),
  store = new PostgresGameStore(sql);
const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
const cookieName = getCookies({
  baseURL: origin,
  advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
}).sessionToken.name;
const contexts: BrowserContext[] = [],
  errors: string[] = [];
async function open(p: typeof a) {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  contexts.push(context);
  const signed = (
    await serializeSignedCookie(cookieName, p.token, process.env.BETTER_AUTH_SECRET!)
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
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on('pageerror', e => errors.push(e.message));
  const events: string[] = [];
  page.on('websocket', socket => {
    if (socket.url().includes('/ws/game-results'))
      socket.on('framereceived', ({ payload }) => events.push(String(payload)));
  });
  await page.goto(`${origin}/statistics/history`);
  await expect(page.getByText('No matches found.', { exact: true })).toBeVisible();
  await expect.poll(() => events.some(e => e.includes('game_results.connected'))).toBe(true);
  return { page, context, events };
}
async function finish(lobbyId: string, play = false) {
  const lobby = (await lobbies.get(principal(a), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, `statistics-browser-${randomUUID()}`, 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  const submit = async (input: ReturnType<typeof choose>) => {
    if (input.type === 'random') throw new Error('Player command expected');
    await host.submit(input.playerId, randomUUID(), input);
  };
  if (play) {
    await submit(choose(host.state, i => i.kind === 'initiative' && i.playerId === 'p1'));
    for (let i = 0; i < 2; i++)
      await submit(choose(host.state, i => i.kind === 'mulligan' && !i.take));
    for (let i = 0; i < 2; i++)
      await submit(
        choose(host.state, 'resource', host.state.execution.decision!.selection!.cards.slice(0, 2)),
      );
    await submit(choose(host.state, 'play'));
  }
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.release(lease);
  const child = Bun.spawn([process.execPath, 'play/history/finalizer-process.ts', lobby.gameId!], {
    env: { ...process.env, CROSSFIRE_FINALIZER_CHILD: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stderr).text()).toBe('');
}
try {
  for (const p of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role)
      VALUES (${p.userId},${p.name},${p.userId + '@invalid.local'},false,now(),now(),${p.name},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at)
      VALUES (${p.sessionId},${p.token},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id)
      VALUES (${p.deckId},${p.userId},${p.name + ' Crossfire deck'},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${p.deckId},${ids.marine},1,12)`;
    await sql`INSERT INTO deck_information(deck_id) VALUES (${p.deckId})`;
  }
  for (const [i, teamId] of teams.entries()) {
    await sql`INSERT INTO team(id,name) VALUES (${teamId},'Synthetic statistics team')`;
    for (const p of users)
      await sql`INSERT INTO team_member(team_id,user_id,auto_add_deck) VALUES (${teamId},${p.userId},${i === 0})`;
  }
  const lobby = await lobbies.create(principal(a), a.deckId, policy, 3);
  await lobbies.join(principal(b), lobby.id, b.deckId, policy, 3);
  const first = await open(a),
    second = await open(b);
  await finish(lobby.id, true);
  for (const tab of [first, second]) {
    await expect(tab.page.getByText('Crossfire · In progress', { exact: true })).toHaveCount(1);
    await expect(tab.page.locator('div').filter({ hasText: /^Bo3$/ })).toBeVisible();
    expect(tab.events.some(e => e.includes('game_results.changed'))).toBe(true);
  }
  const ready = {
    kind: 'next' as const,
    ready: true,
    mainboard: [{ cardId: ids.marine, quantity: 12 }],
  };
  await matches.ready(principal(a), lobby.id, ready);
  const next = (await matches.ready(principal(b), lobby.id, ready)).currentLobbyId;
  await finish(next);
  for (const [tab, p] of [
    [first, a],
    [second, b],
  ] as const) {
    await expect(tab.page.getByText('Crossfire · In progress', { exact: true })).toHaveCount(0);
    await expect(tab.page.getByText(p === a ? '2 - 0' : '0 - 2', { exact: true })).toBeVisible();
    const response = await tab.context.request.get(`${origin}/api/game-results`);
    expect(response.status()).toBe(200);
    const rows = await response.json();
    expect(rows).toHaveLength(2);
    expect(rows.every((r: any) => r.userId === p.userId && r.deckId === p.deckId)).toBe(true);
    expect(new Set(rows.map((r: any) => r.matchId)).size).toBe(1);
    await tab.page.reload();
    await expect(tab.page.getByText(p === a ? '2 - 0' : '0 - 2', { exact: true })).toBeVisible();
  }
  expect(
    await (await first.context.request.get(`${origin}/api/game-results?teamId=${teams[0]}`)).json(),
  ).toHaveLength(4);
  expect(
    await (await first.context.request.get(`${origin}/api/game-results?teamId=${teams[1]}`)).json(),
  ).toHaveLength(0);
  await first.page.goto(`${origin}/statistics/decks?sDeckId=${a.deckId}`);
  await expect(first.page.getByText('Alex Crossfire deck', { exact: true }).first()).toBeVisible();
  await mkdir('.swubase/crossfire-home', { recursive: true });
  await first.page.screenshot({
    path: '.swubase/crossfire-home/statistics-deck.png',
    fullPage: true,
  });
  await second.page.screenshot({
    path: '.swubase/crossfire-home/statistics-history.png',
    fullPage: true,
  });
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`${origin}/api/game-results`)).status()).toBe(401);
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(`${origin}/statistics/history`);
  await expect(
    anonymousPage.getByRole('button', { name: 'Sign in to see your statistics', exact: true }),
  ).toBeVisible();
  await anonymous.close();
  expect(errors).toEqual([]);
  console.log(
    'Statistics browser acceptance passed: two accounts without linked integrations, live BO3 updates, scoped APIs, deck detail and refresh.',
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const games =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${games.map(g => g.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM team WHERE id=ANY(${teams})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck_information WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${users.map(p => p.userId)})`;
  await sql.end();
}
