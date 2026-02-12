import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZTeamCreateRequest } from '../../../../types/ZTeam.ts';

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ZTeamCreateRequest) => {
      const response = await api.teams.$post({
        json: payload,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to create team');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['user-setup'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while creating team',
        description: error.message,
      });
    },
  });
};
