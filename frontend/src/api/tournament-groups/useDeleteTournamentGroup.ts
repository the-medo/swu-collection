import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useDeleteTournamentGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api['tournament-groups'][':id'].$delete({
        param: { id },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to delete tournament group');
      }

      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: (_, id) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tournament-groups'] });
      queryClient.removeQueries({ queryKey: ['tournament-group', id] });
      queryClient.removeQueries({ queryKey: ['tournament-group-tournaments', id] });

      toast({
        title: 'Tournament group deleted successfully',
        description: 'The tournament group has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete tournament group',
        description: error.message,
      });
    },
  });
};