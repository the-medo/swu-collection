import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useMemo } from 'react';

const PAGE_SIZE = 20;

export type GetTournamentsRequest = {
  type?: string;
  minType?: number;
  season?: number;
  set?: string;
  format?: number;
  continent?: string;
  date?: Date | string;
  maxDate?: Date | string;
  meta?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
};

export const useGetTournaments = (props: GetTournamentsRequest, enabled = true) => {
  const {
    type,
    minType,
    season,
    set,
    format,
    continent,
    date,
    maxDate,
    meta,
    limit,
    sort = 'tournament.date',
    order = 'desc',
  } = props;

  // Create a stable query key based on all filter parameters
  const qk = useMemo(
    () => [
      'tournaments',
      {
        type,
        minType,
        season,
        set,
        format,
        continent,
        date: date instanceof Date ? date.toISOString() : date,
        maxDate: maxDate instanceof Date ? maxDate.toISOString() : maxDate,
        meta,
        sort,
        order,
      },
    ],
    [type, minType, season, set, format, continent, date, maxDate, meta, sort, order],
  );

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      const response = await api.tournament.$get({
        query: {
          type,
          minType: minType?.toString(),
          season: season?.toString(),
          set,
          format: format?.toString(),
          continent,
          minDate: date instanceof Date ? date.toISOString() : date,
          maxDate: maxDate instanceof Date ? maxDate.toISOString() : maxDate,
          meta: meta?.toString(),
          sort,
          order,
          limit: limit ?? PAGE_SIZE.toString(),
          offset: pageParam.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Something went wrong');
      }

      return await response.json();
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
    enabled: !!props,
  });
};
