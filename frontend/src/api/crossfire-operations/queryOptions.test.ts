import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { crossfireOperationsQueryOptions } from './queryOptions.ts';
import type { CrossfireOperationsStatus } from '../../../../shared/types/crossfire-operations.ts';

const data: CrossfireOperationsStatus = {
  online: true,
  staleAfterSeconds: 45,
  historyBucketSeconds: 30,
  latest: null,
  history: [],
};

test('keeps polling recoverable errors with cached data and can recover', async () => {
  const client = new QueryClient();
  const options = crossfireOperationsQueryOptions('session', 6);
  const interval = options.refetchInterval;
  if (typeof interval !== 'function') throw new Error('Expected dynamic polling policy');
  let failure: Error | undefined;
  const observerOptions = {
    ...options,
    retry: false,
    queryFn: async () => {
      if (failure) throw failure;
      return data;
    },
  };
  const observer = new QueryObserver(client, observerOptions);
  const query = client.getQueryCache().build(client, observerOptions);
  try {
    await observer.refetch();
    for (const error of [
      new TypeError('Failed to fetch'),
      Object.assign(new Error('Unavailable'), { status: 503 }),
    ]) {
      failure = error;
      const result = await observer.refetch();
      expect(result.isError).toBe(true);
      expect(result.data?.online).toBe(true);
      expect(interval(query)).toBe(10_000);
    }
    failure = undefined;
    expect((await observer.refetch()).isSuccess).toBe(true);
    expect(interval(query)).toBe(10_000);
  } finally {
    observer.destroy();
    client.clear();
  }
});

test('authentication denials stop both retries and polling', async () => {
  const client = new QueryClient();
  const options = crossfireOperationsQueryOptions('session', 6);
  const interval = options.refetchInterval,
    retry = options.retry;
  if (typeof interval !== 'function' || typeof retry !== 'function')
    throw new Error('Expected dynamic polling and retry policies');
  try {
    for (const status of [401, 403]) {
      const error = Object.assign(new Error('Denied'), { status });
      const observerOptions = {
        ...options,
        queryFn: async (): Promise<CrossfireOperationsStatus> => {
          throw error;
        },
      };
      const observer = new QueryObserver(client, observerOptions);
      try {
        await observer.refetch();
        expect(retry(0, error)).toBe(false);
        expect(interval(client.getQueryCache().build(client, observerOptions))).toBe(false);
      } finally {
        observer.destroy();
      }
    }
  } finally {
    client.clear();
  }
});
