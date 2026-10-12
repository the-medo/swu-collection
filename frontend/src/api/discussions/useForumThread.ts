import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from './queryKeys.ts';
import type { PostDocument } from '../../../../shared/posts/content.ts';

export function useForumThread(id: string) {
  const session = useSession();
  return useQuery({
    queryKey: discussionKeys.forumThread(id, session.data?.user.id),
    enabled: !!id && !session.isPending,
    queryFn: async ({ signal }) => {
      const response = await api.discussions.forum[':id'].$get(
        { param: { id } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
      return (await response.json()).data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: false,
  });
}

export function useCreateForumThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; content: PostDocument }) => {
      const response = await api.discussions.forum.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Could not create this discussion.');
      return (await response.json()).data;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: discussionKeys.recent });
    },
  });
}

export function useManageForumThread(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string } | { delete: true }) => {
      const response =
        'delete' in input
          ? await api.discussions.forum[':id'].$delete({ param: { id } })
          : await api.discussions.forum[':id'].$patch({ param: { id }, json: input });
      if (!response.ok) throw await createApiError(response, 'Could not update this discussion.');
      return (await response.json()).data;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: discussionKeys.recent });
      void client.invalidateQueries({ queryKey: discussionKeys.discussion(id) });
      void client.invalidateQueries({ queryKey: discussionKeys.ownCommentsAll });
    },
  });
}
