import { CrossfireInvitationRealtime } from '../../server/lib/crossfire/invitationRealtime.ts';
import { CrossfireDecks } from '../../server/lib/crossfire/decks.ts';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import type { Principal } from '../../server/lib/crossfire/lobbies.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { CrossfireHistory } from '../../server/lib/crossfire/history.ts';
import { ids } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const prefix = `lobby-test-${randomUUID()}`;
const players: Principal[] = [0, 1, 2].map(n => ({
  userId: `${prefix}-${n}`,
  sessionId: `${prefix}-session-${n}`,
}));
const a = players[0]!,
  b = players[1]!,
  c = players[2]!;
const displayName = (principal: Principal) => `${prefix}-display-${players.indexOf(principal)}`;
const decks: string[] = [],
  lobbies: string[] = [],
  games: string[] = [];
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const service = new CrossfireLobbies(sql, catalog),
  store = new PostgresGameStore(sql);
const policy = { allowSpectators: true, handsToPlayers: true, handsToSpectators: false };
beforeAll(async () => {
  for (const principal of players) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role)
      VALUES (${principal.userId}, 'Synthetic lobby fixture', ${principal.userId + '@invalid.local'}, false, now(), now(), ${displayName(principal)}, 'USD', 'crossfire')`;
    await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
      VALUES (${principal.sessionId}, ${randomUUID()}, now() + interval '1 hour', ${principal.userId}, now(), now())`;
    const deckId = randomUUID();
    decks.push(deckId);
    await sql`INSERT INTO deck (id, user_id, format, leader_card_id_1, base_card_id)
      VALUES (${deckId}, ${principal.userId}, 1, ${ids.leader}, ${ids.base})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${deckId}, ${ids.marine}, 1, 12)`;
  }
});
afterAll(async () => {
  const rows =
    await sql`SELECT game_id FROM play.lobbies WHERE id = ANY(${lobbies}) AND game_id IS NOT NULL`;
  games.push(...rows.map(row => row.game_id));
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbies})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${games})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck WHERE id = ANY(${decks})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${players.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${players.map(p => p.userId)})`;
  await sql.end();
});
async function create() {
  const lobby = await service.create(a, decks[0]!, policy);
  lobbies.push(lobby.id);
  return lobby;
}

test('readiness preserves deck access and identifies unsupported cards without freezing a seat', async () => {
  expect(await service.inspectDeck(a, decks[0]!)).toEqual({ ready: true, issues: [] });
  await expect(service.inspectDeck(b, decks[0]!)).rejects.toThrow('deck-unavailable');
  await expect(service.inspectDeck({ ...a, sessionId: b.sessionId }, decks[0]!)).rejects.toThrow(
    'unauthenticated',
  );
  // A synthetic catalog entry keeps this boundary independent of card coverage.
  const unsupported = 'unimplemented-leader-fixture';
  const fixtureService = new CrossfireLobbies(sql, {
    ...catalog,
    [unsupported]: { type: 'Leader' },
  });
  try {
    await sql`UPDATE deck SET public = 2, leader_card_id_1 = ${unsupported} WHERE id = ${decks[0]!}`;
    const report = await fixtureService.inspectDeck(b, decks[0]!);
    expect(report.ready).toBe(false);
    expect(report.issues).toContainEqual({
      code: 'unsupported-card',
      cardId: unsupported,
      zone: 'leader',
    });
    expect(JSON.stringify(report)).not.toContain(decks[0]!);
    await expect(fixtureService.create(a, decks[0]!, policy)).rejects.toThrow('unsupported-deck');
  } finally {
    await sql`UPDATE deck SET public = 0, leader_card_id_1 = ${ids.leader} WHERE id = ${decks[0]!}`;
  }
});

test('preview-aware catalog providers are resolved for every admission and deck search', async () => {
  let current = catalog;
  const dynamicLobbies = new CrossfireLobbies(sql, async () => current);
  const dynamicBrowser = new CrossfireDecks(sql, async () => current);

  expect(await dynamicLobbies.inspectDeck(a, decks[0]!)).toEqual({ ready: true, issues: [] });
  expect(
    (await dynamicBrowser.list(a, { source: 'mine', search: catalog[ids.leader].name })).data,
  ).not.toHaveLength(0);

  current = {
    ...catalog,
    [ids.marine]: undefined,
    [ids.leader]: { ...catalog[ids.leader], name: 'Fresh Preview Leader Name' },
  };
  const report = await dynamicLobbies.inspectDeck(a, decks[0]!);
  expect(report.ready).toBe(false);
  expect(report.issues).toContainEqual({
    code: 'unknown-card',
    cardId: ids.marine,
    zone: 'mainboard',
  });
  expect(
    (await dynamicBrowser.list(a, { source: 'mine', search: 'fresh preview leader' })).data,
  ).not.toHaveLength(0);
});

test('both accepted decks and initial game persist atomically; metadata and seats contain no deck disclosures', async () => {
  const lobby = await create();
  expect(lobby.status).toBe('waiting');
  expect(lobby.mySeat).toBe('p1');
  const before = await service.get(b, lobby.id);
  expect(before?.mySeat).toBeNull();
  for (const privateValue of [decks[0]!, a.userId, a.sessionId, ids.marine])
    expect(JSON.stringify(before)).not.toContain(privateValue);
  const joined = await service.join(b, lobby.id, decks[1]!, policy);
  expect(joined.status).toBe('started');
  expect(joined.mySeat).toBe('p2');
  expect(joined.seats).toBe(2);
  const lease = (await store.claim(joined.gameId!, 'lobby-test-worker', 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 10, leaseMs: 60_000 });
  expect(host.state.seats).toEqual(['p1', 'p2']);
  expect(host.state.disclosure).toEqual({ handsToPlayers: true, handsToSpectators: false });
  const retry = await service.join(b, lobby.id, decks[1]!, policy);
  expect(retry).toEqual(joined);
  await expect(service.join(c, lobby.id, decks[2]!, policy)).rejects.toThrow('conflict');
});

test('joining requires explicit consent to the exact hand/spectator policy', async () => {
  const lobby = await create();
  await expect(
    service.join(b, lobby.id, decks[1]!, { ...policy, handsToPlayers: false }),
  ).rejects.toThrow('policy-mismatch');
  const current = await service.get(a, lobby.id);
  expect(current?.status).toBe('waiting');
  expect(current?.seats).toBe(1);
  expect(current?.gameId).toBeNull();
  await expect(service.join(a, lobby.id, decks[0]!, policy)).rejects.toThrow('conflict');
});

test('concurrent opponents can claim only one second seat and create only one game', async () => {
  const lobby = await create();
  const attempts = await Promise.allSettled([
    service.join(b, lobby.id, decks[1]!, policy),
    service.join(c, lobby.id, decks[2]!, policy),
  ]);
  expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(
    (attempts.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.message,
  ).toContain('conflict');
  expect((await service.get(a, lobby.id))?.seats).toBe(2);
});

test('source deck edits do not replace an accepted snapshot', async () => {
  const lobby = await create();
  await sql`UPDATE deck_card SET quantity = 11 WHERE deck_id = ${decks[0]!} AND board = 1`;
  try {
    const joined = await service.join(b, lobby.id, decks[1]!, policy);
    const saved = await store.load(joined.gameId!);
    const state = JSON.parse(saved.checkpoint.checkpoint);
    expect(state.players.p1.deck).toHaveLength(12);
    expect(state.players.p2.deck).toHaveLength(12);
  } finally {
    await sql`UPDATE deck_card SET quantity = 12 WHERE deck_id = ${decks[0]!} AND board = 1`;
  }
});

test('session mismatch, expiration, sign-out, bans and stale creator readiness deny admission', async () => {
  await expect(service.create({ ...a, sessionId: b.sessionId }, decks[0]!, policy)).rejects.toThrow(
    'unauthenticated',
  );
  const lobby = await create();
  await sql`UPDATE session SET expires_at = now() - interval '1 minute' WHERE id = ${b.sessionId}`;
  await expect(service.join(b, lobby.id, decks[1]!, policy)).rejects.toThrow('unauthenticated');
  await sql`UPDATE session SET expires_at = now() + interval '1 hour' WHERE id = ${b.sessionId}`;
  await sql`UPDATE "user" SET banned = true WHERE id = ${b.userId}`;
  await expect(service.join(b, lobby.id, decks[1]!, policy)).rejects.toThrow('unauthenticated');
  await sql`UPDATE "user" SET banned = false WHERE id = ${b.userId}`;
  await sql`DELETE FROM session WHERE id = ${a.sessionId}`;
  await expect(service.get(a, lobby.id)).rejects.toThrow('unauthenticated');
  await expect(service.join(b, lobby.id, decks[1]!, policy)).rejects.toThrow('unauthenticated');
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${a.sessionId}, ${randomUUID()}, now() + interval '1 hour', ${a.userId}, now(), now())`;
  expect((await service.get(a, lobby.id))?.seats).toBe(1);
});

test('private deck access, cancellation and incompatible stored bundles fail without partial seats', async () => {
  await expect(service.create(b, decks[0]!, policy)).rejects.toThrow('deck-unavailable');
  const cancelled = await create();
  await expect(service.cancel(b, cancelled.id)).rejects.toThrow('conflict');
  await service.cancel(a, cancelled.id);
  await expect(service.join(b, cancelled.id, decks[1]!, policy)).rejects.toThrow('unavailable');
  const stale = await create();
  await sql`UPDATE play.lobbies SET versions = jsonb_set(versions, '{engine}', '"unavailable-development-engine"') WHERE id = ${stale.id}`;
  await expect(service.join(b, stale.id, decks[1]!, policy)).rejects.toThrow('incompatible');
  expect((await service.get(a, stale.id))?.seats).toBe(1);
});

test('failed second-seat insertion rolls back the newly created game and checkpoint', async () => {
  const lobby = await create();
  const [before] = await sql`SELECT count(*)::integer AS count FROM play.games`;
  await sql.unsafe(`CREATE FUNCTION play.test_reject_join() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.lobby_id = '${lobby.id}' AND NEW.seat = 'p2' THEN RAISE EXCEPTION 'injected admission failure'; END IF; RETURN NEW; END $$`);
  try {
    await sql.unsafe(
      'CREATE TRIGGER test_reject_join BEFORE INSERT ON play.participants FOR EACH ROW EXECUTE FUNCTION play.test_reject_join()',
    );
    await expect(service.join(b, lobby.id, decks[1]!, policy)).rejects.toThrow(
      'injected admission failure',
    );
    const [after] = await sql`SELECT count(*)::integer AS count FROM play.games`;
    expect(after!.count).toBe(before!.count);
    expect((await service.get(a, lobby.id))?.seats).toBe(1);
    expect((await service.get(a, lobby.id))?.gameId).toBeNull();
  } finally {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_reject_join ON play.participants');
    await sql.unsafe('DROP FUNCTION play.test_reject_join()');
  }
});

test('contributor sanitization includes lobby snapshots and permits clearing auth sessions independently', async () => {
  const lobby = await create();
  const source = await Bun.file(
    new URL('../../scripts/remote-dev/sql/000-crossfire.sql', import.meta.url),
  ).text();
  const rollback = new Error('rollback-fixture');
  try {
    await sql.begin(async tx => {
      await tx.unsafe(source.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
      const [row] = await tx`SELECT count(*)::integer AS count FROM play.participants`;
      expect(row!.count).toBe(0);
      await tx.unsafe('TRUNCATE public.session');
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  expect((await service.get(a, lobby.id))?.seats).toBe(1);
});

test('history lists only the current account games, supports stable pagination and rechecks sessions', async () => {
  const history = new CrossfireHistory(sql);
  const joinedIds: string[] = [];
  for (let i = 0; i < 26; i++) {
    const lobby = await create();
    joinedIds.push(lobby.id);
    await service.join(b, lobby.id, decks[1]!, policy);
  }
  const first = await history.list(a);
  expect(first.data).toHaveLength(25);
  expect(first.nextCursor).not.toBeNull();
  const second = await history.list(a, first.nextCursor!);
  const combined = [...first.data, ...second.data];
  expect(new Set(combined.map(g => g.lobbyId)).size).toBe(combined.length);
  expect(joinedIds.every(id => combined.some(g => g.lobbyId === id))).toBe(true);
  expect((await history.list(c)).data.every(g => !joinedIds.includes(g.lobbyId))).toBe(true);
  expect(first.data.every(g => g.mySeat === 'p1')).toBe(true);
  expect(JSON.stringify(first)).not.toContain('checkpoint');
  await expect(history.list(a, 'invalid')).rejects.toThrow('Invalid Crossfire history cursor');
  await expect(history.list({ ...a, sessionId: c.sessionId })).rejects.toThrow('unauthenticated');
});

test('deck browser searches and paginates without disclosing private or unlisted decks', async () => {
  const browser = new CrossfireDecks(sql, catalog);
  const created: string[] = [];
  for (let n = 0; n < 23; n++) {
    const id = randomUUID();
    decks.push(id);
    created.push(id);
    await sql`INSERT INTO deck (id, user_id, format, name, leader_card_id_1, base_card_id, public, updated_at)
      VALUES (${id}, ${a.userId}, 1, ${prefix + ' search ' + n}, ${ids.leader}, ${ids.base}, 1, '2026-09-13 11:12:13.123456')`;
  }
  await sql`UPDATE deck SET public = 0 WHERE id = ${created[0]!}`;
  await sql`UPDATE deck SET public = 2 WHERE id = ${created[1]!}`;
  const first = await browser.list(b, { source: 'public', search: prefix });
  expect(first.data).toHaveLength(20);
  const last = await browser.list(b, {
    source: 'public',
    search: prefix,
    cursor: first.nextCursor!,
  });
  expect(last.data).toHaveLength(1);
  const result = [...first.data, ...last.data];
  expect(new Set(result.map(d => d.id)).size).toBe(21);
  expect(result.some(d => d.id === created[0] || d.id === created[1])).toBe(false);
  expect(last.nextCursor).toBeNull();
  expect((await browser.list(a, { source: 'mine', search: prefix })).data).toHaveLength(20);
  expect((await browser.list(b, { source: 'mine', search: prefix })).data).toHaveLength(0);
  await expect(browser.get(b, created[0]!)).rejects.toThrow('deck-unavailable');
  expect((await browser.get(b, created[1]!)).id).toBe(created[1]!);
  expect(Object.keys(first.data[0]!).sort()).toEqual([
    'author',
    'baseId',
    'id',
    'leaderId',
    'name',
  ]);
  expect(
    (await browser.list(a, { source: 'mine', search: catalog[ids.leader].name })).data.length,
  ).toBeGreaterThan(0);
  expect(
    (await browser.list(a, { source: 'mine', search: catalog[ids.base].name })).data.length,
  ).toBeGreaterThan(0);
  expect((await browser.list(a, { source: 'mine', search: '%' })).data).toEqual([]);
  await expect(
    browser.list({ ...a, sessionId: b.sessionId }, { source: 'mine', search: '' }),
  ).rejects.toThrow('unauthenticated');
  await expect(browser.list(a, { source: 'mine', search: '', cursor: 'e30' })).rejects.toThrow(
    'Invalid deck cursor',
  );
});

test('recent decks deduplicate the viewer’s seats and respect current access', async () => {
  const browser = new CrossfireDecks(sql, catalog);
  for (let i = 0; i < 2; i++) {
    const lobby = await create();
    await service.join(b, lobby.id, decks[1]!, policy);
  }
  const recent = await browser.list(a, { source: 'recent', search: '' });
  expect(recent.data.map(d => d.id)).toEqual([decks[0]!]);
  expect((await browser.list(b, { source: 'recent', search: '' })).data.map(d => d.id)).toEqual([
    decks[1]!,
  ]);
  // Changing the source's owner and visibility must not disclose it through an old snapshot.
  try {
    await sql`UPDATE deck SET user_id = ${c.userId}, public = 0 WHERE id = ${decks[0]!}`;
    expect((await browser.list(a, { source: 'recent', search: '' })).data).toEqual([]);
  } finally {
    await sql`UPDATE deck SET user_id = ${a.userId} WHERE id = ${decks[0]!}`;
  }
  expect(
    (await new CrossfireHistory(sql).list(a, undefined, 'running')).data.every(
      g => g.status === 'running',
    ),
  ).toBe(true);
});

test('deck discovery requires consistent limited-deck ownership and visibility', async () => {
  const browser = new CrossfireDecks(sql, catalog);
  const id = randomUUID(),
    pool = randomUUID();
  decks.push(id);
  await sql`INSERT INTO card_pools (id, user_id, type) VALUES (${pool}, ${a.userId}, 'draft')`;
  try {
    await sql`INSERT INTO deck (id, user_id, format, name, public, card_pool_id)
      VALUES (${id}, ${a.userId}, 4, ${prefix + ' limited'}, 1, ${pool})`;
    await sql`INSERT INTO card_pool_decks (deck_id, card_pool_id, user_id, visibility)
      VALUES (${id}, ${pool}, ${a.userId}, 'private')`;
    expect((await browser.list(b, { source: 'public', search: prefix + ' limited' })).data).toEqual(
      [],
    );
    await expect(browser.get(b, id)).rejects.toThrow('deck-unavailable');
    expect((await browser.get(a, id)).id).toBe(id);
    await sql`UPDATE card_pool_decks SET visibility = 'unlisted' WHERE deck_id = ${id}`;
    expect((await browser.get(b, id)).id).toBe(id);
    expect((await browser.list(b, { source: 'public', search: prefix + ' limited' })).data).toEqual(
      [],
    );
    await sql`UPDATE card_pool_decks SET visibility = 'public' WHERE deck_id = ${id}`;
    expect(
      (await browser.list(b, { source: 'public', search: prefix + ' limited' })).data.map(
        d => d.id,
      ),
    ).toEqual([id]);
    await sql`UPDATE card_pool_decks SET user_id = ${c.userId} WHERE deck_id = ${id}`;
    await expect(browser.get(a, id)).rejects.toThrow('deck-unavailable');
  } finally {
    await sql`DELETE FROM card_pool_decks WHERE deck_id = ${id}`;
    await sql`DELETE FROM deck WHERE id = ${id}`;
    await sql`DELETE FROM card_pools WHERE id = ${pool}`;
  }
});

test('activity artwork uses admitted leaders, viewer order, and current replay access', async () => {
  const { CrossfireBookmarks } = await import('../../server/lib/crossfire/bookmarks.ts');
  const { CrossfirePractice } = await import('../../server/lib/crossfire/practice.ts');
  const history = new CrossfireHistory(sql),
    bookmarks = new CrossfireBookmarks(sql),
    practice = new CrossfirePractice(sql);
  const opponentLeader = 'darth-vader--dark-lord-of-the-sith';
  const lobby = await create();
  await sql`UPDATE deck SET leader_card_id_1 = ${opponentLeader} WHERE id = ${decks[1]!}`;
  try {
    await service.join(b, lobby.id, decks[1]!, policy);
  } finally {
    await sql`UPDATE deck SET leader_card_id_1 = ${ids.leader} WHERE id = ${decks[1]!}`;
  }
  const gameId = (await service.get(a, lobby.id))!.gameId!;
  const position = 'a'.repeat(32),
    branch = 'b'.repeat(32);
  const bookmarkId = randomUUID(),
    reportId = randomUUID(),
    requestId = randomUUID();
  // Read-model fixtures only: no report delivery is queued or sent.
  await sql`INSERT INTO play.bookmarks(id,user_id,game_id,position,branch,label) VALUES (${bookmarkId},${c.userId},${gameId},${position},${branch},'Spectator position')`;
  await sql`INSERT INTO play.problem_reports(id,user_id,game_id,position,branch,label,description) VALUES (${reportId},${c.userId},${gameId},${position},${branch},'Spectator report','Synthetic list-only report fixture')`;
  await sql`INSERT INTO play.practice_requests(id,source_game_id,requester_id,opponent_id,position,branch,label,game_id,lobby_id,expires_at)
    VALUES (${requestId},${gameId},${a.userId},${b.userId},${position},${branch},'Practice fixture',${'practice-' + randomUUID()},${randomUUID()},now()+interval '1 hour')`;
  expect((await history.list(a)).data.find(g => g.gameId === gameId)?.leaders).toEqual([
    ids.leader,
    opponentLeader,
  ]);
  expect((await history.list(b)).data.find(g => g.gameId === gameId)?.leaders).toEqual([
    opponentLeader,
    ids.leader,
  ]);
  expect((await bookmarks.list(c)).find(r => r.id === bookmarkId)?.leaders).toEqual([
    ids.leader,
    opponentLeader,
  ]);
  expect((await bookmarks.reports(c)).find(r => r.id === reportId)?.leaders).toEqual([
    ids.leader,
    opponentLeader,
  ]);
  expect((await practice.list(b)).find(r => r.id === requestId)?.leaders).toEqual([
    opponentLeader,
    ids.leader,
  ]);
  const summaries = JSON.stringify([
    await history.list(a),
    await bookmarks.list(c),
    await bookmarks.reports(c),
    await practice.list(b),
  ]);
  for (const privateField of [
    'deck_snapshot',
    'sourceDeckId',
    'mainboard',
    'sideboard',
    'checkpoint',
  ])
    expect(summaries).not.toContain(privateField);
  await sql`UPDATE play.lobbies SET allow_spectators = false WHERE id = ${lobby.id}`;
  expect((await bookmarks.list(c)).find(r => r.id === bookmarkId)).toMatchObject({
    available: false,
    leaders: null,
  });
  expect((await bookmarks.reports(c)).find(r => r.id === reportId)).toMatchObject({
    available: false,
    leaders: null,
  });
  expect((await history.list(a)).data.find(g => g.gameId === gameId)?.leaders).toEqual([
    ids.leader,
    opponentLeader,
  ]);
});

test('teammate invitations conceal identities, restrict admission and expire durably', async () => {
  const teamId = randomUUID();
  await sql`INSERT INTO team (id, name) VALUES (${teamId}, 'Synthetic invitation team')`;
  try {
    await sql`INSERT INTO team_member (team_id, user_id) VALUES (${teamId}, ${a.userId}), (${teamId}, ${b.userId})`;
    expect((await service.teammates(a)).map(p => p.id)).toContain(b.userId);
    expect((await service.teammates(a)).map(p => p.id)).not.toContain(c.userId);
    expect((await service.teammates(a)).find(p => p.id === b.userId)?.name).toBe(displayName(b));
    await sql`UPDATE "user" SET display_name = '   ' WHERE id = ${b.userId}`;
    try {
      expect((await service.teammates(a)).find(p => p.id === b.userId)?.name).toBe('Player');
    } finally {
      await sql`UPDATE "user" SET display_name = ${displayName(b)} WHERE id = ${b.userId}`;
    }
    await expect(service.create(a, decks[0]!, policy, 1, true, c.userId)).rejects.toThrow(
      'unavailable',
    );
    await expect(service.create(a, decks[0]!, policy, 1, true, a.userId)).rejects.toThrow(
      'unavailable',
    );
    await sql`UPDATE "user" SET role = 'admin' WHERE id = ${b.userId}`;
    try {
      expect((await service.teammates(a)).map(p => p.id)).not.toContain(b.userId);
      await expect(service.create(a, decks[0]!, policy, 1, true, b.userId)).rejects.toThrow(
        'unavailable',
      );
    } finally {
      await sql`UPDATE "user" SET role = 'admin,crossfire' WHERE id = ${b.userId}`;
    }
    const lobby = await service.create(a, decks[0]!, policy, 3, false, b.userId);
    lobbies.push(lobby.id);
    expect(new Date(lobby.expiresAt!).getTime() - Date.now()).toBeGreaterThan(175_000);
    const incoming = (await service.invitations(b)).find(i => i.lobbyId === lobby.id)!;
    expect(incoming.direction).toBe('incoming');
    expect(incoming.player.name).toBe(displayName(a));
    expect((await service.invitations(a)).find(i => i.lobbyId === lobby.id)?.player.name).toBe(
      displayName(b),
    );
    expect(incoming).not.toHaveProperty('leaderId');
    expect(incoming).not.toHaveProperty('baseId');
    const hidden = await service.get(b, lobby.id);
    expect(hidden!.host).toEqual({ name: displayName(a) });
    expect(JSON.stringify([incoming, hidden, await service.teammates(a)])).not.toContain(
      'Synthetic lobby fixture',
    );
    await sql`UPDATE "user" SET display_name = '   ' WHERE id = ${a.userId}`;
    try {
      expect((await service.get(b, lobby.id))?.host?.name).toBe('Player');
      expect((await service.invitations(b)).find(i => i.lobbyId === lobby.id)?.player.name).toBe(
        'Player',
      );
    } finally {
      await sql`UPDATE "user" SET display_name = ${displayName(a)} WHERE id = ${a.userId}`;
    }
    expect(lobby.host?.leaderId).toBe(ids.leader);
    expect(await service.get(c, lobby.id)).toBeNull();
    await expect(service.join(c, lobby.id, decks[2]!, policy, 3)).rejects.toThrow('unavailable');
    await expect(service.create(a, decks[0]!, policy, 3, false, b.userId)).rejects.toThrow(
      'conflict',
    );
    await sql`UPDATE play.lobbies SET expires_at = clock_timestamp() - interval '1 second' WHERE id = ${lobby.id}`;
    expect((await service.get(b, lobby.id))?.status).toBe('expired');
    expect((await service.invitations(b)).some(i => i.lobbyId === lobby.id)).toBe(false);
    await expect(service.join(b, lobby.id, decks[1]!, policy, 3)).rejects.toThrow('unavailable');
    await new CrossfireInvitationRealtime(sql).tick();
    const [expired] = await sql`SELECT status, game_id FROM play.lobbies WHERE id = ${lobby.id}`;
    expect(expired).toMatchObject({ status: 'expired', game_id: null });
    const simultaneous = await Promise.allSettled([
      service.create(a, decks[0]!, policy, 1, true, b.userId),
      service.create(a, decks[0]!, policy, 1, true, b.userId),
    ]);
    expect(simultaneous.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    for (const result of simultaneous) {
      if (result.status === 'fulfilled') {
        lobbies.push(result.value.id);
        await service.cancel(a, result.value.id);
      } else expect(result.reason.message).toContain('conflict');
    }
    const visible = await service.create(a, decks[0]!, policy, 1, true, b.userId);
    lobbies.push(visible.id);
    expect((await service.invitations(b)).find(i => i.lobbyId === visible.id)).toMatchObject({
      leaderId: ids.leader,
      baseId: ids.base,
    });
    await service.join(b, visible.id, decks[1]!, policy);
    expect((await service.invitations(a)).some(i => i.lobbyId === visible.id)).toBe(false);
    expect((await service.invitations(b)).some(i => i.lobbyId === visible.id)).toBe(false);
    const declined = await service.create(a, decks[0]!, policy, 1, true, b.userId);
    lobbies.push(declined.id);
    await expect(service.decline(c, declined.id)).rejects.toThrow('conflict');
    await service.decline(b, declined.id);
    expect((await service.get(a, declined.id))?.status).toBe('cancelled');
  } finally {
    await sql`DELETE FROM team WHERE id = ${teamId}`;
  }
});

test('invitation fanout rechecks membership before disclosing an event', async () => {
  const { invitationChannel } = await import('../../server/lib/crossfire/invitationEvents.ts');
  const realtime = new CrossfireInvitationRealtime(sql);
  const connected = Promise.withResolvers<void>(),
    closed = Promise.withResolvers<number>();
  const messages: string[] = [];
  const ws = {
    raw: {},
    send(message: string) {
      messages.push(message);
      connected.resolve();
    },
    close(code: number) {
      closed.resolve(code);
    },
  } as unknown as import('hono/ws').WSContext;
  await realtime.start();
  try {
    realtime.register(ws, b);
    await connected.promise;
    await sql`UPDATE "user" SET role = 'admin' WHERE id = ${b.userId}`;
    await sql`SELECT pg_notify(${invitationChannel}, ${JSON.stringify({ lobbyId: randomUUID(), users: [b.userId] })})`;
    expect(await closed.promise).toBe(4403);
    expect(messages.map(message => JSON.parse(message).type)).toEqual(['crossfire.connected']);
  } finally {
    await realtime.stop();
    await sql`UPDATE "user" SET role = 'admin,crossfire' WHERE id = ${b.userId}`;
  }
});
