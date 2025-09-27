import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentGroupsResponse } from '../../../../types/TournamentGroup.ts';

const PAGE_SIZE = 20;

export type GetTournamentGroupsRequest = {
  meta?: number;
  visible?: boolean;
  includeStats?: boolean;
  nameTemplate?: string;
  sort?: 'name' | 'position' | 'created_at';
  order?: 'asc' | 'desc';
  pageSize?: number;
};

export const useGetTournamentGroups = (props: GetTournamentGroupsRequest = {}) => {
  const {
    meta,
    visible,
    includeStats,
    nameTemplate,
    sort = 'position',
    order = 'asc',
    pageSize = PAGE_SIZE,
  } = props;

  // Create a stable query key based on all filter parameters
  const qk = [
    'tournament-groups',
    {
      meta,
      visible,
      includeStats,
      nameTemplate,
      sort,
      order,
    },
  ];

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      const response = await api['tournament-groups'].$get({
        query: {
          meta: meta?.toString(),
          visible: visible?.toString(),
          includeStats: includeStats?.toString(),
          nameTemplate,
          sort,
          order,
          limit: pageSize.toString(),
          offset: pageParam.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tournament groups');
      }

      return (await response.json()) as TournamentGroupsResponse;
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      // Check if there are more pages to fetch
      if (!lastPage.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      // Return the next offset
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: Infinity,
  });
};
