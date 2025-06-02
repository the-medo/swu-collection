import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { ZTournamentGroupTournamentUpdateRequest } from '../../../../types/ZTournamentGroup.ts';

export const usePutTournamentGroupTournament = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentGroupTournamentUpdateRequest) => {
      const response = await api['tournament-groups'][':id'].tournaments.$put({
        param: { id: groupId },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to update tournament position');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-tournaments', groupId] });

      toast({
        title: 'Tournament position updated',
        description: 'The tournament position has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update tournament position',
        description: error.message,
      });
    },
  });
};