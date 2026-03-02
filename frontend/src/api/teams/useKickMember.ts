import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useKickMember = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!teamId) {
        throw new Error('Team id is required');
      }
      const response = await api.teams[':id'].members[':userId'].$delete({
        param: { id: teamId, userId },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to remove member');
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
        title: 'Error while removing member',
        description: error.message,
      });
    },
  });
};
