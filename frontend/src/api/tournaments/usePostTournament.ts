import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { Tournament } from '../../../../types/Tournament.ts';
import { ZTournamentCreateRequest } from '../../../../types/ZTournament.ts';

export const usePostTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentCreateRequest) => {
      const response = await api.tournament.$post({
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Failed to create tournament');
      }

      return response.json() as Promise<{ data: Tournament }>;
    },
    onSuccess: result => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });

      toast({
        title: 'Tournament created successfully',
        description: `Tournament "${result.data.name}" has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create tournament',
        description: error.message,
      });
    },
  });
};
