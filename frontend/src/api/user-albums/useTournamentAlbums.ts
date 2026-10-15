import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { TournamentAlbumList, UserAlbumCursor } from '../../../../types/UserAlbum.ts';

export function useTournamentAlbums(tournamentId: string) {
  const viewer = useUser()?.id;
  return useInfiniteQuery({
    queryKey: userAlbumKeys.tournament(viewer, tournamentId),
    queryFn: async ({ pageParam, signal }) =>
      albumData<TournamentAlbumList>(
        await api['user-albums']['by-tournament'][':tournamentId'].$get(
          { param: { tournamentId }, query: pageParam ?? {} },
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
