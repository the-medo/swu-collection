import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';

export function invalidateCrossfireGames(client: QueryClient, sessionId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: [...crossfireKeys.session(sessionId), 'history'] }),
    client.invalidateQueries({ queryKey: [...crossfireKeys.session(sessionId), 'lobby'] }),
    client.invalidateQueries({ queryKey: ['crossfire-match', sessionId] }),
  ]);
}
export function useLeaveGame(sessionId: string, lobbyId: string, onLeft?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.crossfire.lobbies[':lobbyId'].leave.$post({ param: { lobbyId } });
      if (!response.ok) throw await createApiError(response, 'Could not leave this game');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await invalidateCrossfireGames(client, sessionId);
      onLeft?.();
    },
  });
}
