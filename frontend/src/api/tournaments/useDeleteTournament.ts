import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { TournamentStringDate } from '../../../../types/Tournament.ts';

export const useDeleteTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.tournament[':id'].$delete({
        param: { id: tournamentId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to delete tournament');
      }

      return response.json() as Promise<{ data: TournamentStringDate }>;
    },
    onSuccess: result => {
      // Invalidate and remove tournament from cache
      queryClient.removeQueries({ queryKey: ['tournament', result.data.id] });

      // Invalidate tournaments list
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });

      toast({
        title: 'Tournament deleted successfully',
        description: `Tournament "${result.data.name}" has been deleted.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete tournament',
        description: error.message,
      });
    },
  });
};
