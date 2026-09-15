import { invitationsKey } from './useInvitations.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useCancelLobby(sessionId: string, lobbyId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.crossfire.lobbies[':lobbyId'].$delete({ param: { lobbyId } });
      if (!response.ok) throw await createApiError(response, 'Could not cancel this invitation');
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: crossfireKeys.lobby(sessionId, lobbyId) });
      void client.invalidateQueries({ queryKey: invitationsKey(sessionId) });
    },
  });
}
