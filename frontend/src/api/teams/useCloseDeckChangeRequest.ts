import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useCloseDeckChangeRequest = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!teamId) throw new Error('Team id is required');
      const response = await api.teams[':id']['change-requests'][':requestId'].close.$post({
        param: { id: teamId, requestId },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to close request');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-change-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
      toast({ title: 'Change request closed' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while closing change request',
        description: error.message,
      });
    },
  });
};

