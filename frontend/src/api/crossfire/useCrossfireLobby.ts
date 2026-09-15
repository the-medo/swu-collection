import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useCrossfireLobby(sessionId: string, lobbyId: string) {
  return useQuery({
    queryKey: crossfireKeys.lobby(sessionId, lobbyId),
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.lobbies[':lobbyId'].$get(
        { param: { lobbyId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not open this invitation');
      return (await response.json()).data;
    },
    enabled: Boolean(lobbyId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: query =>
      query.state.data?.exit?.status === 'pending'
        ? 3000
        : query.state.data?.status === 'waiting' && !query.state.error
          ? 15_000
          : false,
  });
}
