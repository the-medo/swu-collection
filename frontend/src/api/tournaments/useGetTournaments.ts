import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { Tournament } from '../../../../types/Tournament.ts';

const PAGE_SIZE = 20;

export type GetTournamentsRequest = {
  type?: string;
  season?: number;
  set?: string;
  format?: number;
  continent?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

export interface TournamentsResponse {
  data: Tournament[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const useGetTournaments = (props: GetTournamentsRequest = {}) => {
  const { type, season, set, format, continent, sort = 'tournament.date', order = 'desc' } = props;

  // Create a stable query key based on all filter parameters
  const qk = [
    'tournaments',
    {
      type,
      season,
      set,
      format,
      continent,
      sort,
      order,
    },
  ];

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      const response = await api.tournament.$get({
        query: {
          type,
          season: season?.toString(),
          set,
          format: format?.toString(),
          continent,
          sort,
          order,
          limit: PAGE_SIZE.toString(),
          offset: pageParam.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Something went wrong');
      }

      return (await response.json()) as TournamentsResponse;
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
