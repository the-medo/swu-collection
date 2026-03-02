import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useUpdateMemberAutoAddDeck = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, autoAddDeck }: { userId: string; autoAddDeck: boolean }) => {
      if (!teamId) {
        throw new Error('Team id is required');
      }
      const response = await api.teams[':id'].members[':userId'].$patch({
        param: { id: teamId, userId },
        json: { autoAddDeck },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          'message' in error ? error.message : 'Failed to update auto-add deck setting',
        );
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while updating auto-add deck setting',
        description: error.message,
      });
    },
  });
};
