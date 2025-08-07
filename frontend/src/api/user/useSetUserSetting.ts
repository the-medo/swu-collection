import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { saveUserSetting } from '@/dexie/userSettings';
import { UserSettings } from '../../../../shared/lib/userSettings.ts';
import { useUser } from '@/hooks/useUser';

/**
 * Hook to set a user setting
 * - Saves the setting through the API (only if user is logged in)
 * - Updates the cache of useGetUserSetting
 * - Saves the setting to IndexedDB
 *
 * @returns Mutation function and status
 */
export const useSetUserSetting = <K extends keyof UserSettings>(key: K) => {
  const queryClient = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: async (value: UserSettings[K]) => {
      // Convert value to string for storage
      const stringValue = String(value);

      // 1. Save through API only if user is logged in
      if (user) {
        const response = await api['user-settings'].$post({
          json: {
            key,
            value: stringValue,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to save user setting: ${response.status} ${response.statusText}`);
        }
      }

      // Always save to IndexedDB and update query cache, even if user is not logged in
      await saveUserSetting(key, stringValue);
      queryClient.setQueryData(['user-setting', key], value);
    },
  });
};
