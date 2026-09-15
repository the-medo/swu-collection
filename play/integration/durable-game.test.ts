import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { DurableGame, initializeDurableGame } from '../host/durable-game.ts';
import { PostgresGameStore, stateDigest } from '../storage/postgres.ts';
import { continuationCases } from '../testing/continuations.ts';
import { choose, config } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to an isolated local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 3, onnotice: () => {} });
const store = new PostgresGameStore(sql);
const prefix = `actor-test-${randomUUID()}`;
const games: string[] = [];
const options = { checkpointEvery: 2, leaseMs: 60_000, maxQueue: 4 };
const cases = continuationCases();
function adapter() {
  return {
    load: store.load.bind(store),
    renew: store.renew.bind(store),
    append: store.append.bind(store),
    findReceipt: store.findReceipt.bind(store),
  };
}
async function seed(n = 0) {
  const fixture = structuredClone(cases[n]!);
  fixture.state.gameId = `${prefix}-${games.length}`;
  fixture.input.gameId = fixture.state.gameId;
  games.push(fixture.state.gameId);
  await store.create(encodeState(fixture.state));
  const lease = (await store.claim(fixture.state.gameId, randomUUID(), 60_000))!;
  if (fixture.input.type === 'random') throw new Error('Fixture must start at a player decision');
  return { fixture, lease, actor: fixture.input.playerId, command: randomUUID() };
}
afterAll(async () => {
  await sql`DELETE FROM play.games WHERE id = ANY(${games})`;
  await sql.end();
});

test('trusted initialization persists setup, then the first command records server shuffles', async () => {
  const gameId = `${prefix}-${games.length}`;
  games.push(gameId);
  await initializeDurableGame(store, config(gameId));
  const lease = (await store.claim(gameId, 'initializer', 60_000))!;
  const host = await DurableGame.restore(store, lease, options);
  expect(host.paused).toBe(false);
  expect(host.state.execution.random).toBeNull();
  expect(host.state.execution.decision?.kind).toBe('initiative');
  const input = choose(host.state, 'initiative');
  if (input.type !== 'decision') throw new Error('Expected initiative decision');
  const result = await host.submit(input.playerId, randomUUID(), input);
  expect(result.state.facts.filter(f => f.type === 'shuffled')).toHaveLength(2);
  expect((await store.load(gameId)).journal[0]!.inputs).toHaveLength(3);
});

test('a commit resolves server randomness atomically, then survives reload and duplicate retry', async () => {
  const s = await seed(1);
  const host = await DurableGame.restore(store, s.lease, options, () => 0);
  const result = await host.submit(s.actor, s.command, s.fixture.input);
  expect(result.duplicate).toBe(false);
  expect(result.state.execution.random).toBeNull();
  const stored = await store.load(s.lease.gameId);
  expect(stored.journal[0]!.inputs).toHaveLength(2);
  expect(stored.journal[0]!.facts.length).toBeGreaterThan(0);
  const restored = await DurableGame.restore(store, s.lease, options, () => {
    throw new Error('Must not redraw');
  });
  expect(restored.state).toEqual(result.state);
  const retry = await restored.submit(s.actor, s.command, s.fixture.input);
  expect(retry.duplicate).toBe(true);
  expect(retry.receipt).toEqual(result.receipt);
  expect(retry.state).toEqual(result.state);
});

test('a lost commit response pauses the actor; queued work cannot proceed until committed recovery', async () => {
  const s = await seed(1);
  let draws = 0;
  const broken = {
    ...adapter(),
    append: async (...args: Parameters<typeof store.append>) => {
      await store.append(...args);
      throw new Error('Lost commit response');
    },
  };
  const host = await DurableGame.restore(broken, s.lease, options, () => {
    draws++;
    return 0;
  });
  const first = host.submit(s.actor, s.command, s.fixture.input);
  const queued = host.submit(s.actor, randomUUID(), s.fixture.input);
  await expect(first).rejects.toThrow('Lost commit response');
  await expect(queued).rejects.toThrow('paused');
  expect(host.paused).toBe(true);
  expect(host.state).toEqual(s.fixture.state);
  expect((await store.load(s.lease.gameId)).sequence).toBe(1);
  const previousDraws = draws;
  await host.reload();
  expect(host.paused).toBe(false);
  const retry = await host.submit(s.actor, s.command, s.fixture.input);
  expect(retry.duplicate).toBe(true);
  expect(draws).toBe(previousDraws);
  expect((await store.load(s.lease.gameId)).sequence).toBe(1);
});

test('a failure before commit publishes no candidate and retry starts from the stored state', async () => {
  const s = await seed();
  let fail = true;
  const unreliable = {
    ...adapter(),
    append: (...args: Parameters<typeof store.append>) => {
      if (fail) return Promise.reject(new Error('Database unavailable'));
      return store.append(...args);
    },
  };
  const host = await DurableGame.restore(unreliable, s.lease, options);
  await expect(host.submit(s.actor, s.command, s.fixture.input)).rejects.toThrow(
    'Database unavailable',
  );
  expect(host.state).toEqual(s.fixture.state);
  expect(host.paused).toBe(true);
  expect((await store.load(s.lease.gameId)).sequence).toBe(0);
  fail = false;
  await host.reload();
  expect((await host.submit(s.actor, s.command, s.fixture.input)).receipt.sequence).toBe(1);
});

test('a held commit bounds its queue without blocking another game or exposing speculative state', async () => {
  const a = await seed();
  const b = await seed();
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const held = {
    ...adapter(),
    append: async (...args: Parameters<typeof store.append>) => {
      entered();
      await gate;
      return store.append(...args);
    },
  };
  const host = await DurableGame.restore(held, a.lease, { ...options, maxQueue: 1 });
  const other = await DurableGame.restore(store, b.lease, options);
  let acknowledged = false;
  const pending = host.submit(a.actor, a.command, a.fixture.input).then(result => {
    acknowledged = true;
    return result;
  });
  await started;
  try {
    expect(acknowledged).toBe(false);
    expect(host.state).toEqual(a.fixture.state);
    await expect(host.submit(a.actor, randomUUID(), a.fixture.input)).rejects.toThrow('queue full');
    expect((await other.submit(b.actor, b.command, b.fixture.input)).receipt.sequence).toBe(1);
  } finally {
    release();
  }
  expect((await pending).receipt.sequence).toBe(1);
});

test('seat spoofing, player randomness and conflicting retry content are rejected', async () => {
  const s = await seed();
  const host = await DurableGame.restore(store, s.lease, options);
  expect(() => host.submit('intruder', s.command, s.fixture.input)).toThrow('Illegal');
  expect(() =>
    host.submit(s.actor, s.command, {
      type: 'random',
      gameId: s.lease.gameId,
      expectedRevision: s.fixture.state.revision,
      requestId: 'r1',
      values: [0],
    }),
  ).toThrow('Illegal');
  await host.submit(s.actor, s.command, s.fixture.input);
  await expect(
    host.submit(s.actor, s.command, { ...s.fixture.input, expectedRevision: 999 }),
  ).rejects.toThrow('command-conflict');
  expect(host.paused).toBe(false);
  expect((await store.load(s.lease.gameId)).sequence).toBe(1);
});

test('checkpoint cadence and stale queued decisions use only the latest committed position', async () => {
  const s = await seed();
  const host = await DurableGame.restore(store, s.lease, { ...options, checkpointEvery: 1 });
  const first = host.submit(s.actor, s.command, s.fixture.input);
  const stale = host.submit(s.actor, randomUUID(), s.fixture.input);
  await first;
  await expect(stale).rejects.toThrow('Illegal');
  expect(host.paused).toBe(false);
  const stored = await store.load(s.lease.gameId);
  expect(stored.checkpoint.sequence).toBe(1);
  expect(stored.journal).toHaveLength(0);
  expect(decodeState(stored.checkpoint.checkpoint)).toEqual(host.state);
});

test('a replacement owner fences the displaced actor and older pins cannot enter the current host', async () => {
  const s = await seed();
  const host = await DurableGame.restore(store, s.lease, options);
  await store.release(s.lease);
  const replacement = (await store.claim(s.lease.gameId, 'next-owner', 60_000))!;
  await expect(host.submit(s.actor, s.command, s.fixture.input)).rejects.toThrow('owner-lost');
  expect(host.paused).toBe(true);
  const oldBundle = {
    ...adapter(),
    load: async (id: string) => {
      const stored = await store.load(id);
      stored.versions.engine = 'crossfire-older';
      return stored;
    },
  };
  await expect(DurableGame.restore(oldBundle, replacement, options)).rejects.toThrow('integrity');
});

test('a duplicate commit discovered during append restores the committed random outcome', async () => {
  const s = await seed(1);
  let expected = s.fixture.state;
  const race = {
    ...adapter(),
    append: async (
      lease: Parameters<typeof store.append>[0],
      entry: Parameters<typeof store.append>[1],
    ) => {
      const inputs = structuredClone(entry.inputs);
      // Model a committed retry that used different, valid server random draws.
      const random = inputs[1] as { values: number[] };
      expected = advance(s.fixture.state, inputs[0]).state;
      random.values = expected.execution.random!.bounds.map(n => n - 1);
      const a = advance(s.fixture.state, inputs[0]);
      const b = advance(a.state, inputs[1]);
      expected = b.state;
      await store.append(lease, {
        ...entry,
        inputs,
        facts: JSON.parse(JSON.stringify([...a.facts, ...b.facts])),
        stateHash: stateDigest(encodeState(expected)),
      });
      return store.append(lease, entry);
    },
  };
  const host = await DurableGame.restore(race, s.lease, options, () => 0);
  const result = await host.submit(s.actor, s.command, s.fixture.input);
  expect(result.duplicate).toBe(true);
  expect(result.state).toEqual(expected);
  expect(host.state).toEqual(expected);
});

for (const crashAt of ['before-commit', 'after-commit-before-ack']) {
  test(`process death ${crashAt} resumes only committed progress under a new owner`, async () => {
    const s = await seed(1);
    const child = Bun.spawn(
      [
        process.execPath,
        new URL('../testing/fixtures/crash-durable-game.ts', import.meta.url).pathname,
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
        lease: s.lease,
        input: s.fixture.input,
        actor: s.actor,
        command: s.command,
        crashAt,
      }),
    );
    child.stdin.end();
    const reader = child.stdout.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Crash fixture timed out')), 4000);
        }),
      ]);
      expect(new TextDecoder().decode(chunk.value).trim()).toBe(crashAt);
    } finally {
      clearTimeout(timer);
      child.kill('SIGKILL');
      await child.exited;
      reader.releaseLock();
    }
    expect(await new Response(child.stderr).text()).toBe('');
    await Bun.sleep(350);
    const replacement = (await store.claim(s.lease.gameId, 'after-process-death', 60_000))!;
    expect(replacement.fence).toBeGreaterThan(s.lease.fence);
    const host = await DurableGame.restore(store, replacement, options);
    const committed = crashAt !== 'before-commit';
    expect((await store.load(s.lease.gameId)).sequence).toBe(committed ? 1 : 0);
    if (!committed) expect(host.state).toEqual(s.fixture.state);
    const retry = await host.submit(s.actor, s.command, s.fixture.input);
    expect(retry.duplicate).toBe(committed);
    expect(retry.receipt.sequence).toBe(1);
    expect((await store.load(s.lease.gameId)).sequence).toBe(1);
  });
}

test('a completed game receives a durable terminal checkpoint and a stable concession receipt', async () => {
  const s = await seed();
  const host = await DurableGame.restore(store, s.lease, { ...options, checkpointEvery: 100 });
  const input = {
    type: 'concede',
    gameId: s.lease.gameId,
    playerId: 'alice',
    expectedRevision: host.state.revision,
  };
  const result = await host.submit('alice', s.command, input);
  expect(result.state.result).toEqual({ winner: 'bob', reason: 'concession' });
  const stored = await store.load(s.lease.gameId);
  expect(stored.checkpoint.sequence).toBe(1);
  expect(stored.journal).toHaveLength(0);
  const restored = await DurableGame.restore(store, s.lease, options);
  const retry = await restored.submit('alice', s.command, input);
  expect(retry.duplicate).toBe(true);
  expect(retry.state.result).toEqual(result.state.result);
});
