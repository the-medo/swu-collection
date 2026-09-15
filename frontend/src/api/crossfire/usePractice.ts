import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export const practiceKey = (sessionId: string) => [...crossfireKeys.session(sessionId), 'practice'];
export function usePractice(sessionId: string) {
  return useQuery({
    queryKey: practiceKey(sessionId),
    gcTime: 0,
    staleTime: 5000,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.practice.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load practice invitations');
      return (await response.json()).data;
    },
    // Coordination metadata does not touch the replay cache or load engine states.
    refetchInterval: query => (query.state.data?.some(r => r.status === 'pending') ? 5000 : false),
  });
}
export function useRequestPractice(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      const response = await api.crossfire.bookmarks[':bookmarkId'].practice.$post({
        param: { bookmarkId },
        json: { requestId: crypto.randomUUID() },
      });
      if (!response.ok)
        throw await createApiError(
          response,
          'This position cannot start a practice invitation. The source must be finalized and both original players available.',
        );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: practiceKey(sessionId) }),
  });
}
export function useDeclinePractice(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.crossfire.practice[':requestId'].$delete({ param: { requestId } });
      if (!response.ok) throw await createApiError(response, 'Could not close the invitation');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: practiceKey(sessionId) }),
  });
}
