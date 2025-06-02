import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { ZTournamentGroupTournamentCreateRequest } from '../../../../types/ZTournamentGroup.ts';

export const usePostTournamentGroupTournament = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentGroupTournamentCreateRequest) => {
      const response = await api['tournament-groups'][':id'].tournaments.$post({
        param: { id: groupId },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to assign tournament to group');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-tournaments', groupId] });

      toast({
        title: 'Tournament assigned successfully',
        description: 'The tournament has been assigned to the group.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to assign tournament',
        description: error.message,
      });
    },
  });
};