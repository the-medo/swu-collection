import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { calendarWeekStartSchema, type UserSettings } from '../../../../shared/lib/userSettings.ts';

type WeekStart = UserSettings['calendarWeekStartsOn'];
const key = (userId?: string) => ['calendar-week-start', userId] as const;

export function useCalendarWeekStart() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId),
    queryFn: userId
      ? async ({ signal }): Promise<WeekStart> => {
          const response = await api['user-settings'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load calendar settings.');
          return calendarWeekStartSchema.parse((await response.json()).calendarWeekStartsOn ?? 1);
        }
      : skipToken,
    // Read per account instead of reusing the legacy origin-wide preference cache.
    staleTime: 5 * 60_000,
    gcTime: 0,
    retry: false,
  });
}

export function useSetCalendarWeekStart() {
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
    scope: { id: `calendar-week-start:${userId}` },
    gcTime: 0,
    mutationFn: async ({ userId: owner, day }: { userId: string; day: WeekStart }) => {
      if (activeUser.current !== owner) throw new Error('Your account changed. Please try again.');
      const response = await api['user-settings'].$post({ json: { calendarWeekStartsOn: day } });
      if (!response.ok) throw await createApiError(response, 'Could not save calendar settings.');
      return day;
    },
    onSuccess: async (day, { userId: owner }) => {
      await client.cancelQueries({ queryKey: key(owner) });
      client.setQueryData(key(owner), day);
    },
  });
}
