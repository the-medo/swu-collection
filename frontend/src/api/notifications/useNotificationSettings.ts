import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { notificationKeys } from './queryKeys.ts';
import {
  notificationSettingsSchema,
  type NotificationSettingsValues,
} from '../../../../shared/lib/userSettings.ts';

export function useNotificationSettings() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: notificationKeys.settings(userId),
    queryFn: userId
      ? async ({ signal }) => {
          const response = await api['user-settings'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load notification settings.');
          return notificationSettingsSchema.parse(await response.json());
        }
      : skipToken,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}
export function useSetNotificationSettings() {
  const userId = useUser()?.id;
  const active = useRef(userId);
  useEffect(() => {
    active.current = userId;
    return () => {
      active.current = undefined;
    };
  }, [userId]);
  const client = useQueryClient();
  return useMutation({
    scope: { id: `notification-settings:${userId}` },
    gcTime: 0,
    mutationFn: async ({
      userId: owner,
      settings,
    }: {
      userId: string;
      settings: Partial<NotificationSettingsValues>;
    }) => {
      if (active.current !== owner) throw new Error('Your account changed. Please try again.');
      const response = await api['user-settings'].$post({ json: settings });
      if (!response.ok)
        throw await createApiError(response, 'Could not save notification settings.');
    },
    onSuccess: (_data, { userId: owner }) =>
      client.invalidateQueries({ queryKey: notificationKeys.settings(owner) }),
  });
}
