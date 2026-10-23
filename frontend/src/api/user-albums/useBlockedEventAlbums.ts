import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { BlockedEventAlbumList, UserAlbumCursor } from '../../../../types/UserAlbum.ts';

export function useBlockedEventAlbums() {
  const viewer = useUser()?.id;
  const allowed = usePermissions()('admin', 'access');
  return useInfiniteQuery({
    queryKey: userAlbumKeys.blocked(viewer),
    enabled: !!viewer && allowed,
    queryFn: async ({ pageParam, signal }) =>
      albumData<BlockedEventAlbumList>(
        await api.admin['user-albums'].blocked.$get(
          { query: pageParam ?? {} },
          { init: { signal } },
        ),
      ),
    initialPageParam: undefined as UserAlbumCursor | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
