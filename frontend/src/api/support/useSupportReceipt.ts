import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { useUser } from '@/hooks/useUser';
import { walletKeys } from '@/api/wallet/queryKeys';
import { userProfileKeys } from '@/api/user-profile/queryKeys';
import { creditKeys } from '@/api/credits/queryKeys';
import { battlefieldKeys } from '@/api/battlefield/useBattlefield';
import { supportKeys } from './queryKeys';

export function useSupportReceipt(requestId?: string) {
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const receipt = useQuery({
    queryKey: supportKeys.receipt(user?.id, requestId),
    enabled: Boolean(user && requestId),
    staleTime: 0,
    retry: 2,
    refetchInterval: query =>
      query.state.data?.status === 'pending' && query.state.dataUpdateCount < 30 ? 2000 : false,
    queryFn: async () => {
      if (!requestId || !user) throw new Error('Sign in to check your support payment.');
      const response = await api.support.checkout[':id'].confirm.$post(
        { param: { id: requestId } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not verify this payment.');
      return (await response.json()).data;
    },
  });
  useEffect(() => {
    if (!userId || !['paid', 'review'].includes(receipt.data?.status ?? '')) return;
    void queryClient.invalidateQueries({ queryKey: walletKeys.all(userId) });
    void queryClient.invalidateQueries({ queryKey: walletKeys.shops });
    void queryClient.invalidateQueries({ queryKey: battlefieldKeys.editor(userId) });
    void queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(userId) });
    void queryClient.invalidateQueries({ queryKey: creditKeys.all });
    void queryClient.invalidateQueries({ queryKey: supportKeys.overview(userId) });
  }, [userId, receipt.data?.status, queryClient]);
  return receipt;
}
