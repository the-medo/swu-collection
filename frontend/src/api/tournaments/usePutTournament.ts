import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { TournamentStringDate } from '../../../../types/Tournament.ts';
import { ZTournamentUpdateRequest } from '../../../../types/ZTournament.ts';

export const usePutTournament = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentUpdateRequest) => {
      const response = await api.tournament[':id'].$put({
        param: { id: tournamentId },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to update tournament');
      }

      return response.json() as Promise<{ data: TournamentStringDate }>;
    },
    onSuccess: result => {
      // Update the tournament in the cache
      queryClient.setQueryData(['tournament', tournamentId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          tournament: result.data,
        };
      });

      // Invalidate the tournaments list
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });

      toast({
        title: 'Tournament updated successfully',
        description: `Tournament "${result.data.name}" has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update tournament',
        description: error.message,
      });
    },
  });
};
