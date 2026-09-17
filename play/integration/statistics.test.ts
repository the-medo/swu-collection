import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { CrossfireExits } from '../../server/lib/crossfire/exits.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { publishStatistics } from '../statistics/publish.ts';
import { statisticsMatchId, statisticsGameId } from '../statistics/matches.ts';
import { choose, ids } from '../testing/helpers.ts';
import { verifyHistory } from '../history/records.ts';
import { practiceCheckpoint } from '../history/practice.ts';
import { createHash } from 'node:crypto';
import type { GameState } from '../engine/model.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Local worktree DB required');
const sql = postgres(url, { max: 6, onnotice: () => {} });
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog),
  matches = new CrossfireMatches(sql, catalog),
  exits = new CrossfireExits(sql),
  store = new PostgresGameStore(sql);
const users = [0, 1].map(() => ({
  userId: `statistics-test-${randomUUID()}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b] = users as [(typeof users)[number], (typeof users)[number]];
const teamId = randomUUID();
const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
const main: { cardId: string; quantity: number }[] = [{ cardId: ids.marine, quantity: 12 }];
beforeAll(async () => {
  await sql`INSERT INTO team(id, name) VALUES (${teamId}, 'Synthetic statistics')`;
  for (const p of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role)
      VALUES (${p.userId},'Synthetic statistics',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at)
      VALUES (${p.sessionId},${randomUUID()},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id)
      VALUES (${p.deckId},${p.userId},'Frozen statistics deck',1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity)
      VALUES (${p.deckId},${ids.marine},1,12),(${p.deckId},'open-fire',2,2)`;
    await sql`INSERT INTO team_member(team_id,user_id,auto_add_deck) VALUES (${teamId},${p.userId},${p === a})`;
  }
});
afterAll(async () => {
  const rows =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${rows.map(r => r.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM team WHERE id=${teamId}`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${users.map(p => p.userId)})`;
  await sql.end();
});
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
async function start(bestOf: 1 | 3 = 3) {
  const lobby = await lobbies.create(principal(a), a.deckId, policy, bestOf);
  await lobbies.join(principal(b), lobby.id, b.deckId, policy, bestOf);
  return lobby.id;
}
async function finish(lobbyId: string, loser: 'p1' | 'p2', play = false, publish = true) {
  const lobby = (await lobbies.get(principal(a), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, `statistics-${randomUUID()}`, 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  const submit = async (input: ReturnType<typeof choose>) => {
    if (input.type === 'random') throw new Error('Not player input');
    return host.submit(input.playerId, randomUUID(), input);
  };
  if (play) {
    await submit(choose(host.state, i => i.kind === 'initiative' && i.playerId === 'p1'));
    for (let i = 0; i < 2; i++)
      await submit(choose(host.state, o => o.kind === 'mulligan' && !o.take));
    for (let i = 0; i < 2; i++)
      await submit(
        choose(host.state, 'resource', host.state.execution.decision!.selection!.cards.slice(0, 2)),
      );
    await submit(choose(host.state, 'play'));
  }
  await host.submit(loser, randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: loser,
    expectedRevision: host.state.revision,
  });
  const history = await store.readHistory(lobby.gameId!);
  await store.publishArchive(lobby.gameId!, await encodeArchive(history));
  await store.release(lease);
  if (publish) await publishStatistics(sql, history);
  return history;
}
const results = (root: string) =>
  sql`SELECT * FROM public.game_result WHERE match_id = ${statisticsMatchId(root)} ORDER BY user_id, game_number`;
const ready = (mainboard = main) => ({ kind: 'next' as const, ready: true, mainboard });

test('one account result per game, frozen deck identity, private metrics, team opt-in and racing export receipts', async () => {
  const root = await start(1),
    history = await finish(root, 'p2', true, false);
  await sql`UPDATE deck SET leader_card_id_1 = 'darth-vader--dark-lord-of-the-sith' WHERE id = ${a.deckId}`;
  expect(
    (await Promise.all([publishStatistics(sql, history), publishStatistics(sql, history)])).sort(),
  ).toEqual([false, true]);
  await sql`UPDATE deck SET leader_card_id_1 = ${ids.leader} WHERE id = ${a.deckId}`;
  const rows = await results(root);
  expect(rows).toHaveLength(2);
  const own = rows.find(r => r.user_id === a.userId)!,
    other = rows.find(r => r.user_id === b.userId)!;
  expect(own.deck_id).toBe(a.deckId);
  expect(own.leader_card_id).toBe(ids.leader);
  expect(own.base_card_key).toBe('Command');
  expect(own.game_source).toBe('crossfire');
  expect(own.statistics_scope).toBe('standard');
  expect(own.game_id).toBe(statisticsGameId(history.gameId));
  expect(own.card_metrics[ids.marine]).toEqual({ drawn: 6, resourced: 2, played: 1 });
  expect(other.card_metrics[ids.marine]).toEqual({ drawn: 6, resourced: 2 });
  expect(own.other_data.crossfire.totals.actions).toBe(1);
  expect(own.other_data.crossfire.match).toMatchObject({
    bestOf: 1,
    status: 'complete',
    outcome: 'win',
    wins: 1,
    losses: 0,
  });
  expect(other.is_winner).toBe(false);
  expect(own.has_initiative).toBe(true);
  expect(own.has_mulligan).toBe(false);
  expect(await sql`SELECT * FROM team_deck WHERE team_id=${teamId}`).toHaveLength(1);
  await sql`UPDATE game_result SET note = 'Keep my note', exclude = true WHERE id = ${own.id}`;
  expect(await publishStatistics(sql, history)).toBe(false);
  expect((await results(root)).find(r => r.id === own.id)).toMatchObject({
    note: 'Keep my note',
    exclude: true,
  });
});

test('BO3 sideboarding shares a match; finishing updates earlier games and rematch gets a new identity', async () => {
  const root = await start();
  await finish(root, 'p2');
  expect((await results(root))[0]!.other_data.crossfire.match.status).toBe('in-progress');
  await matches.ready(
    principal(a),
    root,
    ready([
      { cardId: ids.marine, quantity: 10 },
      { cardId: 'open-fire', quantity: 2 },
    ]),
  );
  const next = (await matches.ready(principal(b), root, ready())).currentLobbyId;
  await finish(next, 'p1');
  await matches.ready(principal(a), next, ready());
  const last = (await matches.ready(principal(b), next, ready())).currentLobbyId;
  await finish(last, 'p2');
  const rows = await results(root);
  expect(rows).toHaveLength(6);
  const own = rows.filter(r => r.user_id === a.userId);
  expect(own.map(r => r.game_number)).toEqual([1, 2, 3]);
  expect(new Set(own.map(r => r.deck_id))).toEqual(new Set([a.deckId]));
  for (const row of own)
    expect(row.other_data.crossfire.match).toMatchObject({
      bestOf: 3,
      status: 'complete',
      outcome: 'win',
      wins: 2,
      losses: 1,
    });
  await matches.ready(principal(a), last, { kind: 'rematch', ready: true });
  const rematch = (await matches.ready(principal(b), last, { kind: 'rematch', ready: true }))
    .rematchLobbyId!;
  await finish(rematch, 'p2');
  expect(await results(rematch)).toHaveLength(2);
  expect((await results(rematch))[0]!.game_number).toBe(1);
  expect((await results(rematch))[0]!.statistics_scope).toBe('standard');
  expect(rematch).not.toBe(root);
});

test('repeated bookmark continuations publish practice outcomes and only post-bookmark metrics; a fresh rematch counts normally', async () => {
  const root = await start(1);
  const source = await finish(root, 'p2', true);
  let target: GameState | undefined;
  verifyHistory(source, (before, after) => {
    if (after.result) target = before;
  });
  expect(target!.round).toBe(1);
  const provenance = {
    kind: 'practice',
    sourceGameId: source.gameId,
    position: 'opaque-position',
    branch: 'opaque-branch',
    sourceHash: 'private-hash',
  };
  const idsCreated: string[] = [];
  for (let i = 0; i < 2; i++) {
    const gameId = `practice-statistics-${randomUUID()}`,
      lobbyId = randomUUID();
    idsCreated.push(lobbyId);
    await store.create(practiceCheckpoint(target!, gameId));
    await sql`UPDATE play.games SET provenance = ${sql.json(provenance)} WHERE id = ${gameId}`;
    await sql`INSERT INTO play.lobbies(id,creator_user_id,game_id,status,versions)
      SELECT ${lobbyId},creator_user_id,${gameId},'started',versions FROM play.lobbies WHERE id = ${root}`;
    await sql`INSERT INTO play.participants(lobby_id,seat,user_id,session_id,deck_snapshot)
      SELECT ${lobbyId},seat,user_id,session_id,deck_snapshot FROM play.participants WHERE lobby_id = ${root}`;
    await finish(lobbyId, i === 0 ? 'p1' : 'p2');
    const rows = await results(lobbyId);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.statistics_scope).toBe('practice');
      expect(row.other_data.crossfire).toMatchObject({
        resumed: true,
        totals: { played: 0, drawn: 0, resourced: 0, actions: 0 },
      });
      expect(JSON.stringify(row.other_data)).not.toContain('private-hash');
      expect(JSON.stringify(row.other_data)).not.toContain(source.gameId);
    }
  }
  expect((await results(root))[0]!.statistics_scope).toBe('standard');
  await matches.ready(principal(a), idsCreated[0]!, { kind: 'rematch', ready: true });
  const rematch = (
    await matches.ready(principal(b), idsCreated[0]!, { kind: 'rematch', ready: true })
  ).rematchLobbyId!;
  await finish(rematch, 'p2', true);
  expect((await results(rematch))[0]!.statistics_scope).toBe('standard');
  expect((await results(rematch))[0]!.other_data.crossfire.resumed).toBe(false);
});

test('migration backfills legacy practice rows and grouping while preserving edits and making cache updates discoverable', async () => {
  const root = await start(1);
  const source = await finish(root, 'p2');
  const provenance = {
    kind: 'practice',
    sourceGameId: 'deleted-source',
    position: 'opaque-position',
  };
  await sql`UPDATE play.games SET provenance = ${sql.json(provenance)} WHERE id = ${source.gameId}`;
  await sql`UPDATE public.game_result SET note = 'Keep this', exclude = true,
    updated_at = '2026-01-01', other_data = jsonb_set(other_data, '{crossfire,resumed}', 'true')
    WHERE match_id = ${statisticsMatchId(root)}`;
  const migration = await Bun.file(
    new URL('../../drizzle/0060_crossfire_practice_statistics.sql', import.meta.url),
  ).text();
  const backfills = migration.split('--> statement-breakpoint').slice(1);
  await sql.begin(async tx => {
    for (const query of backfills) await tx.unsafe(query);
    // Repeating the data portion must preserve user fields and deterministic grouping.
    for (const query of backfills) await tx.unsafe(query);
  });
  for (const row of await results(root)) {
    expect(row.statistics_scope).toBe('practice');
    expect(row.note).toBe('Keep this');
    expect(row.exclude).toBe(true);
    expect(row.updated_at.getTime()).toBeGreaterThan(new Date('2026-01-01').getTime());
    expect(row.other_data.crossfire.practice).toEqual({
      seriesId: createHash('sha256')
        .update(provenance.sourceGameId + ':' + provenance.position)
        .digest('hex'),
    });
  }
});

test('sideboarding forfeit records the actual match winner without adding fictional games', async () => {
  const root = await start();
  await finish(root, 'p2');
  await exits.leave(principal(a), root);
  const rows = await results(root);
  expect(rows).toHaveLength(2);
  expect(rows.find(r => r.user_id === a.userId)!.other_data.crossfire.match).toMatchObject({
    status: 'complete',
    outcome: 'loss',
    reason: 'forfeit',
    wins: 1,
    losses: 0,
  });
});

test('an export failure leaves no partial player rows or receipt, and archived history can retry', async () => {
  const root = await start(1),
    history = await finish(root, 'p1', false, false);
  const name = `statistics_${randomUUID().replaceAll('-', '')}`;
  await sql.unsafe(`CREATE FUNCTION play.${name}() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = '${history.gameId}' AND NEW.statistics_at IS NOT NULL THEN RAISE EXCEPTION 'injected statistics failure'; END IF; RETURN NEW; END $$`);
  await sql.unsafe(
    `CREATE TRIGGER ${name} BEFORE UPDATE ON play.games FOR EACH ROW EXECUTE FUNCTION play.${name}()`,
  );
  try {
    await expect(publishStatistics(sql, history)).rejects.toThrow('injected statistics failure');
    expect(await results(root)).toHaveLength(0);
    expect(
      (await sql`SELECT statistics_at FROM play.games WHERE id=${history.gameId}`)[0]!
        .statistics_at,
    ).toBeNull();
  } finally {
    await sql.unsafe(`DROP TRIGGER ${name} ON play.games`);
    await sql.unsafe(`DROP FUNCTION play.${name}()`);
  }
  await publishStatistics(sql, await store.readHistory(history.gameId));
  expect(await results(root)).toHaveLength(2);
});
