import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckChangeRequestMergeRequest } from '../../../../types/ZDeckBranch.ts';

export const useMergeDeckChangeRequest = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      resolutions,
    }: ZDeckChangeRequestMergeRequest & { requestId: string }) => {
      if (!teamId) throw new Error('Team id is required');
      const response = await api.teams[':id']['change-requests'][':requestId'].merge.$post({
        param: { id: teamId, requestId },
        json: { resolutions },
      });
      const body = await response.json();
      if (!response.ok) {
        const error = new Error('message' in body ? body.message : 'Failed to merge request') as Error & {
          data?: unknown;
          status?: number;
        };
        error.data = 'data' in body ? body.data : undefined;
        error.status = response.status;
        throw error;
      }
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-change-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-decks', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
      queryClient.invalidateQueries({ queryKey: ['deck-content'] });
      toast({ title: 'Change request merged' });
    },
    onError: (error: Error & { status?: number }) => {
      if (error.status === 409) return;
      toast({
        variant: 'destructive',
        title: 'Error while merging change request',
        description: error.message,
      });
    },
  });
};

