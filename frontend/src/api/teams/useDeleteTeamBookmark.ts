import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import { teamBookmarkQueryKeys } from './bookmarkQueryKeys.ts';

export function useDeleteTeamBookmark(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      const response = await api.teams[':id'].bookmarks[':bookmarkId'].$delete({
        param: { id: teamId, bookmarkId },
      });
      if (!response.ok) throw await createApiError(response, 'Unable to remove bookmark');
      return (await response.json()).data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamBookmarkQueryKeys.team(teamId) }),
    onError: (error: Error) =>
      toast({
        variant: 'destructive',
        title: 'Unable to remove bookmark',
        description: error.message,
      }),
  });
}
