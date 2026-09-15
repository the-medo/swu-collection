import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { MatchReady } from '../../../../shared/types/crossfire-matches.ts';
const key = (sessionId: string, lobbyId: string) => ['crossfire-match', sessionId, lobbyId];
export function useMatch(sessionId: string, lobbyId: string) {
  return useQuery({
    queryKey: key(sessionId, lobbyId),
    gcTime: 0,
    staleTime: 1000,
    refetchInterval: 3000,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.lobbies[':lobbyId'].match.$get(
        { param: { lobbyId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load the match');
      return (await response.json()).data;
    },
  });
}
export function useMatchReady(sessionId: string, lobbyId: string) {
  const query = useQueryClient();
  return useMutation({
    mutationFn: async (json: MatchReady) => {
      const response = await api.crossfire.lobbies[':lobbyId'].match.$post({
        param: { lobbyId },
        json,
      });
      if (!response.ok) throw await createApiError(response, 'Could not update your match');
      return (await response.json()).data;
    },
    onSuccess: data => query.setQueryData(key(sessionId, lobbyId), data),
    onError: () => query.invalidateQueries({ queryKey: key(sessionId, lobbyId) }),
  });
}
