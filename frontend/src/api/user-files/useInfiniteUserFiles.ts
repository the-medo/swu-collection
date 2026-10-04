import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { userFileKeys } from './queryKeys.ts';
import { fetchUserFiles } from './fetchUserFiles.ts';

export function useInfiniteUserFiles(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: userFileKeys.infinite(userId),
    queryFn: userId ? ({ pageParam, signal }) => fetchUserFiles(pageParam, signal) : skipToken,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
