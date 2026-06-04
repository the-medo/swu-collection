import { describe, expect, test } from 'bun:test';
import {
  buildKarabastUnimplementedMap,
  createKarabastUnimplementedMapCache,
  getKarabastUnimplementedMap,
  invalidateKarabastUnimplementedCache,
  setKarabastUnimplementedCacheFromRows,
} from './unimplementedCardsCache.ts';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

describe('Karabast unimplemented card cache helpers', () => {
  test('builds a deduplicated map and skips null card IDs', () => {
    expect(
      buildKarabastUnimplementedMap([
        { cardId: 'a-new-order' },
        { cardId: null },
        { cardId: 'a-new-order' },
        { cardId: 'amnesty-officer' },
      ]),
    ).toEqual({
      'a-new-order': true,
      'amnesty-officer': true,
    });
  });

  test('sets the module-level cache from storage rows', async () => {
    invalidateKarabastUnimplementedCache();

    try {
      const map = setKarabastUnimplementedCacheFromRows([
        { cardId: 'a-new-order' },
        { cardId: null },
      ]);

      expect(map).toEqual({
        'a-new-order': true,
      });
      await expect(getKarabastUnimplementedMap()).resolves.toEqual({
        'a-new-order': true,
      });
    } finally {
      invalidateKarabastUnimplementedCache();
    }
  });

  test('uses cached rows until the TTL expires', async () => {
    let nowMs = 1_000;
    let loadCount = 0;
    const rowsByLoad = [[{ cardId: 'a-new-order' }], [{ cardId: 'amnesty-officer' }]];
    const cache = createKarabastUnimplementedMapCache(
      async () => rowsByLoad[loadCount++] ?? [],
      () => nowMs,
      100,
    );

    await expect(cache.get()).resolves.toEqual({
      'a-new-order': true,
    });

    nowMs = 1_099;
    await expect(cache.get()).resolves.toEqual({
      'a-new-order': true,
    });
    expect(loadCount).toBe(1);

    nowMs = 1_100;
    await expect(cache.get()).resolves.toEqual({
      'amnesty-officer': true,
    });
    expect(loadCount).toBe(2);
  });

  test('shares one in-flight load between concurrent reads', async () => {
    const loader = createDeferred<{ cardId: string | null }[]>();
    let loadCount = 0;
    const cache = createKarabastUnimplementedMapCache(async () => {
      loadCount++;
      return loader.promise;
    });

    const firstRead = cache.get();
    const secondRead = cache.get();

    expect(loadCount).toBe(1);

    loader.resolve([{ cardId: 'a-new-order' }]);

    await expect(Promise.all([firstRead, secondRead])).resolves.toEqual([
      { 'a-new-order': true },
      { 'a-new-order': true },
    ]);
  });

  test('does not let an invalidated in-flight load overwrite newer rows', async () => {
    const staleLoader = createDeferred<{ cardId: string | null }[]>();
    let loadCount = 0;
    const cache = createKarabastUnimplementedMapCache(async () => {
      loadCount++;
      return staleLoader.promise;
    });

    const staleRead = cache.get();

    expect(loadCount).toBe(1);
    expect(cache.setFromRows([{ cardId: 'new-cache-entry' }])).toEqual({
      'new-cache-entry': true,
    });

    staleLoader.resolve([{ cardId: 'stale-cache-entry' }]);

    await expect(staleRead).resolves.toEqual({
      'new-cache-entry': true,
    });
    await expect(cache.get()).resolves.toEqual({
      'new-cache-entry': true,
    });
    expect(loadCount).toBe(1);
  });

  test('clears a failed in-flight load so a later read can retry', async () => {
    let loadCount = 0;
    const cache = createKarabastUnimplementedMapCache(async () => {
      loadCount++;

      if (loadCount === 1) {
        throw new Error('database unavailable');
      }

      return [{ cardId: 'retry-card' }];
    });

    await expect(cache.get()).rejects.toThrow('database unavailable');
    await expect(cache.get()).resolves.toEqual({
      'retry-card': true,
    });
    expect(loadCount).toBe(2);
  });
});
