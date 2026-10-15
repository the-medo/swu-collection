import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { UserAlbumList, UserAlbumCursor } from '../../../../types/UserAlbum.ts';

export function useUserAlbums(ownerId: string, publicOnly = false) {
  const viewer = useUser()?.id;
  return useInfiniteQuery({
    queryKey: userAlbumKeys.list(viewer, ownerId, publicOnly),
    queryFn:
      publicOnly || viewer === ownerId
        ? async ({ pageParam, signal }) =>
            albumData<UserAlbumList>(
              await (publicOnly
                ? api['user-albums']['by-user'][':userId'].$get(
                    { param: { userId: ownerId }, query: pageParam ?? {} },
                    { init: { signal } },
                  )
                : api['user-albums'].$get({ query: pageParam ?? {} }, { init: { signal } })),
            )
        : skipToken,
    initialPageParam: undefined as UserAlbumCursor | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
