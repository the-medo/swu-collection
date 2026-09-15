import { expect, test } from 'bun:test';
import { HistoryCache } from '../history/cache.ts';
import { historyFixture } from './history-fixture.ts';
import { position } from './helpers.ts';
import { scenario } from './scenario.ts';

const key = 'test-private-history-key';

test('cold and cached seeks reproduce committed positions on original and restored branches', async () => {
  const game = historyFixture();
  game.choose('pass');
  game.undo(0);
  game.choose('take-initiative');
  game.finish();
  let loads = 0;
  const cache = new HistoryCache(async () => {
    loads++;
    return { history: structuredClone(game.history), key };
  });
  const start = await cache.seek(game.history.gameId, { kind: 'start' });
  expect(start.state).toEqual(game.positions.get(0)!.state);
  const end = await cache.seek(game.history.gameId, { kind: 'end' }, start.meta);
  expect(end.state).toEqual(game.state);
  const back = await cache.seek(game.history.gameId, { kind: 'step', offset: -1 }, end.meta);
  expect(back.state).toEqual(game.positions.get(3)!.state);
  const restored = await cache.seek(game.history.gameId, { kind: 'step', offset: -1 }, back.meta);
  expect(restored.state).toEqual(game.positions.get(2)!.state);
  const original = await cache.seek(
    game.history.gameId,
    { kind: 'branch', branch: end.meta.branches[0]!.id },
    end.meta,
  );
  expect(original.state).toEqual(game.positions.get(1)!.state);
  expect(loads).toBe(1);
  original.state.round = 999;
  expect(
    (await cache.seek(game.history.gameId, { kind: 'position', position: original.meta.position }))
      .state.round,
  ).not.toBe(999);
  await expect(
    cache.seek(game.history.gameId, { kind: 'position', position: '0'.repeat(32) }),
  ).rejects.toThrow('position');
});

test('concurrent loads coalesce; idle open tabs and maintenance do not refresh four-minute expiry', async () => {
  const game = historyFixture();
  let now = 0,
    loads = 0;
  const cache = new HistoryCache(
    async () => {
      loads++;
      await Bun.sleep(1);
      return { history: structuredClone(game.history), key };
    },
    {},
    () => now,
  );
  await Promise.all(
    Array.from({ length: 4 }, () => cache.seek(game.history.gameId, { kind: 'start' })),
  );
  expect(loads).toBe(1);
  now = 239_999;
  cache.prune();
  expect(cache.stats().games).toBe(1);
  now = 240_000;
  cache.prune();
  expect(cache.stats().games).toBe(0);
  const reopened = await cache.seek(game.history.gameId, { kind: 'start' });
  expect(reopened.state).toEqual(game.state);
  expect(loads).toBe(2);
  now += 239_000;
  await cache.seek(game.history.gameId, { kind: 'refresh' }, reopened.meta);
  now += 239_000;
  cache.prune();
  expect(cache.stats().games).toBe(1);
  now += 1_000;
  cache.prune();
  expect(cache.stats().games).toBe(0);
});

test('accepted gameplay refreshes a loaded live cache and a commit during loading is not lost', async () => {
  const game = historyFixture();
  let now = 0,
    loads = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const cache = new HistoryCache(
    async () => {
      loads++;
      const history = structuredClone(game.history);
      if (loads === 1) await gate;
      return { history, key };
    },
    {},
    () => now,
  );
  const loading = cache.seek(game.history.gameId, { kind: 'start' });
  game.choose('pass');
  cache.committed(game.history.gameId);
  release();
  await loading;
  expect((await cache.seek(game.history.gameId, { kind: 'end' })).state).toEqual(game.state);
  expect(loads).toBe(2);
  now = 239_000;
  cache.committed(game.history.gameId);
  now += 239_000;
  cache.prune();
  expect(cache.stats().games).toBe(1);
  now += 1_000;
  cache.prune();
  expect(cache.stats().games).toBe(0);
});

test('five-action checkpoints warm only the requested ancestry and state memory has a hard entry bound', async () => {
  const config = position();
  config.extraActions = 30;
  const game = historyFixture(config.gameId, scenario(config).state);
  for (let i = 0; i < 17; i++) game.choose('pass');
  const cache = new HistoryCache(async () => ({ history: structuredClone(game.history), key }));
  await cache.seek(game.history.gameId, { kind: 'start' });
  expect(cache.stats().snapshots).toBe(1);
  const end = await cache.seek(game.history.gameId, { kind: 'end' });
  expect(end.state).toEqual(game.state);
  expect(cache.stats().snapshots).toBe(5);
  const back = await cache.seek(game.history.gameId, { kind: 'step', offset: -5 }, end.meta);
  expect(back.state).toEqual(game.positions.get(12)!.state);
  const bounded = new HistoryCache(async () => ({ history: game.history, key }), {
    maxSnapshots: 2,
  });
  expect((await bounded.seek(game.history.gameId, { kind: 'end' })).state).toEqual(game.state);
  expect(bounded.stats().snapshots).toBe(2);
});

test('least recently used games are evicted and malformed histories fail without changing cache authority', async () => {
  const a = historyFixture(),
    b = historyFixture();
  a.choose('pass');
  b.choose('pass');
  const cache = new HistoryCache(
    async id => ({
      history: structuredClone(id === a.history.gameId ? a.history : b.history),
      key,
    }),
    { maxGames: 1 },
  );
  const saved = await cache.seek(a.history.gameId, { kind: 'end' });
  await cache.seek(b.history.gameId, { kind: 'end' });
  expect(cache.stats().games).toBe(1);
  expect(
    (await cache.seek(a.history.gameId, { kind: 'position', position: saved.meta.position })).state,
  ).toEqual(a.state);
  const corrupt = structuredClone(a.history);
  corrupt.stateHash = 'f'.repeat(64);
  const invalid = new HistoryCache(async () => ({ history: corrupt, key }));
  await expect(invalid.seek(a.history.gameId, { kind: 'end' })).rejects.toThrow('integrity');
  expect(invalid.stats().games).toBe(0);
});
