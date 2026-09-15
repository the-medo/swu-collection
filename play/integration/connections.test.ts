import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import type { Principal } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireConnections, requireConnection } from '../../server/lib/crossfire/connections.ts';
import {
  submitConnectedCommand,
  submitConnectedViewCommand,
} from '../../server/lib/crossfire/commands.ts';
import { Projector } from '../projection/projector.ts';
import { DurableGame } from '../host/durable-game.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { choose, ids } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 6, onnotice: () => {} });
const prefix = `connection-test-${randomUUID()}`;
const principals: Principal[] = [0, 1, 2].map(n => ({
  userId: `${prefix}-${n}`,
  sessionId: `${prefix}-session-${n}`,
}));
const a = principals[0]!,
  b = principals[1]!,
  spectator = principals[2]!;
const decks: string[] = [],
  lobbyIds: string[] = [];
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog);
const origin = 'http://localhost:5174';
const connections = new CrossfireConnections(sql, origin);
const store = new PostgresGameStore(sql);
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: true };
const hash = (ticket: string) => createHash('sha256').update(ticket).digest('hex');
async function session(principal: Principal) {
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${principal.sessionId}, ${randomUUID()}, now() + interval '1 hour', ${principal.userId}, now(), now())`;
}
beforeAll(async () => {
  for (const principal of principals) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role)
      VALUES (${principal.userId}, 'Synthetic connection fixture', ${principal.userId + '@invalid.local'}, false, now(), now(), ${principal.userId}, 'USD', 'crossfire')`;
    await session(principal);
    const deckId = randomUUID();
    decks.push(deckId);
    await sql`INSERT INTO deck (id, user_id, format, leader_card_id_1, base_card_id)
      VALUES (${deckId}, ${principal.userId}, 1, ${ids.leader}, ${ids.base})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${deckId}, ${ids.marine}, 1, 12)`;
  }
});
afterAll(async () => {
  const games =
    await sql`SELECT game_id FROM play.lobbies WHERE id = ANY(${lobbyIds}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbyIds})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${games.map(g => g.game_id)})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck WHERE id = ANY(${decks})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${principals.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${principals.map(p => p.userId)})`;
  await sql.end();
});
async function create(proposed = policy) {
  const lobby = await lobbies.create(a, decks[0]!, proposed);
  lobbyIds.push(lobby.id);
  return lobby;
}
async function start(proposed = policy) {
  const lobby = await create(proposed);
  return lobbies.join(b, lobby.id, decks[1]!, proposed);
}
async function connect(
  principal: Principal,
  lobbyId: string,
  role: 'player' | 'spectator' = 'player',
) {
  const issued = await connections.issue(principal, lobbyId, role, origin);
  return connections.redeem(issued.ticket, issued.gameId, origin);
}
async function hostFor(gameId: string, append = store.append.bind(store)) {
  const lease = (await store.claim(gameId, `${prefix}-worker`, 60_000))!;
  return DurableGame.restore(
    {
      load: store.load.bind(store),
      renew: store.renew.bind(store),
      findReceipt: store.findReceipt.bind(store),
      append,
    },
    lease,
    { checkpointEvery: 10, leaseMs: 60_000 },
  );
}

test('ticket stores only a hash, expires quickly, and redeems once for its authenticated seat', async () => {
  const lobby = await start();
  const issued = await connections.issue(a, lobby.id, 'player', origin);
  expect(issued.ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(Date.parse(issued.expiresAt) - Date.now()).toBeGreaterThan(20_000);
  expect(Date.parse(issued.expiresAt) - Date.now()).toBeLessThanOrEqual(30_000);
  const [row] =
    await sql`SELECT * FROM play.connection_tickets WHERE token_hash = ${hash(issued.ticket)}`;
  expect(row!.token_hash).toBe(hash(issued.ticket));
  expect(JSON.stringify(row)).not.toContain(issued.ticket);
  for (const secret of [a.userId, a.sessionId, decks[0]!, ids.marine])
    expect(JSON.stringify(issued)).not.toContain(secret);
  const grant = await connections.redeem(issued.ticket, issued.gameId, origin);
  expect(grant).toEqual({
    ...a,
    lobbyId: lobby.id,
    gameId: lobby.gameId!,
    role: 'player',
    purpose: 'live',
    seat: 'p1',
    connectionEpoch: 1,
  });
  await connections.revalidate(grant);
  await expect(connections.redeem(issued.ticket, issued.gameId, origin)).rejects.toThrow(
    'invalid-ticket',
  );
});

test('wrong or absent Origin and wrong game cannot consume a valid ticket', async () => {
  const lobby = await start();
  const issued = await connections.issue(a, lobby.id, 'player', origin);
  for (const invalidOrigin of [
    null,
    undefined,
    'null',
    'http://localhost:5173',
    origin + '.attacker.invalid',
    origin + '/',
  ]) {
    await expect(connections.issue(a, lobby.id, 'player', invalidOrigin)).rejects.toThrow('origin');
    await expect(connections.redeem(issued.ticket, issued.gameId, invalidOrigin)).rejects.toThrow(
      'origin',
    );
  }
  await expect(connections.redeem(issued.ticket, 'game-wrong', origin)).rejects.toThrow(
    'invalid-ticket',
  );
  await expect(connections.redeem('invalid', issued.gameId, origin)).rejects.toThrow(
    'invalid-ticket',
  );
  await expect(
    connections.redeem(randomUUID().replaceAll('-', '').padEnd(43, 'a'), issued.gameId, origin),
  ).rejects.toThrow('invalid-ticket');
  expect((await connections.redeem(issued.ticket, issued.gameId, origin)).seat).toBe('p1');
});

test('only started games admit tickets; outsiders cannot play and participants cannot gain spectator hands', async () => {
  const waiting = await create();
  await expect(connections.issue(a, waiting.id, 'player', origin)).rejects.toThrow('denied');
  const lobby = await start();
  await expect(connections.issue(spectator, lobby.id, 'player', origin)).rejects.toThrow('denied');
  for (const player of [a, b])
    await expect(connections.issue(player, lobby.id, 'spectator', origin)).rejects.toThrow(
      'denied',
    );
  const grant = await connect(spectator, lobby.id, 'spectator');
  expect(grant.role).toBe('spectator');
  expect(grant.seat).toBeNull();
  expect(grant.connectionEpoch).toBeNull();
  await connections.revalidate(grant);
  const closed = await start({ ...policy, allowSpectators: false, handsToSpectators: false });
  await expect(connections.issue(spectator, closed.id, 'spectator', origin)).rejects.toThrow(
    'denied',
  );
});

test('concurrent redemption succeeds once; concurrent reconnects increment one seat without deadlock', async () => {
  const lobby = await start();
  const issued = await connections.issue(a, lobby.id, 'player', origin);
  const attempts = await Promise.allSettled([
    connections.redeem(issued.ticket, issued.gameId, origin),
    connections.redeem(issued.ticket, issued.gameId, origin),
  ]);
  expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(
    (attempts.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.message,
  ).toContain('invalid-ticket');
  const opponent = await connect(b, lobby.id);
  const old = (
    attempts.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<
      Awaited<ReturnType<typeof connect>>
    >
  ).value;
  const issuedAgain = await Promise.all([
    connections.issue(a, lobby.id, 'player', origin),
    connections.issue(a, lobby.id, 'player', origin),
  ]);
  const replacements = await Promise.all(
    issuedAgain.map(t => connections.redeem(t.ticket, t.gameId, origin)),
  );
  expect(replacements.map(g => g.connectionEpoch).sort()).toEqual([2, 3]);
  const latest = replacements.find(g => g.connectionEpoch === 3)!;
  await connections.revalidate(latest);
  await connections.revalidate(opponent);
  await expect(connections.revalidate(old)).rejects.toThrow('revoked');
  await expect(
    connections.revalidate(replacements.find(g => g.connectionEpoch === 2)!),
  ).rejects.toThrow('revoked');
});

test('expired tickets are rejected; ticket expiry does not revoke an already accepted connection', async () => {
  const lobby = await start();
  const issued = await connections.issue(a, lobby.id, 'player', origin);
  await sql`UPDATE play.connection_tickets SET expires_at = now() - interval '1 second' WHERE token_hash = ${hash(issued.ticket)}`;
  await expect(connections.redeem(issued.ticket, issued.gameId, origin)).rejects.toThrow(
    'invalid-ticket',
  );
  const next = await connections.issue(a, lobby.id, 'player', origin);
  const grant = await connections.redeem(next.ticket, next.gameId, origin);
  await sql`UPDATE play.connection_tickets SET expires_at = now() - interval '1 second' WHERE token_hash = ${hash(next.ticket)}`;
  await connections.revalidate(grant);
  expect(await connections.pruneExpired(1)).toBe(1);
  await connections.pruneExpired();
  const rows =
    await sql`SELECT token_hash FROM play.connection_tickets WHERE token_hash IN (${hash(issued.ticket)}, ${hash(next.ticket)})`;
  expect(rows).toHaveLength(0);
  await connections.revalidate(grant);
});

test('live session mismatch, expiry, bans and sign-out revoke issue, redemption and accepted grants', async () => {
  const lobby = await start();
  await expect(
    connections.issue({ ...a, sessionId: b.sessionId }, lobby.id, 'player', origin),
  ).rejects.toThrow('unauthenticated');
  const grant = await connect(a, lobby.id);
  const pending = await connections.issue(a, lobby.id, 'player', origin);
  for (const denial of ['expired', 'banned', 'signed-out', 'role-revoked']) {
    if (denial === 'expired')
      await sql`UPDATE session SET expires_at = now() - interval '1 minute' WHERE id = ${a.sessionId}`;
    if (denial === 'banned') await sql`UPDATE "user" SET banned = true WHERE id = ${a.userId}`;
    if (denial === 'role-revoked')
      await sql`UPDATE "user" SET role = 'admin,moderator' WHERE id = ${a.userId}`;
    const expected = denial === 'role-revoked' ? 'forbidden' : 'unauthenticated';
    if (denial === 'signed-out') await sql`DELETE FROM session WHERE id = ${a.sessionId}`;
    try {
      await expect(connections.issue(a, lobby.id, 'player', origin)).rejects.toThrow(expected);
      await expect(connections.redeem(pending.ticket, pending.gameId, origin)).rejects.toThrow(
        expected,
      );
      await expect(connections.revalidate(grant)).rejects.toThrow(expected);
    } finally {
      if (denial === 'role-revoked')
        await sql`UPDATE "user" SET role = 'crossfire' WHERE id = ${a.userId}`;
      if (denial === 'expired')
        await sql`UPDATE session SET expires_at = now() + interval '1 hour' WHERE id = ${a.sessionId}`;
      if (denial === 'banned') await sql`UPDATE "user" SET banned = false WHERE id = ${a.userId}`;
      if (denial === 'signed-out') await session(a);
    }
  }
  // Failed redemption did not consume the pending token.
  expect((await connections.redeem(pending.ticket, pending.gameId, origin)).connectionEpoch).toBe(
    2,
  );
});

test('a newly signed-in session can reconnect its own seat after the admission session is deleted', async () => {
  const lobby = await start();
  const old = await connect(a, lobby.id);
  const fresh = { ...a, sessionId: `${prefix}-fresh-session` };
  await session(fresh);
  await sql`DELETE FROM session WHERE id = ${a.sessionId}`;
  try {
    const grant = await connect(fresh, lobby.id);
    expect(grant.seat).toBe('p1');
    expect(grant.sessionId).toBe(fresh.sessionId);
    await connections.revalidate(grant);
    await expect(connections.revalidate(old)).rejects.toThrow('unauthenticated');
  } finally {
    await session(a);
  }
});

test('spectator policy and current engine versions are checked again at redemption and revalidation', async () => {
  const lobby = await start();
  const viewer = await connect(spectator, lobby.id, 'spectator');
  const pending = await connections.issue(spectator, lobby.id, 'spectator', origin);
  await sql`UPDATE play.lobbies SET allow_spectators = false WHERE id = ${lobby.id}`;
  await expect(connections.redeem(pending.ticket, pending.gameId, origin)).rejects.toThrow(
    'denied',
  );
  await expect(connections.revalidate(viewer)).rejects.toThrow('denied');
  const player = await connect(a, lobby.id);
  await sql`UPDATE play.games SET versions = jsonb_set(versions, '{engine}', '"unavailable-development-engine"') WHERE id = ${lobby.gameId!}`;
  await expect(connections.revalidate(player)).rejects.toThrow('incompatible');
  await expect(connections.issue(b, lobby.id, 'player', origin)).rejects.toThrow('incompatible');
});

test('transactional authorization holds the seat until commit and rejects old queued work after reconnect', async () => {
  const lobby = await start();
  const old = await connect(a, lobby.id);
  const pending = await connections.issue(a, lobby.id, 'player', origin);
  const acquired = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const command = sql.begin(async tx => {
    await requireConnection(tx, old, true);
    acquired.resolve();
    await release.promise;
  });
  await acquired.promise;
  let replaced = false;
  const reconnect = connections.redeem(pending.ticket, pending.gameId, origin).then(grant => {
    replaced = true;
    return grant;
  });
  try {
    await Bun.sleep(50);
    expect(replaced).toBe(false);
  } finally {
    release.resolve();
  }
  await command;
  const current = await reconnect;
  await connections.revalidate(current);
  await expect(sql.begin(tx => requireConnection(tx, old, true))).rejects.toThrow('revoked');
});

test('connected commands commit under their seat and reject spectator, other-seat and other-game input', async () => {
  const lobby = await start();
  const host = await hostFor(lobby.gameId!);
  const input = choose(host.state, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected a player decision');
  const actor = input.playerId === 'p1' ? a : b;
  const grant = await connect(actor, lobby.id);
  const opponent = await connect(actor === a ? b : a, lobby.id);
  const viewer = await connect(spectator, lobby.id, 'spectator');
  const otherLobby = await start();
  const otherGame = await connect(actor, otherLobby.id);
  for (const denied of [opponent, viewer, otherGame])
    await expect(
      submitConnectedCommand(host, connections, denied, randomUUID(), input),
    ).rejects.toThrow('not-authorized');
  expect((await store.load(lobby.gameId!)).sequence).toBe(0);
  const commandId = randomUUID();
  const committed = await submitConnectedCommand(host, connections, grant, commandId, input);
  expect(committed.receipt.sequence).toBe(1);
  expect(committed.state.execution.random).toBeNull();
  expect((await store.load(lobby.gameId!)).journal[0]!.inputs).toHaveLength(3);
  const replacement = await connect(actor, lobby.id);
  await expect(submitConnectedCommand(host, connections, grant, commandId, input)).rejects.toThrow(
    'not-authorized',
  );
  const retried = await submitConnectedCommand(host, connections, replacement, commandId, input);
  expect(retried.duplicate).toBe(true);
  expect(retried.state).toEqual(committed.state);
  expect((await store.load(lobby.gameId!)).sequence).toBe(1);
  expect(host.paused).toBe(false);
});

test('reconnection after initial authorization rejects both speculative and queued commands without pausing the game', async () => {
  const lobby = await start();
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const host = await hostFor(lobby.gameId!, async (...args) => {
    entered.resolve();
    await release.promise;
    return store.append(...args);
  });
  const before = host.state;
  const input = choose(before, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected a player decision');
  const actor = input.playerId === 'p1' ? a : b;
  const old = await connect(actor, lobby.id);
  const outcomes = Promise.allSettled([
    submitConnectedCommand(host, connections, old, randomUUID(), input),
    submitConnectedCommand(host, connections, old, randomUUID(), input),
  ]);
  await entered.promise;
  const next = await connect(actor, lobby.id);
  release.resolve();
  const denied = await outcomes;
  expect(
    denied.every(r => r.status === 'rejected' && r.reason.message.includes('not-authorized')),
  ).toBe(true);
  expect(host.paused).toBe(false);
  expect(host.state).toEqual(before);
  expect((await store.load(lobby.gameId!)).sequence).toBe(0);
  expect(
    (await submitConnectedCommand(host, connections, next, randomUUID(), input)).receipt.sequence,
  ).toBe(1);
});

test('a ban between queue authorization and append rolls back the candidate and leaves other commands usable', async () => {
  const lobby = await start();
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const host = await hostFor(lobby.gameId!, async (...args) => {
    entered.resolve();
    await release.promise;
    return store.append(...args);
  });
  const before = host.state;
  const input = choose(before, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected a player decision');
  const actor = input.playerId === 'p1' ? a : b;
  const grant = await connect(actor, lobby.id);
  const pending = submitConnectedCommand(host, connections, grant, randomUUID(), input);
  const outcome = Promise.allSettled([pending]);
  await entered.promise;
  await sql`UPDATE "user" SET banned = true WHERE id = ${actor.userId}`;
  try {
    release.resolve();
    const [denied] = await outcome;
    expect(denied!.status).toBe('rejected');
    expect((denied as PromiseRejectedResult).reason.message).toContain('not-authorized');
    expect(host.state).toEqual(before);
    expect(host.paused).toBe(false);
    expect((await store.load(lobby.gameId!)).sequence).toBe(0);
  } finally {
    release.resolve();
    await sql`UPDATE "user" SET banned = false WHERE id = ${actor.userId}`;
  }
  expect(
    (await submitConnectedCommand(host, connections, grant, randomUUID(), input)).receipt.sequence,
  ).toBe(1);
});

test('role revocation between queue authorization and append rolls back the candidate and leaves other commands usable', async () => {
  const lobby = await start();
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const host = await hostFor(lobby.gameId!, async (...args) => {
    entered.resolve();
    await release.promise;
    return store.append(...args);
  });
  const before = host.state;
  const input = choose(before, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected a player decision');
  const actor = input.playerId === 'p1' ? a : b;
  const grant = await connect(actor, lobby.id);
  const pending = submitConnectedCommand(host, connections, grant, randomUUID(), input);
  const outcome = Promise.allSettled([pending]);
  await entered.promise;
  await sql`UPDATE "user" SET role = 'moderator' WHERE id = ${actor.userId}`;
  try {
    release.resolve();
    const [denied] = await outcome;
    expect(denied!.status).toBe('rejected');
    expect((denied as PromiseRejectedResult).reason.message).toContain('not-authorized');
    expect(host.state).toEqual(before);
    expect(host.paused).toBe(false);
    expect((await store.load(lobby.gameId!)).sequence).toBe(0);
  } finally {
    release.resolve();
    await sql`UPDATE "user" SET role = 'moderator,crossfire' WHERE id = ${actor.userId}`;
  }
  expect(
    (await submitConnectedCommand(host, connections, grant, randomUUID(), input)).receipt.sequence,
  ).toBe(1);
});

test('a session expiring while command authorization waits for a seat cannot commit', async () => {
  const lobby = await start();
  const host = await hostFor(lobby.gameId!);
  const input = choose(host.state, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected a player decision');
  const actor = input.playerId === 'p1' ? a : b;
  const grant = await connect(actor, lobby.id);
  const held = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const lock = sql.begin(async tx => {
    await tx`SELECT seat FROM play.participants WHERE lobby_id = ${lobby.id} AND user_id = ${actor.userId} FOR UPDATE`;
    held.resolve();
    await release.promise;
  });
  await held.promise;
  await sql`UPDATE session SET expires_at = clock_timestamp() + interval '200 milliseconds' WHERE id = ${actor.sessionId}`;
  const outcome = Promise.allSettled([
    submitConnectedCommand(host, connections, grant, randomUUID(), input),
  ]);
  try {
    await Bun.sleep(300);
    release.resolve();
    await lock;
    const [denied] = await outcome;
    expect(denied!.status).toBe('rejected');
    expect((denied as PromiseRejectedResult).reason.message).toContain('not-authorized');
    expect((await store.load(lobby.gameId!)).sequence).toBe(0);
    expect(host.paused).toBe(false);
  } finally {
    release.resolve();
    await sql`UPDATE session SET expires_at = now() + interval '1 hour' WHERE id = ${actor.sessionId}`;
  }
});

test('a committed opaque command retries after reconnect without resolving obsolete handles or shuffling twice', async () => {
  const lobby = await start(),
    host = await hostFor(lobby.gameId!);
  const seat = host.state.execution.decision!.playerId;
  const actor = seat === 'p1' ? a : b;
  const old = await connect(actor, lobby.id);
  const projector = new Projector(lobby.gameId!, { role: 'player', playerId: seat });
  const view = projector.project(host.state);
  const command = {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
  };
  const commandId = randomUUID();
  const committed = await submitConnectedViewCommand(
    host,
    connections,
    old,
    projector,
    commandId,
    command,
  );
  const replacement = await connect(actor, lobby.id);
  const fresh = new Projector(lobby.gameId!, { role: 'player', playerId: seat });
  expect(fresh.project(host.state).epoch).not.toBe(view.epoch);
  expect(() => fresh.command(host.state, command)).toThrow();
  await expect(
    submitConnectedViewCommand(host, connections, old, projector, commandId, command),
  ).rejects.toThrow('not-authorized');
  const retry = await submitConnectedViewCommand(
    host,
    connections,
    replacement,
    fresh,
    commandId,
    command,
  );
  expect(retry.duplicate).toBe(true);
  expect(retry.state).toEqual(committed.state);
  expect((await store.load(lobby.gameId!)).sequence).toBe(1);
  await expect(
    submitConnectedViewCommand(host, connections, replacement, fresh, commandId, {
      ...command,
      optionId: '0'.repeat(32),
    }),
  ).rejects.toThrow('command-conflict');
  // If the old command never committed, its handles cannot be reused.
  await expect(
    submitConnectedViewCommand(host, connections, replacement, fresh, randomUUID(), command),
  ).rejects.toThrow();
  expect(host.paused).toBe(false);
});

test('contributor sanitizer clears live tickets and account removal revokes them without deleting games', async () => {
  const lobby = await start();
  const pending = await connections.issue(spectator, lobby.id, 'spectator', origin);
  const source = await Bun.file(
    new URL('../../scripts/remote-dev/sql/000-crossfire.sql', import.meta.url),
  ).text();
  const rollback = new Error('rollback-fixture');
  try {
    await sql.begin(async tx => {
      await tx.unsafe(source.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
      const [row] = await tx`SELECT count(*)::integer AS count FROM play.connection_tickets`;
      expect(row!.count).toBe(0);
      await tx.unsafe('TRUNCATE public.session');
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  await sql`DELETE FROM deck_card WHERE deck_id = ${decks[2]!}`;
  await sql`DELETE FROM deck WHERE id = ${decks[2]!}`;
  await sql`DELETE FROM "user" WHERE id = ${spectator.userId}`;
  await expect(connections.redeem(pending.ticket, pending.gameId, origin)).rejects.toThrow(
    'invalid-ticket',
  );
  const [row] = await sql`SELECT id FROM play.games WHERE id = ${lobby.gameId!}`;
  expect(row!.id).toBe(lobby.gameId!);
});

test('replay tickets keep the live seat epoch and cannot authorize gameplay, even after a reconnect', async () => {
  const lobby = await start();
  const live = await connect(a, lobby.id);
  const ticket = await connections.issue(a, lobby.id, 'player', origin, 'replay');
  const replay = await connections.redeem(ticket.ticket, ticket.gameId, origin);
  expect(replay.purpose).toBe('replay');
  expect(replay.connectionEpoch).toBe(0);
  await connections.revalidate(live);
  await connect(a, lobby.id);
  await connections.revalidate(replay);
  const host = await hostFor(lobby.gameId!);
  const input = {
    type: 'concede',
    gameId: lobby.gameId!,
    expectedRevision: host.state.revision,
    playerId: 'p1',
  };
  await expect(
    submitConnectedCommand(host, connections, replay, randomUUID(), input),
  ).rejects.toThrow('not-authorized');
  expect((await store.load(lobby.gameId!)).sequence).toBe(0);
});
