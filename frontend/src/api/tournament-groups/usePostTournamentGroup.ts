import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { TournamentGroup } from '../../../../types/TournamentGroup.ts';
import { ZTournamentGroupCreateRequest } from '../../../../types/ZTournamentGroup.ts';

export const usePostTournamentGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZTournamentGroupCreateRequest) => {
      const response = await api['tournament-groups'].$post({
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to create tournament group');
      }

      return response.json() as Promise<{ data: TournamentGroup }>;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-groups'] });

      toast({
        title: 'Tournament group created successfully',
        description: 'The tournament group has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create tournament group',
        description: error.message,
      });
    },
  });
};