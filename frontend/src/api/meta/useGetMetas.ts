import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface MetaQueryParams {
  set?: string;
  format?: number;
  season?: number;
  minSeason?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface MetaData {
  meta: {
    id: number;
    set: string;
    name: string;
    format: number;
    date: string;
    season: number;
  };
  format: {
    id: number;
    name: string;
    description: string;
  };
}

export interface MetasResponse {
  data: MetaData[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const useGetMetas = (params: MetaQueryParams = {}) => {
  return useQuery<MetasResponse, ErrorWithStatus>({
    queryKey: ['metas', params],
    queryFn: async () => {
      const response = await api.meta.$get({
        query: params,
      });
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();
      return data as MetasResponse;
    },
    staleTime: Infinity,
  });
};
