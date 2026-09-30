import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CalendarSubscription } from '../../../../types/CalendarSubscription.ts';

const key = (userId: string | undefined) => ['calendar-subscription', userId] as const;
const options = { headers: { 'X-Requested-With': 'swubase' } };
export type SubscriptionAction = 'enable' | 'regenerate' | 'disable';

export function useCalendarSubscription() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId),
    queryFn: userId
      ? async ({ signal }): Promise<CalendarSubscription> => {
          const response = await api['user-calendar-subscription'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load your calendar subscription.');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useChangeCalendarSubscription() {
  const userId = useUser()?.id;
  const activeUser = useRef(userId);
  useEffect(() => {
    activeUser.current = userId;
    return () => {
      activeUser.current = undefined;
    };
  }, [userId]);
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...key(userId), 'change'],
    scope: { id: `calendar-subscription:${userId}` },
    gcTime: 0,
    onMutate: () => client.cancelQueries({ queryKey: key(userId) }),
    mutationFn: async (action: SubscriptionAction): Promise<CalendarSubscription> => {
      if (!userId || activeUser.current !== userId)
        throw new Error('Your account changed. Please try again.');
      const route = api['user-calendar-subscription'];
      const response =
        action === 'enable'
          ? await route.$put({}, options)
          : action === 'regenerate'
            ? await route.regenerate.$post({}, options)
            : await route.$delete({}, options);
      if (!response.ok)
        throw await createApiError(response, 'Could not update your calendar subscription.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      if (activeUser.current !== userId) return;
      await client.cancelQueries({ queryKey: key(userId) });
      if (activeUser.current === userId) client.setQueryData(key(userId), data);
    },
  });
}
