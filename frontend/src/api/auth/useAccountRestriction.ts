import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import type { AccountRestrictionNotice } from '../../../../shared/types/accountRestriction';

const queryKey = ['auth', 'account-restriction'];
type RestrictionCheck = { notice: AccountRestrictionNotice; current: boolean };

export function useAccountRestriction(enabled: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey,
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: query => {
      const check = query.state.data;
      if (!check?.current) return false;
      if (check.notice.status === 'banned') return 60000;
      if (check.notice.status !== 'suspended') return false;
      // Refresh promptly near expiry, without polling long suspensions constantly.
      return new Date(check.notice.expiresAt).getTime() - Date.now() > 60000 ? 60000 : 5000;
    },
    queryFn: async (): Promise<RestrictionCheck> => {
      // This is a Better Auth plugin endpoint, outside the Hono RPC contract.
      const { data, error } = await authClient.$fetch<AccountRestrictionNotice>(
        '/account-restriction',
        { cache: 'no-store' },
      );
      if (error || !data) throw new Error('Could not check your account status.');
      if (data.status === 'unknown') {
        const previous = queryClient.getQueryData<RestrictionCheck>(queryKey)?.notice;
        // Keep the last verified restriction visible in this page's memory when
        // proof expires. The UI labels it stale and never infers restored access.
        if (previous?.status === 'suspended' || previous?.status === 'banned') {
          return { notice: previous, current: false };
        }
      }
      // Better Auth revives ISO values as Date objects; keep this API contract
      // serializable, including the <time> element's datetime attribute.
      if (data.status === 'suspended') {
        return {
          notice: { ...data, expiresAt: new Date(data.expiresAt).toISOString() },
          current: true,
        };
      }
      return { notice: data, current: data.status !== 'unknown' };
    },
  });
}
