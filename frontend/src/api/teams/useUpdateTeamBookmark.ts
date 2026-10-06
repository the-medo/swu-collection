import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import { teamBookmarkQueryKeys } from './bookmarkQueryKeys.ts';
import type { ZTeamBookmarkRequest } from '../../../../types/ZTeamBookmark.ts';

export function useUpdateTeamBookmark(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookmarkId,
      ...payload
    }: ZTeamBookmarkRequest & { bookmarkId: string }) => {
      const response = await api.teams[':id'].bookmarks[':bookmarkId'].$patch({
        param: { id: teamId, bookmarkId },
        json: payload,
      });
      if (!response.ok) throw await createApiError(response, 'Unable to update bookmark');
      return (await response.json()).data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamBookmarkQueryKeys.team(teamId) }),
    onError: (error: Error) =>
      toast({
        variant: 'destructive',
        title: 'Unable to update bookmark',
        description: error.message,
      }),
  });
}
