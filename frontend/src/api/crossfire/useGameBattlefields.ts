import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';

export function useGameBattlefields(sessionId: string, lobbyId: string) {
  return useQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'battlefields', lobbyId],
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.lobbies[':lobbyId'].battlefields.$get(
        { param: { lobbyId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load game battlefields');
      return (await response.json()).data;
    },
    enabled: Boolean(sessionId && lobbyId),
    // Scenes are frozen at admission and never change during a match.
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
  });
}
