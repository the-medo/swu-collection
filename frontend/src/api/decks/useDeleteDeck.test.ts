import { describe, expect, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import {
  applyBulkDeletedDeckCaches,
  applyDeletedDeckCaches,
  removeDecksFromListCache,
} from './deckDeletionCache.ts';
import { getNextDecksPageParam } from './useGetDecks.ts';

type TestDeckListCache = {
  pages: {
    data: { deck: { id: string } }[];
    pagination?: { limit: number; offset: number; hasMore: boolean };
  }[];
  pageParams: number[];
};

describe('deck deletion cache update', () => {
  test('removes the deleted deck from every cached deck list without changing other queries', () => {
    const queryClient = new QueryClient();
    const allDecksKey = ['decks', 'all', { userId: 'user-1' }] as const;
    const favoriteDecksKey = ['decks', 'favorite', { userId: 'user-1' }] as const;
    const unrelatedKey = ['deck', 'deleted-deck'] as const;
    const unrelatedData = { deck: { id: 'deleted-deck' } };

    queryClient.setQueryData(allDecksKey, {
      pages: [
        {
          data: [{ deck: { id: 'kept-deck' } }, { deck: { id: 'deleted-deck' } }],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    queryClient.setQueryData(favoriteDecksKey, {
      pages: [
        {
          data: [{ deck: { id: 'deleted-deck' } }],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    queryClient.setQueryData(unrelatedKey, unrelatedData);

    removeDecksFromListCache(queryClient, ['deleted-deck']);

    expect(queryClient.getQueryData<TestDeckListCache>(allDecksKey)).toEqual({
      pages: [
        {
          data: [{ deck: { id: 'kept-deck' } }],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    expect(queryClient.getQueryData<TestDeckListCache>(favoriteDecksKey)).toEqual({
      pages: [
        {
          data: [],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    expect(queryClient.getQueryData<typeof unrelatedData>(unrelatedKey)).toBe(unrelatedData);
  });

  test('removes several deleted decks from every page in one cache update', () => {
    const queryClient = new QueryClient();
    const key = ['decks', 'all', { userId: 'user-1' }] as const;

    queryClient.setQueryData(key, {
      pages: [
        { data: [{ deck: { id: 'first' } }, { deck: { id: 'kept' } }] },
        { data: [{ deck: { id: 'second' } }] },
      ],
      pageParams: [0, 2],
    });

    removeDecksFromListCache(queryClient, ['first', 'second']);

    expect(queryClient.getQueryData<TestDeckListCache>(key)).toEqual({
      pages: [{ data: [{ deck: { id: 'kept' } }] }, { data: [] }],
      pageParams: [0, 2],
    });
  });

  test('uses the remaining cached row count as the next page offset', () => {
    const firstPage = {
      data: Array.from({ length: 19 }, (_, id) => ({ deck: { id: id.toString() } })),
      pagination: { limit: 20, offset: 0, hasMore: true },
    };
    const secondPage = {
      data: Array.from({ length: 20 }, (_, id) => ({ deck: { id: (id + 20).toString() } })),
      pagination: { limit: 20, offset: 20, hasMore: true },
    };

    expect(getNextDecksPageParam(secondPage, [firstPage, secondPage])).toBe(39);
  });

  test('clears deleted deck detail caches and invalidates affected card pools', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['deck', 'deleted-deck'], { id: 'deleted-deck' });
    queryClient.setQueryData(['deck-content', 'deleted-deck'], { data: [] });
    queryClient.setQueryData(['decks-bulk', 'deleted-deck'], true);
    queryClient.setQueryData(['card-pool', 'pool-1'], { id: 'pool-1' });

    applyDeletedDeckCaches(queryClient, ['deleted-deck'], ['pool-1']);

    expect(queryClient.getQueryData(['deck', 'deleted-deck'])).toBeUndefined();
    expect(queryClient.getQueryData(['deck-content', 'deleted-deck'])).toBeUndefined();
    expect(queryClient.getQueryData(['decks-bulk', 'deleted-deck'])).toBeUndefined();
    expect(queryClient.getQueryState(['card-pool', 'pool-1'])?.isInvalidated).toBe(true);
  });

  test('can invalidate every deck list after a bulk deletion', async () => {
    const queryClient = new QueryClient();
    const allDecksKey = ['decks', 'all', { userId: 'user-1' }] as const;
    const favoriteDecksKey = ['decks', 'favorite', { userId: 'user-1' }] as const;
    queryClient.setQueryData(allDecksKey, {
      pages: [{ data: [{ deck: { id: 'deleted-deck' } }] }],
      pageParams: [0],
    });
    queryClient.setQueryData(favoriteDecksKey, { pages: [], pageParams: [] });

    await applyBulkDeletedDeckCaches(queryClient, ['deleted-deck'], []);

    expect(queryClient.getQueryData<TestDeckListCache>(allDecksKey)?.pages[0].data).toEqual([]);
    expect(queryClient.getQueryState(allDecksKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(favoriteDecksKey)?.isInvalidated).toBe(true);
  });
});
