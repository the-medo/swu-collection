import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckChangeRequestCreateRequest } from '../../../../types/ZDeckBranch.ts';

export const useSubmitDeckChangeRequest = (
  teamId: string | undefined,
  branchId: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: ZDeckChangeRequestCreateRequest) => {
      if (!teamId || !branchId) throw new Error('Team id and branch id are required');
      const response = await api.teams[':id']['deck-branches'][':branchId'][
        'change-request'
      ].$post({
        param: { id: teamId, branchId },
        json,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to submit change request');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-change-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
      toast({ title: 'Change request submitted' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while submitting change request',
        description: error.message,
      });
    },
  });
};

