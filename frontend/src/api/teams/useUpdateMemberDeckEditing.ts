import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useUpdateMemberDeckEditing = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      allowTeamDeckEdits,
    }: {
      userId: string;
      allowTeamDeckEdits: boolean;
    }) => {
      if (!teamId) throw new Error('Team id is required');
      const response = await api.teams[':id'].members[':userId'].$patch({
        param: { id: teamId, userId },
        json: { allowTeamDeckEdits },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to update deck editing');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
    onError: (error: Error) =>
      toast({
        variant: 'destructive',
        title: 'Unable to update shared deck editing',
        description: error.message,
      }),
  });
};
