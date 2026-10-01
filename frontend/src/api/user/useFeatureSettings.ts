import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import {
  featureSettingsSchema,
  type FeatureSettingsValues,
} from '../../../../shared/lib/userSettings.ts';

const key = (userId?: string) => ['feature-settings', userId] as const;

export function useFeatureSettings() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId),
    queryFn: userId
      ? async ({ signal }): Promise<FeatureSettingsValues> => {
          const response = await api['user-settings'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load feature settings.');
          return featureSettingsSchema.parse(await response.json());
        }
      : skipToken,
    // Like calendar preferences, read per account instead of the legacy origin-wide cache.
    staleTime: 5 * 60_000,
    gcTime: 0,
    retry: false,
  });
}

export function useSetFeatureSettings() {
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
    scope: { id: `feature-settings:${userId}` },
    gcTime: 0,
    mutationFn: async ({
      userId: owner,
      settings,
    }: {
      userId: string;
      settings: Partial<FeatureSettingsValues>;
    }) => {
      if (activeUser.current !== owner) throw new Error('Your account changed. Please try again.');
      const response = await api['user-settings'].$post({ json: settings });
      if (!response.ok) throw await createApiError(response, 'Could not save feature settings.');
      return settings;
    },
    onSuccess: async (settings, { userId: owner }) => {
      await client.cancelQueries({ queryKey: key(owner) });
      client.setQueryData<FeatureSettingsValues>(key(owner), current =>
        current ? { ...current, ...settings } : undefined,
      );
    },
  });
}
