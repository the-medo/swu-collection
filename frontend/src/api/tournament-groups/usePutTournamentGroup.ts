import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { TournamentGroup } from '../../../../types/TournamentGroup.ts';
import { ZTournamentGroupUpdateRequest } from '../../../../types/ZTournamentGroup.ts';

export const usePutTournamentGroup = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentGroupUpdateRequest) => {
      const response = await api['tournament-groups'][':id'].$put({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to update tournament group');
      }

      return response.json() as Promise<{ data: TournamentGroup }>;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-groups'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group', id] });

      toast({
        title: 'Tournament group updated successfully',
        description: 'The tournament group has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update tournament group',
        description: error.message,
      });
    },
  });
};