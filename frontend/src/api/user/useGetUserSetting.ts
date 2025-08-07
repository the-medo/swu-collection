import { useQuery } from '@tanstack/react-query';
import { loadUserSetting } from '@/dexie/userSettings';
import { UserSettings } from '../../../../shared/lib/userSettings.ts';

/**
 * Hook to get a user setting from IndexedDB
 * @param key The setting key to retrieve
 * @returns Query result with the setting value, properly typed based on the key
 */
export const useGetUserSetting = <K extends keyof UserSettings>(key: K) => {
  return useQuery({
    queryKey: ['user-setting', key],
    queryFn: async () => {
      // Load the setting from IndexedDB
      const value = await loadUserSetting(key);

      // Parse the value to the correct type based on the key
      if (value === 'true' || value === 'false') {
        // @ts-ignore
        return (value === 'true') as UserSettings[K];
      }

      return value as UserSettings[K];
    },
    staleTime: Infinity, // Settings don't change unless explicitly updated
  });
};
