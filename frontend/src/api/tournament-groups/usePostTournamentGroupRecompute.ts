import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const usePostTournamentGroupRecompute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api['tournament-groups'][':id']['recompute'].$post({
        param: { id },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to recompute tournament group statistics');
      }

      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: (_, id) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-groups'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group', id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-tournaments', id] });

      toast({
        title: 'Statistics recomputed',
        description: 'Tournament group statistics have been recomputed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to recompute statistics',
        description: error.message,
      });
    },
  });
};