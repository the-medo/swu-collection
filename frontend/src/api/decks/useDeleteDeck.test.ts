import { describe, expect, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { removeDeckFromListCache } from './useDeleteDeck.ts';
import { getNextDecksPageParam } from './useGetDecks.ts';

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
          data: [
            { deck: { id: 'kept-deck' } },
            { deck: { id: 'deleted-deck' } },
          ],
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

    removeDeckFromListCache(queryClient, 'deleted-deck');

    expect(queryClient.getQueryData(allDecksKey)).toEqual({
      pages: [
        {
          data: [{ deck: { id: 'kept-deck' } }],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    expect(queryClient.getQueryData(favoriteDecksKey)).toEqual({
      pages: [
        {
          data: [],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
      ],
      pageParams: [0],
    });
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelatedData);
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
});
