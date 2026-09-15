import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';

// Site-wide lifetime, separate from the game-page cache's teardown.
export const invitationsKey = (sessionId: string) => ['crossfire-invitations', sessionId] as const;
export function useInvitations(sessionId: string) {
  return useQuery({
    queryKey: invitationsKey(sessionId),
    enabled: Boolean(sessionId),
    gcTime: 0,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.invitations.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load invitations');
      return (await response.json()).data;
    },
  });
}
export function useTeammates(sessionId: string) {
  return useQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'teammates'],
    gcTime: 0,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.teammates.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load teammates');
      return (await response.json()).data;
    },
  });
}
export function useDeclineInvitation(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (lobbyId: string) => {
      const response = await api.crossfire.invitations[':lobbyId'].$delete({ param: { lobbyId } });
      if (!response.ok) throw await createApiError(response, 'Could not decline invitation');
    },
    onSuccess: (_data, id) => {
      void client.invalidateQueries({ queryKey: invitationsKey(sessionId) });
      void client.invalidateQueries({ queryKey: crossfireKeys.lobby(sessionId, id) });
    },
  });
}
