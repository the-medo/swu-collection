import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { createApiError } from '@/api/errors';
import { battlefieldKeys } from '@/api/battlefield/useBattlefield';
import { userProfileKeys } from '@/api/user-profile/queryKeys';
import { walletKeys } from './queryKeys';
import { creditKeys } from '@/api/credits/queryKeys';
import type { ShopPurchaseInput } from '../../../../shared/types/credits';

export function useShop(active = true) {
  const owner = useUser();
  return useQuery({
    queryKey: walletKeys.shop(owner?.id),
    staleTime: 0,
    gcTime: 0,
    queryFn:
      owner && active
        ? async () => {
            const response = await api.shop.$get();
            if (!response.ok) throw await createApiError(response, 'Could not load the shop.');
            return (await response.json()).data;
          }
        : skipToken,
  });
}

export function useShopPurchase() {
  const owner = useUser();
  const client = useQueryClient();
  const refresh = async () => {
    if (!owner) return;
    await Promise.all([
      client.invalidateQueries({ queryKey: walletKeys.all(owner.id) }),
      client.invalidateQueries({ queryKey: walletKeys.shop(owner.id) }),
      client.invalidateQueries({ queryKey: battlefieldKeys.editor(owner.id) }),
      client.invalidateQueries({ queryKey: userProfileKeys.achievements(owner.id) }),
      client.invalidateQueries({ queryKey: creditKeys.all }),
    ]);
  };
  return useMutation({
    mutationFn: async (input: ShopPurchaseInput) => {
      const response = await api.shop.purchases.$post(
        { json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not complete your purchase.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
    // A lost response may follow a committed purchase. Refresh balances and entitlements either way.
    onError: refresh,
  });
}
