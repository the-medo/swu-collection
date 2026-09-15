import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { encodeState } from '../engine/checkpoint.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { verifyHistory } from '../history/records.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { historyFixture } from '../testing/history-fixture.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url)
  throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to the isolated migrated worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Crossfire history tests require a local worktree database');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const store = new PostgresGameStore(sql),
  games: string[] = [];
async function seed() {
  const gameId = `archive-test-${randomUUID()}`;
  games.push(gameId);
  const game = historyFixture(gameId);
  game.choose('pass');
  game.undo(0);
  game.choose('take-initiative');
  game.finish();
  await store.create(game.history.checkpoint.checkpoint);
  const lease = (await store.claim(gameId, 'archive-test', 60_000))!;
  for (const record of game.history.journal) {
    const { sequence, ...entry } = record;
    await store.append(lease, {
      ...entry,
      inputs: JSON.parse(JSON.stringify(entry.inputs)),
      facts: JSON.parse(JSON.stringify(entry.facts)),
      expectedSequence: sequence - 1,
      checkpoint: encodeState(game.positions.get(sequence)!.state),
      ...(sequence === game.history.sequence ? { summary: game.history.summary! } : {}),
    });
  }
  return { game, gameId, lease };
}
afterAll(async () => {
  await sql`DELETE FROM play.games WHERE id = ANY(${games})`;
  await sql.end();
});

test('racing finalizers publish one archive, preserve both branches and answer pre-compaction retries', async () => {
  const s = await seed();
  const history = await store.readHistory(s.gameId);
  expect(verifyHistory(history).state).toEqual(s.game.state);
  const archive = await encodeArchive(history);
  expect(
    (
      await Promise.all([
        store.publishArchive(s.gameId, archive),
        store.publishArchive(s.gameId, archive),
      ])
    ).sort(),
  ).toEqual([false, true]);
  const read = await store.readHistory(s.gameId);
  expect(verifyHistory(read).state).toEqual(s.game.state);
  expect(
    (await sql`SELECT count(*)::int AS count FROM play.checkpoints WHERE game_id = ${s.gameId}`)[0]!
      .count,
  ).toBe(0);
  expect(
    (
      await sql`SELECT count(*)::int AS count FROM play.journal_live WHERE game_id = ${s.gameId}`
    )[0]!.count,
  ).toBe(0);
  const original = history.journal[0]!;
  const receipt = await store.findReceipt(s.gameId, original.actorId, original.commandId);
  expect(receipt?.sequence).toBe(1);
  const host = await DurableGame.restore(store, s.lease, { checkpointEvery: 20, leaseMs: 60_000 });
  const retry = await host.submit(original.actorId, original.commandId, original.inputs[0]);
  expect(retry.duplicate).toBe(true);
  expect(retry.state).toEqual(s.game.state);
  expect(retry.receipt.sequence).toBe(1);
});

test('failed cleanup transaction retains checkpoints, live receipts and sealed state for retry', async () => {
  const s = await seed();
  const archive = await encodeArchive(await store.readHistory(s.gameId));
  await sql.unsafe(`CREATE FUNCTION play.test_reject_finalize() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = '${s.gameId}' AND NEW.status = 'finalized' THEN RAISE EXCEPTION 'injected finalize failure'; END IF; RETURN NEW; END $$`);
  try {
    await sql.unsafe(
      'CREATE TRIGGER test_reject_finalize BEFORE UPDATE ON play.games FOR EACH ROW EXECUTE FUNCTION play.test_reject_finalize()',
    );
    await expect(store.publishArchive(s.gameId, archive)).rejects.toThrow(
      'injected finalize failure',
    );
    expect(await store.archived(s.gameId)).toBeNull();
    expect((await store.load(s.gameId)).checkpoint.sequence).toBe(s.game.history.sequence);
    expect((await store.readHistory(s.gameId)).journal).toHaveLength(4);
  } finally {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_reject_finalize ON play.games');
    await sql.unsafe('DROP FUNCTION play.test_reject_finalize()');
  }
  expect(await store.publishArchive(s.gameId, archive)).toBe(true);
});

test('corrupted payload cannot delete source history and sealed games reject new writes', async () => {
  const s = await seed();
  const archive = await encodeArchive(await store.readHistory(s.gameId));
  await expect(
    store.publishArchive(s.gameId, { ...archive, payload: Buffer.from('corrupt') }),
  ).rejects.toThrow();
  expect((await store.readHistory(s.gameId)).journal).toHaveLength(4);
  const { sequence, ...entry } = s.game.history.journal[0]!;
  await expect(
    store.append(s.lease, {
      ...entry,
      inputs: JSON.parse(JSON.stringify(entry.inputs)),
      facts: JSON.parse(JSON.stringify(entry.facts)),
      commandId: 'new-after-end',
      timeline: undefined,
      expectedSequence: s.game.history.sequence,
    }),
  ).rejects.toThrow('sealed-game');
});

test('a fresh finalizer process discovers durable work and completes without an in-memory queue', async () => {
  const s = await seed();
  const child = Bun.spawn(
    [
      process.execPath,
      new URL('../history/finalizer-process.ts', import.meta.url).pathname,
      s.gameId,
    ],
    {
      env: { ...process.env, DATABASE_URL: url, CROSSFIRE_FINALIZER_CHILD: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stderr).text()).toBe('');
  expect((await store.archived(s.gameId))?.sequence).toBe(s.game.history.sequence);
  expect(verifyHistory(await store.readHistory(s.gameId)).state).toEqual(s.game.state);
});
