import { keepPreviousData, skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { AlbumTournamentOptions } from '../../../../types/UserAlbum.ts';

export function useAlbumTournamentOptions(search: string, enabled: boolean) {
  const viewer = useUser()?.id;
  // Accept a copied tournament page URL as well as a name, location, or ID.
  const q =
    search.trim().match(/(?:^|\/)([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\/|$|\?)/i)?.[1] ??
    search.trim();
  return useInfiniteQuery({
    queryKey: userAlbumKeys.tournamentOptions(viewer, q),
    queryFn:
      viewer && enabled
        ? async ({ pageParam, signal }) =>
            albumData<AlbumTournamentOptions>(
              await api['user-albums'].tournaments.$get(
                { query: { q, page: String(pageParam) } },
                { init: { signal } },
              ),
            )
        : skipToken,
    initialPageParam: 0,
    getNextPageParam: (last, _pages, page) => (last.hasMore ? page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
