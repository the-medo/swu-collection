import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

const PAGE_SIZE = 20;

export const useTeamDecks = (teamId: string | undefined) => {
  return useInfiniteQuery({
    queryKey: ['team-decks', teamId],
    queryFn: teamId
      ? async ({ pageParam }) => {
          const response = await api.teams[':id'].decks.$get({
            param: { id: teamId },
            query: {
              limit: PAGE_SIZE.toString(),
              offset: pageParam.toString(),
            },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch team decks');
          }
          return await response.json();
        }
      : skipToken,
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (!lastPage.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
  });
};
