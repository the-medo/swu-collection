import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { advance, createGame } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { versions } from '../engine/model.ts';
import { PostgresGameStore, stateDigest } from '../storage/postgres.ts';
import type { Append } from '../storage/postgres.ts';
import { recoverGame } from '../storage/recover.ts';
import { continuationCases } from '../testing/continuations.ts';
import type { RetainedEngine } from '../host/bundles.ts';
import { DurableGame, initializeDurableGame } from '../host/durable-game.ts';
import { choose, config } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url)
  throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to the isolated migrated worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Crossfire integration tests require an explicit local worktree database');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const store = new PostgresGameStore(sql);
const prefix = `storage-test-${randomUUID()}`;
const games: string[] = [];
const runtime: RetainedEngine = {
  versions,
  createGame: config => createGame(config as Parameters<typeof createGame>[0]),
  decodeState,
  encodeState: state => encodeState(state as ReturnType<typeof decodeState>),
  advance: (state, input) => advance(state as ReturnType<typeof decodeState>, input),
};
const cases = continuationCases();
async function seed(n = 0) {
  const fixture = structuredClone(cases[n]!);
  fixture.state.gameId = `${prefix}-${games.length}`;
  // Exploit retains a validated pre-payment position in its continuation.
  if (fixture.state.playPayment) {
    const rollback = JSON.parse(fixture.state.playPayment.rollback);
    rollback.gameId = fixture.state.gameId;
    fixture.state.playPayment.rollback = JSON.stringify(rollback);
  }
  fixture.input.gameId = fixture.state.gameId;
  games.push(fixture.state.gameId);
  await store.create(encodeState(fixture.state));
  const lease = (await store.claim(fixture.state.gameId, randomUUID(), 60_000))!;
  const result = advance(fixture.state, fixture.input);
  const checkpoint = encodeState(result.state);
  const entry: Append = {
    actorId: 'alice',
    commandId: randomUUID(),
    requestHash: stateDigest(JSON.stringify(fixture.input)),
    expectedSequence: 0,
    fromRevision: fixture.state.revision,
    revision: result.state.revision,
    stateHash: stateDigest(checkpoint),
    inputs: JSON.parse(JSON.stringify([fixture.input])),
    facts: JSON.parse(JSON.stringify(result.facts)),
  };
  return { fixture, lease, result, entry, checkpoint };
}
afterAll(async () => {
  await sql`DELETE FROM play.games WHERE id = ANY(${games})`;
  await sql.end();
});

test('all complex suspensions recover from a durable checkpoint plus journal and preserve private facts', async () => {
  for (let n = 0; n < cases.length; n++) {
    const s = await seed(n);
    const receipt = await store.append(s.lease, s.entry);
    expect(receipt.sequence).toBe(1);
    const stored = await store.load(s.lease.gameId);
    expect(stored.checkpoint.sequence).toBe(0);
    expect(stored.journal).toHaveLength(1);
    expect(recoverGame(runtime, stored)).toEqual(s.result.state);
    const bad = structuredClone(stored);
    bad.journal[0]!.stateHash = '0'.repeat(64);
    expect(() => recoverGame(runtime, bad)).toThrow('integrity');
    const missing = structuredClone(stored);
    missing.journal = [];
    expect(() => recoverGame(runtime, missing)).toThrow('integrity');
    const wrong = { ...runtime, versions: { ...versions, engine: 'unsupported' } };
    expect(() => recoverGame(wrong, stored)).toThrow('integrity');
  }
}, 60_000);

test('an atomic checkpoint can advance recovery while prior command receipts remain available', async () => {
  const s = await seed();
  const committed = await store.append(s.lease, { ...s.entry, checkpoint: s.checkpoint });
  const stored = await store.load(s.lease.gameId);
  expect(stored.checkpoint.sequence).toBe(1);
  expect(stored.journal).toHaveLength(0);
  expect(recoverGame(runtime, stored)).toEqual(s.result.state);
  expect(await store.findReceipt(s.lease.gameId, s.entry.actorId, s.entry.commandId)).toEqual({
    sequence: committed.sequence,
    revision: committed.revision,
    requestHash: committed.requestHash,
  });
  expect(await store.findReceipt(s.lease.gameId, 'bob', s.entry.commandId)).toBeNull();
});

test('concurrent duplicate submissions and a lost acknowledgment have one durable outcome', async () => {
  const s = await seed();
  const results = await Promise.all([
    store.append(s.lease, s.entry),
    store.append(s.lease, s.entry),
  ]);
  expect(results.map(r => r.duplicate).sort()).toEqual([false, true]);
  expect(results[0]!.sequence).toBe(results[1]!.sequence);
  await store.release(s.lease);
  const replacement = (await store.claim(s.lease.gameId, 'replacement', 60_000))!;
  expect(await store.append(replacement, s.entry)).toEqual({ ...results[0]!, duplicate: true });
  await expect(
    store.append(replacement, { ...s.entry, requestHash: 'f'.repeat(64) }),
  ).rejects.toThrow('command-conflict');
  expect((await store.load(s.lease.gameId)).journal).toHaveLength(1);
});

test('checkpoint replacement keeps initial and latest, and failed replacement restores the previous checkpoint', async () => {
  const gameId = `${prefix}-${games.length}`;
  games.push(gameId);
  await initializeDurableGame(store, config(gameId));
  const lease = (await store.claim(gameId, 'checkpoint-owner', 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 1, leaseMs: 60_000 });
  const first = choose(host.state, 'initiative');
  if (first.type !== 'decision') throw new Error('Expected decision');
  const commandId = randomUUID();
  await host.submit(first.playerId, commandId, first);
  const previous = host.state;
  const next = choose(previous, i => i.kind === 'mulligan' && !i.take);
  if (next.type !== 'decision') throw new Error('Expected decision');
  await sql.unsafe(`CREATE FUNCTION play.test_reject_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = '${gameId}' AND NEW.sequence > OLD.sequence THEN
      RAISE EXCEPTION 'injected replacement failure'; END IF; RETURN NEW; END $$`);
  try {
    await sql.unsafe(
      'CREATE TRIGGER test_reject_checkpoint BEFORE UPDATE ON play.games FOR EACH ROW EXECUTE FUNCTION play.test_reject_checkpoint()',
    );
    await expect(host.submit(next.playerId, 'replace', next)).rejects.toThrow(
      'injected replacement failure',
    );
    expect(
      (
        await sql`SELECT sequence FROM play.checkpoints WHERE game_id = ${gameId} ORDER BY sequence`
      ).map(r => r.sequence),
    ).toEqual([0, 1]);
    expect(recoverGame(runtime, await store.load(gameId))).toEqual(previous);
    expect(await store.findReceipt(gameId, next.playerId, 'replace')).toBeNull();
  } finally {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_reject_checkpoint ON play.games');
    await sql.unsafe('DROP FUNCTION play.test_reject_checkpoint()');
  }
  await host.reload();
  await host.submit(next.playerId, 'replace', next);
  expect(
    (
      await sql`SELECT sequence FROM play.checkpoints WHERE game_id = ${gameId} ORDER BY sequence`
    ).map(r => r.sequence),
  ).toEqual([0, 2]);
  expect(recoverGame(runtime, await store.load(gameId))).toEqual(host.state);
  expect((await store.findReceipt(gameId, first.playerId, commandId))?.sequence).toBe(1);
  expect(
    (await sql`SELECT count(*)::int AS count FROM play.journal_live WHERE game_id = ${gameId}`)[0]!
      .count,
  ).toBe(2);
});

test('one of two distinct commands from the same revision commits; the other is stale', async () => {
  const s = await seed();
  const results = await Promise.allSettled([
    store.append(s.lease, s.entry),
    store.append(s.lease, { ...s.entry, commandId: randomUUID() }),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
  expect(rejected.reason.message).toContain('stale-state');
  expect((await store.load(s.lease.gameId)).sequence).toBe(1);
});

test('lease races fence old owners, expired renewal and stale release cannot reclaim ownership', async () => {
  const s = await seed();
  await store.release(s.lease);
  const claims = await Promise.all([
    store.claim(s.lease.gameId, 'first', 60_000),
    store.claim(s.lease.gameId, 'second', 60_000),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  const winner = claims.find(Boolean)!;
  await expect(store.append(s.lease, s.entry)).rejects.toThrow('owner-lost');
  await store.renew(winner, 10);
  await Bun.sleep(30);
  await expect(store.renew(winner, 60_000)).rejects.toThrow('owner-lost');
  const next = (await store.claim(s.lease.gameId, 'third', 60_000))!;
  expect(next.fence).toBeGreaterThan(winner.fence);
  await store.release(winner);
  await store.renew(next, 60_000);
  await expect(store.append(winner, s.entry)).rejects.toThrow('owner-lost');
  expect((await store.append(next, s.entry)).sequence).toBe(1);
});

test('a database failure after journal insertion rolls back history, receipt, checkpoint and head', async () => {
  const s = await seed();
  // Test-only trigger on the exact fixture game. Always remove it, even on failure.
  await sql.unsafe(`CREATE FUNCTION play.test_reject_commit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = '${s.lease.gameId}' AND NEW.sequence > OLD.sequence THEN
      RAISE EXCEPTION 'injected commit failure'; END IF; RETURN NEW; END $$`);
  try {
    await sql.unsafe(
      'CREATE TRIGGER test_reject_commit BEFORE UPDATE ON play.games FOR EACH ROW EXECUTE FUNCTION play.test_reject_commit()',
    );
    await expect(store.append(s.lease, { ...s.entry, checkpoint: s.checkpoint })).rejects.toThrow(
      'injected commit failure',
    );
    const stored = await store.load(s.lease.gameId);
    expect(stored.sequence).toBe(0);
    expect(stored.checkpoint.sequence).toBe(0);
    expect(stored.journal).toHaveLength(0);
    expect(await store.findReceipt(s.lease.gameId, s.entry.actorId, s.entry.commandId)).toBeNull();
    expect(recoverGame(runtime, stored)).toEqual(s.fixture.state);
  } finally {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_reject_commit ON play.games');
    await sql.unsafe('DROP FUNCTION play.test_reject_commit()');
  }
  expect((await store.append(s.lease, s.entry)).sequence).toBe(1);
});

test('a different game cannot consume another game checkpoint or lease', async () => {
  const a = await seed();
  const b = await seed();
  await expect(store.append(a.lease, { ...a.entry, checkpoint: b.checkpoint })).rejects.toThrow(
    'invalid-checkpoint',
  );
  expect((await store.load(a.lease.gameId)).sequence).toBe(0);
  expect((await store.load(b.lease.gameId)).sequence).toBe(0);
});

test('fresh process reads the database and resumes using its retained executable', async () => {
  const s = await seed(4);
  await store.append(s.lease, s.entry);
  const child = Bun.spawn(
    [
      process.execPath,
      new URL('../testing/fixtures/recover-database.ts', import.meta.url).pathname,
    ],
    {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, CROSSFIRE_TEST_DATABASE_URL: url },
    },
  );
  child.stdin.write(
    JSON.stringify({
      gameId: s.lease.gameId,
      directory: new URL('../../.swubase/crossfire-bundles', import.meta.url).pathname,
    }),
  );
  child.stdin.end();
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect(error).toBe('');
  expect(code).toBe(0);
  expect(output.trim()).toBe(stateDigest(s.checkpoint));
});

test('contributor sanitization empties current and future gameplay tables while preserving DDL', async () => {
  const s = await seed();
  await store.append(s.lease, s.entry);
  const source = await Bun.file(
    new URL('../../scripts/remote-dev/sql/000-crossfire.sql', import.meta.url),
  ).text();
  // Execute its actual body inside a transaction rolled back after assertions.
  const body = source.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
  const rollback = new Error('test rollback');
  try {
    await sql.begin(async tx => {
      await tx.unsafe('CREATE TABLE play.test_future_private (secret text)');
      await tx`INSERT INTO play.test_future_private VALUES ('private fixture')`;
      await tx`INSERT INTO public.application_configuration(key,value) VALUES ('crossfire_card_bundle_version','sanitizer-fixture') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`;
      await tx.unsafe(body);
      expect(
        await tx`SELECT key FROM public.application_configuration WHERE key='crossfire_card_bundle_version'`,
      ).toHaveLength(0);
      for (const table of [
        'games',
        'journal_live',
        'journal_history',
        'checkpoints',
        'test_future_private',
      ]) {
        const [row] = await tx.unsafe(`SELECT count(*)::integer AS count FROM play.${table}`);
        expect(row!.count).toBe(0);
      }
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  expect((await store.load(s.lease.gameId)).sequence).toBe(1);
});
