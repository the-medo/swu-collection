import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authClient, useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { notificationKeys } from './queryKeys.ts';
import type {
  NotificationCursor,
  NotificationPage,
} from '../../../../shared/types/notifications.ts';

export function useNotificationSummary() {
  const sessionId = useSession().data?.session.id;
  return useQuery({
    queryKey: notificationKeys.summary(sessionId),
    queryFn: sessionId
      ? async ({ signal }) => {
          const response = await api.notifications.summary.$get({}, { init: { signal } });
          if (!response.ok) throw await createApiError(response, 'Could not load notifications.');
          return response.json();
        }
      : skipToken,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}

export function useNotifications() {
  const sessionId = useSession().data?.session.id;
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox(sessionId),
    initialPageParam: null as NotificationCursor | null,
    queryFn: sessionId
      ? async ({ pageParam, signal }): Promise<NotificationPage> => {
          const response = await api.notifications.$get(
            { query: pageParam ? { cursor: JSON.stringify(pageParam) } : {} },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load notifications.');
          return response.json();
        }
      : skipToken,
    getNextPageParam: page => page.nextCursor,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}

export function useUnreadNotifications() {
  const sessionId = useSession().data?.session.id;
  return useQuery({
    queryKey: notificationKeys.unread(sessionId),
    queryFn: sessionId
      ? async ({ signal }) => {
          const response = await api.notifications.unread.$get({}, { init: { signal } });
          if (!response.ok) throw await createApiError(response, 'Could not load notifications.');
          return response.json();
        }
      : skipToken,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}

export function useUpdateNotification() {
  const sessionId = useSession().data?.session.id;
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (
      input: { action: 'read-all' } | { action: 'read' | 'unread' | 'archive'; id: string },
    ) => {
      // Closing a popup must not cancel a queued action; compare the shared auth state instead.
      const activeSessionId = authClient.$store.atoms.session.get().data?.session.id;
      if (!sessionId || activeSessionId !== sessionId)
        throw new Error('Your account changed. Please try again.');
      const response =
        input.action === 'read-all'
          ? await api.notifications['read-all'].$post()
          : await api.notifications[':id'].$patch({
              param: { id: input.id },
              json: { action: input.action },
            });
      if (!response.ok) throw await createApiError(response, 'Could not update notification.');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.account(sessionId) }),
  });
}
