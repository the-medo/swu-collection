import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckChangeRequestCommentRequest } from '../../../../types/ZDeckBranch.ts';

export const useCommentDeckChangeRequest = (teamId: string | undefined, branchId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      changeKey,
      body,
    }: ZDeckChangeRequestCommentRequest & { requestId: string }) => {
      if (!teamId) throw new Error('Team id is required');
      const response = await api.teams[':id']['change-requests'][':requestId'].comments.$post({
        param: { id: teamId, requestId },
        json: { changeKey, body },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to add feedback');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-change-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-deck-branch-diff', teamId, branchId] });
      toast({ title: 'Feedback added' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Could not add feedback',
        description: error.message,
      });
    },
  });
};
