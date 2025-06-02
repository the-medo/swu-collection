import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useDeleteTournamentGroupTournament = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api['tournament-groups'][':id'].tournaments.$delete({
        param: { id: groupId },
        query: { tournamentId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to remove tournament from group');
      }

      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-tournaments', groupId] });

      toast({
        title: 'Tournament removed successfully',
        description: 'The tournament has been removed from the group.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to remove tournament',
        description: error.message,
      });
    },
  });
};