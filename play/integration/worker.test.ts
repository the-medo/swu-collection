import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { GameWorker } from '../worker/games.ts';
import { initializeDurableGame } from '../host/durable-game.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { choose, config } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 6, onnotice: () => {} });
const store = new PostgresGameStore(sql),
  ids: string[] = [],
  workers: GameWorker[] = [];
async function game() {
  const id = `worker-test-${randomUUID()}`;
  ids.push(id);
  await initializeDurableGame(store, config(id));
  return id;
}
function worker(options: ConstructorParameters<typeof GameWorker>[1] = {}, now = Date.now) {
  const instance = new GameWorker(store, options, now);
  workers.push(instance);
  return instance;
}
afterAll(async () => {
  await Promise.all(workers.map(w => w.stop()));
  await sql`DELETE FROM play.games WHERE id = ANY(${ids})`;
  await sql.end();
});
test('concurrent bindings share one restored actor and a different worker cannot acquire its lease', async () => {
  const id = await game(),
    owner = worker(),
    other = worker();
  const [a, b] = await Promise.all([owner.acquire(id), owner.acquire(id)]);
  expect(owner.count).toBe(1);
  expect(owner.statistics).toEqual({
    loadedGames: 1,
    loadingGames: 0,
    attachedGames: 1,
    busyGames: 0,
    queuedOperations: 0,
    capacity: 128,
  });
  expect(await a.run(async host => host)).toBe(await b.run(async host => host));
  await expect(other.acquire(id)).rejects.toThrow('unavailable');
  expect(other.count).toBe(0);
  a.release();
  b.release();
  await owner.stop();
  const replacement = await other.acquire(id);
  expect(replacement.available).toBe(true);
  expect(a.available).toBe(false);
});
test('one busy game bounds its operation queue while a different game advances', async () => {
  const owner = worker({ maxGames: 2, maxQueue: 2 });
  const a = await owner.acquire(await game()),
    b = await owner.acquire(await game());
  await expect(owner.acquire(await game())).rejects.toThrow('capacity');
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const running = a.run(async () => {
    entered.resolve();
    await release.promise;
    return 1;
  });
  await entered.promise;
  const queued = a.run(async () => 2);
  try {
    expect(owner.statistics).toEqual({
      loadedGames: 2,
      loadingGames: 0,
      attachedGames: 2,
      busyGames: 1,
      queuedOperations: 2,
      capacity: 2,
    });
    await expect(a.run(async () => 3)).rejects.toThrow('capacity');
    const result = await b.run(async host => {
      const input = choose(host.state, 'initiative');
      if (input.type !== 'decision') throw new Error('Expected decision');
      return host.submit(input.playerId, randomUUID(), input);
    });
    expect(result.receipt.sequence).toBe(1);
  } finally {
    release.resolve();
  }
  expect(await running).toBe(1);
  expect(await queued).toBe(2);
});
test('idle collection waits for the last binding, releases ownership and later recovers the committed game', async () => {
  let now = 0;
  const owner = worker({ idleMs: 100 }, () => now),
    id = await game();
  const a = await owner.acquire(id),
    b = await owner.acquire(id);
  const committed = await a.run(async host => {
    const input = choose(host.state, 'initiative');
    if (input.type !== 'decision') throw new Error('Expected decision');
    return host.submit(input.playerId, randomUUID(), input);
  });
  a.release();
  a.release();
  now = 1000;
  await owner.maintain();
  expect(owner.count).toBe(1);
  b.release();
  now += 101;
  await Promise.all([owner.maintain(), owner.maintain()]);
  expect(owner.count).toBe(0);
  const recovered = await owner.acquire(id);
  expect(await recovered.run(async host => host.state)).toEqual(committed.state);
});
test('shutdown refuses new work, drains a running command, and releases the committed game', async () => {
  const owner = worker(),
    id = await game(),
    binding = await owner.acquire(id);
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const active = binding.run(async host => {
    entered.resolve();
    await release.promise;
    const input = choose(host.state, 'initiative');
    if (input.type !== 'decision') throw new Error('Expected decision');
    return host.submit(input.playerId, randomUUID(), input);
  });
  await entered.promise;
  let stopped = false;
  const stop = owner.stop().then(() => {
    stopped = true;
  });
  try {
    expect(binding.available).toBe(false);
    await expect(owner.acquire(id)).rejects.toThrow('closed');
    await expect(binding.run(async () => {})).rejects.toThrow('closed');
    expect(stopped).toBe(false);
  } finally {
    release.resolve();
  }
  const result = await active;
  await stop;
  expect(owner.count).toBe(0);
  const next = await worker().acquire(id);
  expect(await next.run(async host => host.state)).toEqual(result.state);
});
test('lost ownership retires old bindings; a replacement worker restores the committed head', async () => {
  const id = await game(),
    owner = worker(),
    binding = await owner.acquire(id);
  await sql`UPDATE play.games SET lease_until = clock_timestamp() - interval '1 second' WHERE id = ${id}`;
  const next = await worker().acquire(id);
  await owner.maintain();
  expect(binding.available).toBe(false);
  await expect(binding.run(async () => {})).rejects.toThrow('closed');
  expect(await next.run(async host => host.paused)).toBe(false);
});
test('failed restore frees its reservation and a stopped worker cannot resurrect a late load', async () => {
  const owner = worker({ maxGames: 1 });
  await expect(owner.acquire('missing-game')).rejects.toThrow('unavailable');
  expect(owner.count).toBe(0);
  const id = await game();
  const reserved = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const blocked = new GameWorker({
    claim: async (...args) => {
      reserved.resolve();
      await release.promise;
      return store.claim(...args);
    },
    release: store.release.bind(store),
    load: store.load.bind(store),
    append: store.append.bind(store),
    renew: store.renew.bind(store),
    findReceipt: store.findReceipt.bind(store),
  });
  workers.push(blocked);
  const pending = Promise.allSettled([blocked.acquire(id)]);
  await reserved.promise;
  expect(blocked.statistics).toEqual({
    loadedGames: 0,
    loadingGames: 1,
    attachedGames: 1,
    busyGames: 0,
    queuedOperations: 0,
    capacity: 128,
  });
  const stopping = blocked.stop();
  release.resolve();
  expect((await pending)[0]!.status).toBe('rejected');
  await stopping;
  expect(blocked.count).toBe(0);
  expect((await owner.acquire(id)).available).toBe(true);
});
