import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import {
  sidebarSettingsSchema,
  type SidebarSettingsValues,
} from '../../../../shared/lib/userSettings.ts';

const key = (userId?: string) => ['sidebar-settings', userId] as const;

export function useSidebarSettings() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId),
    queryFn: userId
      ? async ({ signal }): Promise<SidebarSettingsValues> => {
          const response = await api['user-settings'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load sidebar settings.');
          return sidebarSettingsSchema.parse(await response.json());
        }
      : skipToken,
    // Like calendar preferences, read per account instead of the legacy origin-wide cache.
    staleTime: 5 * 60_000,
    gcTime: 0,
    retry: false,
  });
}

export function useSetSidebarSettings() {
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
    scope: { id: `sidebar-settings:${userId}` },
    gcTime: 0,
    mutationFn: async ({
      userId: owner,
      settings,
    }: {
      userId: string;
      settings: Partial<SidebarSettingsValues>;
    }) => {
      if (activeUser.current !== owner) throw new Error('Your account changed. Please try again.');
      const response = await api['user-settings'].$post({ json: settings });
      if (!response.ok) throw await createApiError(response, 'Could not save sidebar settings.');
      return settings;
    },
    onSuccess: async (settings, { userId: owner }) => {
      await client.cancelQueries({ queryKey: key(owner) });
      client.setQueryData<SidebarSettingsValues>(key(owner), current =>
        current ? { ...current, ...settings } : undefined,
      );
    },
  });
}
