import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
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
