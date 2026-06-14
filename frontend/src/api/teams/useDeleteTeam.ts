import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useDeleteTeam = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!teamId) {
        throw new Error('Team id is required');
      }

      const response = await api.teams[':id'].$delete({
        param: { id: teamId },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to delete team');
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['user-setup'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting team',
        description: error.message,
      });
    },
  });
};
