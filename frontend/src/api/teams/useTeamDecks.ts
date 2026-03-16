import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TeamDeckExpanded } from '../../../../server/routes/teams/_id/decks/get.ts';
import { Pagination } from '../../../../types/pagination.ts';

const PAGE_SIZE = 20;

export interface GetTeamDecksResponse {
  data: TeamDeckExpanded[];
  pagination: Pagination;
}

export const useTeamDecks = (teamId: string | undefined, quickFilter?: string) => {
  const normalizedQuickFilter = quickFilter?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: ['team-decks', teamId, normalizedQuickFilter],
    queryFn: teamId
      ? async ({ pageParam }) => {
          const response = await api.teams[':id'].decks.$get({
            param: { id: teamId },
            query: {
              limit: PAGE_SIZE.toString(),
              offset: pageParam.toString(),
              ...(normalizedQuickFilter ? { quickFilter: normalizedQuickFilter } : {}),
            },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch team decks');
          }
          return (await response.json()) as unknown as GetTeamDecksResponse;
        }
      : skipToken,
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (!lastPage.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: 2 * 60 * 1000,
  });
};
