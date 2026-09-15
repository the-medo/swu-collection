import { invitationsKey } from './useInvitations.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CrossfirePolicy } from '../../../../shared/types/crossfire.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useCreateLobby(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: {
      deckId: string;
      policy: CrossfirePolicy;
      bestOf?: 1 | 3;
      showLeader?: boolean;
      recipientId?: string;
    }) => {
      const response = await api.crossfire.lobbies.$post({ json });
      if (!response.ok) throw await createApiError(response, 'Could not create a game');
      return (await response.json()).data;
    },
    onSuccess: lobby => {
      client.setQueryData(crossfireKeys.lobby(sessionId, lobby.id), lobby);
      void client.invalidateQueries({ queryKey: invitationsKey(sessionId) });
    },
  });
}
