import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZTeamUpdateRequest } from '../../../../types/ZTeam.ts';

export const useUpdateTeam = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ZTeamUpdateRequest) => {
      if (!teamId) {
        throw new Error('Team id is required');
      }
      const response = await api.teams[':id'].$patch({
        param: { id: teamId },
        json: payload,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to update team');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['user-setup'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while updating team',
        description: error.message,
      });
    },
  });
};
