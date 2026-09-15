import { CrossfireExits } from '../../server/lib/crossfire/exits.ts';
import { CrossfireHistory } from '../../server/lib/crossfire/history.ts';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { GameWorker } from '../worker/games.ts';
import { versions } from '../engine/model.ts';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { ids } from '../testing/helpers.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Local worktree DB required');
const sql = postgres(url, { max: 6, onnotice: () => {} });
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog),
  matches = new CrossfireMatches(sql, catalog),
  store = new PostgresGameStore(sql);
const users = [0, 1, 2].map(n => ({
  userId: `exit-test-${randomUUID()}-${n}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b, c] = users as [(typeof users)[number], (typeof users)[number], (typeof users)[number]];
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: false };
const main: { cardId: string; quantity: number }[] = [{ cardId: ids.marine, quantity: 12 }];
const side = 'open-fire';
beforeAll(async () => {
  for (const p of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${p.userId},'Synthetic exit',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES (${p.sessionId},${randomUUID()},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,format,leader_card_id_1,base_card_id) VALUES (${p.deckId},${p.userId},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${p.deckId},${ids.marine},1,12),(${p.deckId},${side},2,2)`;
  }
});
afterAll(async () => {
  const rows =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${rows.map(r => r.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${users.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${users.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${users.map(p => p.userId)})`;
  await sql.end();
});
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
async function start(bestOf: 1 | 3 = 3) {
  const lobby = await lobbies.create(principal(a), a.deckId, policy, bestOf);
  if (bestOf === 3)
    await expect(lobbies.join(principal(b), lobby.id, b.deckId, policy, 1)).rejects.toThrow(
      'policy-mismatch',
    );
  await lobbies.join(principal(b), lobby.id, b.deckId, policy, bestOf);
  return lobby.id;
}
async function finish(lobbyId: string, loser: 'p1' | 'p2') {
  const lobby = (await lobbies.get(principal(a), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, 'match-tests', 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  await host.submit(loser, randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: loser,
    expectedRevision: host.state.revision,
  });
  expect((await matches.get(principal(a), lobbyId))!.status).toBe('finishing');
  await store.publishArchive(
    lobby.gameId!,
    await encodeArchive(await store.readHistory(lobby.gameId!)),
  );
  await store.release(lease);
}
const ready = (mainboard = main) => ({ kind: 'next' as const, ready: true, mainboard });

const exits = new CrossfireExits(sql);
test('an authenticated exit survives worker absence, forfeits a BO3 and keeps its replay', async () => {
  const id = await start();
  await expect(exits.leave(principal(c), id)).rejects.toThrow('unavailable');
  await expect(exits.leave({ ...principal(a), sessionId: randomUUID() }, id)).rejects.toThrow(
    'unauthenticated',
  );
  const requests = await Promise.all([
    exits.leave(principal(a), id),
    exits.leave(principal(b), id),
  ]);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]!.status).toBe('pending');
  const seat = requests[0]!.seat,
    winner = seat === 'p1' ? 'p2' : 'p1';
  expect((await matches.get(principal(a), id))!.status).toBe('finishing');
  await expect(matches.ready(principal(a), id, ready())).rejects.toThrow('conflict');
  const lobby = (await lobbies.get(principal(a), id))!;
  const worker = new GameWorker(store);
  try {
    const binding = await worker.acquire(lobby.gameId!);
    try {
      await binding.run(async host => {
        await expect(
          host.submit(winner, randomUUID(), {
            type: 'concede',
            gameId: lobby.gameId!,
            playerId: winner,
            expectedRevision: host.state.revision,
          }),
        ).rejects.toThrow('exit-pending');
        expect(host.paused).toBe(false);
      });
    } finally {
      binding.release();
    }
    // A previously requested undo must never trap either player in the game.
    await sql`INSERT INTO play.undo_requests(id, game_id, requester, sequence, state_hash, target, target_hash, expires_at)
      VALUES (${randomUUID()}, ${lobby.gameId!}, ${winner}, 1, ${'a'.repeat(64)}, 0, ${'b'.repeat(64)}, now() + interval '1 minute')`;
    let faults = 0;
    expect(
      await new CrossfireExits(sql).process(worker, () => {
        faults++;
      }),
    ).toEqual([lobby.gameId!]);
    expect(faults).toBe(0);
    expect(
      (await sql`SELECT status FROM play.undo_requests WHERE game_id = ${lobby.gameId!}`)[0]!
        .status,
    ).toBe('expired');
    expect(await exits.process(worker)).toEqual([]);
    const match = (await matches.get(principal(a), id))!;
    expect(match.status).toBe('complete');
    expect(match.exit).toEqual({ status: 'forfeit', seat });
    expect(match.games).toHaveLength(1); // No invented 2–0 game results.
    const history = await store.readHistory(lobby.gameId!);
    expect(history.journal.at(-1)!.inputs[0]).toMatchObject({ type: 'concede', playerId: seat });
    expect(history.summary?.result).toMatchObject({ winner, reason: 'concession' });
    await store.publishArchive(lobby.gameId!, await encodeArchive(history));
    expect((await store.readHistory(lobby.gameId!)).journal).toHaveLength(history.journal.length);
    for (const p of [a, b])
      expect(
        (await new CrossfireHistory(sql).list(principal(p), undefined, 'running')).data.some(
          g => g.lobbyId === id,
        ),
      ).toBe(false);
    expect(await exits.leave(principal(b), id)).toEqual({ status: 'forfeit', seat });
  } finally {
    await worker.stop();
  }
});
test('an incompatible game is sealed without decoding or changing its journal and fences a former host', async () => {
  const id = await start(1);
  const lobby = (await lobbies.get(principal(a), id))!;
  const lease = (await store.claim(lobby.gameId!, 'obsolete-owner', 60_000))!;
  const before = await sql`SELECT state_hash, sequence FROM play.games WHERE id = ${lobby.gameId!}`;
  const checkpoints =
    await sql`SELECT checkpoint FROM play.checkpoints WHERE game_id = ${lobby.gameId!}`;
  await sql`UPDATE play.games SET versions = ${sql.json({ ...versions, engine: 'obsolete' })} WHERE id = ${lobby.gameId!}`;
  expect((await lobbies.get(principal(a), id))!.compatible).toBe(false);
  const connection = new CrossfireConnections(sql, 'http://localhost:5174');
  expect(await exits.leave(principal(a), id)).toEqual({ status: 'abandoned', seat: 'p1' });
  expect(await exits.leave(principal(b), id)).toEqual({ status: 'abandoned', seat: 'p1' });
  await expect(store.renew(lease, 60_000)).rejects.toThrow('owner-lost');
  expect(await store.claim(lobby.gameId!, 'new-owner', 60_000)).toBeNull();
  expect([
    ...(await sql`SELECT state_hash, sequence FROM play.games WHERE id = ${lobby.gameId!}`),
  ]).toEqual([...before]);
  expect([
    ...(await sql`SELECT checkpoint FROM play.checkpoints WHERE game_id = ${lobby.gameId!}`),
  ]).toEqual([...checkpoints]);
  for (const p of [a, b]) {
    const all = (await new CrossfireHistory(sql).list(principal(p))).data.find(
      g => g.lobbyId === id,
    )!;
    expect(all.status).toBe('abandoned');
    expect(all.result).toBeNull();
    expect(all.exit?.status).toBe('abandoned');
    await expect(
      connection.issue(principal(p), id, 'player', 'http://localhost:5174'),
    ).rejects.toThrow('closed');
  }
});
test('leaving during sideboarding forfeits the match without rewriting the finished game', async () => {
  const id = await start();
  await finish(id, 'p2');
  expect(await exits.leave(principal(a), id)).toEqual({ status: 'forfeit', seat: 'p1' });
  const match = (await matches.get(principal(a), id))!;
  expect(match.status).toBe('complete');
  expect(match.score).toEqual({ p1: 1, p2: 0 });
  expect(match.exit?.seat).toBe('p1');
  await expect(matches.ready(principal(b), id, ready())).rejects.toThrow('conflict');
});
test('leaving a naturally completed game is a no-op', async () => {
  const id = await start(1);
  await finish(id, 'p2');
  expect(await exits.leave(principal(a), id)).toBeNull();
  expect((await matches.get(principal(a), id))!.exit).toBeNull();
});
test('a version deployment after an accepted exit still closes the obsolete game', async () => {
  const id = await start(1),
    lobby = (await lobbies.get(principal(a), id))!;
  await exits.leave(principal(a), id);
  await sql`UPDATE play.games SET versions = ${sql.json({ ...versions, engine: 'obsolete' })} WHERE id = ${lobby.gameId!}`;
  const worker = new GameWorker(store);
  try {
    await exits.process(worker);
  } finally {
    await worker.stop();
  }
  expect((await lobbies.get(principal(a), id))!.exit?.status).toBe('abandoned');
});

test('a pre-match-tracking game can be abandoned without reconstructing its old state', async () => {
  const id = await start(1),
    lobby = (await lobbies.get(principal(a), id))!;
  await sql`DELETE FROM play.matches WHERE id = ${id}`;
  await sql`UPDATE play.games SET versions = ${sql.json({ ...versions, engine: 'obsolete' })} WHERE id = ${lobby.gameId!}`;
  await expect(exits.leave(principal(c), id)).rejects.toThrow('unavailable');
  expect(await sql`SELECT id FROM play.matches WHERE id = ${id}`).toHaveLength(0);
  const results = await Promise.all([exits.leave(principal(a), id), exits.leave(principal(b), id)]);
  expect(results[0]).toEqual(results[1]);
  expect(results[0]!.status).toBe('abandoned');
  expect((await lobbies.get(principal(a), id))!.exit?.status).toBe('abandoned');
});
