import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZTeamJoinRequestAction } from '../../../../types/ZTeam.ts';

type HandleJoinRequestPayload = ZTeamJoinRequestAction & {
  requestId: string;
};

export const useHandleJoinRequest = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }: HandleJoinRequestPayload) => {
      if (!teamId) {
        throw new Error('Team id is required');
      }
      const response = await api.teams[':id']['join-request'][':requestId'].$patch({
        param: { id: teamId, requestId },
        json: { status },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to handle join request');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-join-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while handling join request',
        description: error.message,
      });
    },
  });
};
