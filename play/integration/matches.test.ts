import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { createGame, advance } from '../engine/advance.ts';
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
  userId: `match-test-${randomUUID()}-${n}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b, c] = users as [(typeof users)[number], (typeof users)[number], (typeof users)[number]];
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: false };
const main: { cardId: string; quantity: number }[] = [{ cardId: ids.marine, quantity: 12 }];
const side = 'open-fire';
beforeAll(async () => {
  for (const p of users) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${p.userId},'Synthetic match',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
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
test('best-of-three consent, private sideboards, races, score and rematches survive new service instances', async () => {
  const root = await start();
  expect(await matches.get(principal(c), root)).toBeNull();
  await expect(matches.ready(principal(c), root, ready())).rejects.toThrow('unavailable');
  await expect(matches.ready(principal(a), root, ready())).rejects.toThrow('conflict');
  await finish(root, 'p1');
  expect((await matches.get(principal(a), root))!.score).toEqual({ p1: 0, p2: 1 });
  for (const invalid of [
    [{ cardId: ids.marine, quantity: 13 }],
    [{ cardId: ids.marine, quantity: 11 }],
    [
      { cardId: ids.marine, quantity: 6 },
      { cardId: ids.marine, quantity: 6 },
    ],
    [
      { cardId: ids.marine, quantity: 10 },
      { cardId: 'unimplemented-fixture', quantity: 2 },
    ],
  ])
    await expect(matches.ready(principal(a), root, ready(invalid))).rejects.toThrow(
      'unsupported-deck',
    );
  const swapped = [
    { cardId: ids.marine, quantity: 10 },
    { cardId: side, quantity: 2 },
  ];
  await matches.ready(principal(a), root, ready(swapped));
  const other = (await new CrossfireMatches(sql, catalog).get(principal(b), root))!;
  expect(other.ready).toEqual({ p1: true, p2: false });
  expect(other.deck.mainboard).toEqual(main);
  expect((await matches.get(principal(a), root))!.deck.mainboard).toEqual(swapped);
  const responses = await Promise.all([
    matches.ready(principal(b), root, ready()),
    matches.ready(principal(b), root, ready()),
  ]);
  expect(responses[0]!.currentLobbyId).toBe(responses[1]!.currentLobbyId);
  const next = responses[0]!.currentLobbyId;
  expect(next).not.toBe(root);
  const nextLobby = (await lobbies.get(principal(a), next))!;
  const initial = decodeState((await store.load(nextLobby.gameId!)).checkpoint.checkpoint);
  expect(initial.execution.decision?.playerId).toBe('p1');
  expect(initial.execution.decision?.kind).toBe('initiative');
  expect(
    Object.values(initial.cards).filter(c => c.owner === 'p1' && c.cardId === side),
  ).toHaveLength(2);
  await expect(matches.ready(principal(a), root, ready())).rejects.toThrow('conflict');
  expect((await matches.ready(principal(a), root, ready(swapped))).currentLobbyId).toBe(next);
  await finish(next, 'p2');
  await Promise.all([
    matches.ready(principal(a), next, ready()),
    matches.ready(principal(b), next, ready()),
  ]);
  const third = (await matches.get(principal(a), root))!;
  expect(third.score).toEqual({ p1: 1, p2: 1 });
  expect(third.number).toBe(3);
  await finish(third.currentLobbyId, 'p2');
  const done = (await matches.get(principal(a), root))!;
  expect(done.status).toBe('complete');
  expect(done.score).toEqual({ p1: 2, p2: 1 });
  await expect(matches.ready(principal(a), done.currentLobbyId, ready())).rejects.toThrow(
    'conflict',
  );
  await matches.ready(principal(a), done.currentLobbyId, { kind: 'rematch', ready: true });
  expect((await matches.get(principal(b), root))!.rematchLobbyId).toBeNull();
  await matches.ready(principal(a), done.currentLobbyId, { kind: 'rematch', ready: false });
  expect((await matches.get(principal(b), root))!.rematchReady.p1).toBe(false);
  const fresh = await Promise.all([
    matches.ready(principal(a), done.currentLobbyId, { kind: 'rematch', ready: true }),
    matches.ready(principal(b), done.currentLobbyId, { kind: 'rematch', ready: true }),
  ]);
  const rematchId = fresh.find(r => r.rematchLobbyId)!.rematchLobbyId!;
  const rematch = (await matches.get(principal(a), rematchId))!;
  expect(rematch.score).toEqual({ p1: 0, p2: 0 });
  expect(rematch.bestOf).toBe(3);
  expect(rematch.deck.mainboard).toEqual(main);
  expect(
    (await matches.ready(principal(b), done.currentLobbyId, { kind: 'rematch', ready: true }))
      .rematchLobbyId,
  ).toBe(rematchId);
});
test('expired readiness cannot start a game; current sessions can approve again', async () => {
  const root = await start(1);
  await finish(root, 'p2');
  await matches.ready(principal(a), root, { kind: 'rematch', ready: true });
  await sql`UPDATE session SET expires_at=now()-interval '1 second' WHERE id=${a.sessionId}`;
  try {
    const r = await matches.ready(principal(b), root, { kind: 'rematch', ready: true });
    expect(r.rematchLobbyId).toBeNull();
    expect(r.rematchReady.p1).toBe(false);
  } finally {
    await sql`UPDATE session SET expires_at=now()+interval '1 hour' WHERE id=${a.sessionId}`;
  }
  expect(
    (await matches.ready(principal(a), root, { kind: 'rematch', ready: true })).rematchLobbyId,
  ).not.toBeNull();
});
test('draw keeps the previous chooser and does not increment the score', async () => {
  const root = await start();
  await finish(root, 'p2');
  // Match metadata fixture: draw interpretation is independent of card effects.
  const lobby = (await lobbies.get(principal(a), root))!;
  await sql`UPDATE play.games SET summary=${sql.json({ result: { winner: null, reason: 'bases-defeated' }, round: 1 })} WHERE id=${lobby.gameId!}`;
  const [previous] =
    await sql`SELECT initiative_chooser FROM play.match_games WHERE lobby_id=${root}`;
  await matches.ready(principal(a), root, ready());
  const next = await matches.ready(principal(b), root, ready());
  expect(next.score).toEqual({ p1: 0, p2: 0 });
  expect(next.status).toBe('playing');
  const nextLobby = (await lobbies.get(principal(a), next.currentLobbyId))!;
  expect(
    decodeState((await store.load(nextLobby.gameId!)).checkpoint.checkpoint).execution.decision!
      .playerId,
  ).toBe(previous!.initiative_chooser);
});
test('explicit initiative chooser resumes after serialization and normal setup stays random', () => {
  const config = {
    gameId: 'match-initiative',
    players: [
      { id: 'p1', leader: ids.leader, base: ids.base, deck: main },
      { id: 'p2', leader: ids.leader, base: ids.base, deck: main },
    ] as [
      { id: string; leader: string; base: string; deck: typeof main },
      { id: string; leader: string; base: string; deck: typeof main },
    ],
  };
  expect(createGame(config).execution.random).not.toBeNull();
  const state = createGame({ ...config, initiativeChooser: 'p2' }),
    decision = state.execution.decision!;
  expect(decision.playerId).toBe('p2');
  const input = {
    type: 'decision' as const,
    gameId: state.gameId,
    playerId: 'p2',
    expectedRevision: state.revision,
    decisionId: decision.id,
    optionId: decision.options[0]!.id,
  };
  expect(advance(decodeState(encodeState(state)), input)).toEqual(advance(state, input));
  expect(() => createGame({ ...config, initiativeChooser: 'p3' })).toThrow('initiative chooser');
});
