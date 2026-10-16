import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { UserAlbumPage } from '../../../../types/UserAlbum.ts';

export function useUserAlbum(id: string) {
  const viewer = useUser()?.id;
  return useInfiniteQuery({
    queryKey: userAlbumKeys.detail(viewer, id),
    enabled: !!id,
    queryFn: async ({ pageParam, signal }) =>
      albumData<UserAlbumPage>(
        await api['user-albums'][':id'].$get(
          {
            param: { id },
            query: {
              page: String(pageParam.page),
              ...(pageParam.revision === undefined ? {} : { revision: String(pageParam.revision) }),
            },
          },
          { init: { signal } },
        ),
      ),
    initialPageParam: { page: 0, revision: undefined as number | undefined },
    getNextPageParam: (last, _pages, page) =>
      last.hasMore ? { page: page.page + 1, revision: last.album.revision } : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
