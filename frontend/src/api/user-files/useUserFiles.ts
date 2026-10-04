import { skipToken, useQuery } from '@tanstack/react-query';
import { userFileKeys } from './queryKeys.ts';
import { fetchUserFiles } from './fetchUserFiles.ts';

export function useUserFiles(userId: string | undefined, page: number) {
  return useQuery({
    queryKey: userFileKeys.list(userId, page),
    queryFn: userId ? ({ signal }) => fetchUserFiles(page, signal) : skipToken,
    staleTime: 0,
    gcTime: 0,
  });
}
