import { invitationsKey } from './useInvitations.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CrossfirePolicy } from '../../../../shared/types/crossfire.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useJoinLobby(sessionId: string, lobbyId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: {
      deckId: string;
      acceptedPolicy: CrossfirePolicy;
      acceptedBestOf?: 1 | 3;
    }) => {
      const response = await api.crossfire.lobbies[':lobbyId'].join.$post({
        param: { lobbyId },
        json,
      });
      if (!response.ok) throw await createApiError(response, 'Could not join this game');
      return (await response.json()).data;
    },
    onSuccess: lobby => {
      client.setQueryData(crossfireKeys.lobby(sessionId, lobbyId), lobby);
      void client.invalidateQueries({ queryKey: invitationsKey(sessionId) });
    },
    onError: () => client.invalidateQueries({ queryKey: crossfireKeys.lobby(sessionId, lobbyId) }),
  });
}
