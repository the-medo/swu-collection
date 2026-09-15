import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export const bookmarkKey = (sessionId: string) => [
  ...crossfireKeys.session(sessionId),
  'bookmarks',
];
export function useBookmarks(sessionId: string) {
  return useQuery({
    queryKey: bookmarkKey(sessionId),
    gcTime: 0,
    staleTime: 10_000,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.bookmarks.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load bookmarks');
      return (await response.json()).data;
    },
  });
}
export function useEditBookmark(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; label?: string }) => {
      const route = api.crossfire.bookmarks[':bookmarkId'],
        param = { bookmarkId: input.id };
      const response =
        input.label === undefined
          ? await route.$delete({ param })
          : await route.$patch({ param, json: { label: input.label } });
      if (!response.ok) throw await createApiError(response, 'Could not update bookmark');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: bookmarkKey(sessionId) }),
  });
}
