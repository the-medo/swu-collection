import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { calendarSharingKeys } from '@/api/tournaments/calendarSharingKeys.ts';
import type { CalendarPrivacy } from '../../../../types/TournamentCalendar.ts';

export function useCalendarPrivacy() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: calendarSharingKeys.privacy(userId),
    queryFn: userId
      ? async ({ signal }) => {
          const response = await api['user-calendar'].privacy.$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load calendar privacy.');
          return (await response.json()).data.privacy;
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useSetCalendarPrivacy() {
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
    scope: { id: `calendar-privacy:${userId}` },
    gcTime: 0,
    mutationFn: async ({
      userId: owner,
      privacy,
    }: {
      userId: string;
      privacy: CalendarPrivacy;
    }) => {
      if (activeUser.current !== owner) throw new Error('Your account changed. Please try again.');
      const response = await api['user-calendar'].privacy.$patch({ json: { privacy } });
      if (!response.ok) throw await createApiError(response, 'Could not save calendar privacy.');
      return (await response.json()).data.privacy;
    },
    onSuccess: async (privacy, { userId: owner }) => {
      await client.cancelQueries({ queryKey: calendarSharingKeys.privacy(owner) });
      client.setQueryData(calendarSharingKeys.privacy(owner), privacy);
      await client.invalidateQueries({ queryKey: calendarSharingKeys.all });
    },
  });
}
