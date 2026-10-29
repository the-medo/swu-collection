import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { creatorKeys } from './keys.ts';
import { hubApi } from './client.ts';
export function useCreatorDeletionPreview(id: string) {
  const user = useUser();
  return useQuery({
    queryKey: [...creatorKeys.deletion(id), user?.id],
    queryFn: () => hubApi.deletionPreview(id),
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    retry: (failureCount, error) => {
      const status = (error as Error & { status?: number }).status;
      return failureCount < 1 && (status === undefined || status >= 500);
    },
    // Never replace a summary the owner has already confirmed in the background.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
export function useHubQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  enabled = true,
  privateData = false,
  options?: { keepPreviousData?: boolean },
) {
  const user = useUser();
  return useQuery({
    queryKey: [...key, ...(privateData ? [user?.id] : [])],
    queryFn,
    placeholderData: !privateData && options?.keepPreviousData ? keepPreviousData : undefined,
    enabled: enabled && (!privateData || !!user),
    staleTime: privateData ? 0 : 60_000,
    gcTime: privateData ? 0 : 5 * 60_000,
    retry: 1,
  });
}
