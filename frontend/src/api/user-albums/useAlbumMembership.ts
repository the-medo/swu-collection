import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';

export function useAlbumMembership(
  userId: string | undefined,
  fileIds: string[],
  albumId?: string,
) {
  const ids = [...fileIds].sort();
  return useQuery({
    queryKey: userAlbumKeys.membership(userId, ids, albumId),
    queryFn:
      userId && ids.length
        ? async ({ signal }) =>
            albumData<{ fileId: string; albumId: string }[]>(
              await api['user-albums'].membership.$get(
                {
                  query: { fileIds: ids.join(','), ...(albumId ? { albumId } : {}) },
                },
                { init: { signal } },
              ),
            )
        : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
