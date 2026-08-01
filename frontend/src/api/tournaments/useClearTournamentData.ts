import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useClearTournamentData = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.tournament[':id']['clear-data'].$post({
        param: { id: tournamentId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
          'message' in errorData ? errorData.message : 'Failed to clear tournament data',
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-decks', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });

      toast({
        title: 'Tournament data cleared',
        description: 'The tournament is ready for a new import.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to clear tournament data',
        description: error.message,
      });
    },
  });
};
