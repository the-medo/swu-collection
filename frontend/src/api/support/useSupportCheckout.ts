import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import type { SupportCheckoutInput } from '../../../../shared/types/support';
import { supportKeys } from './queryKeys';

const options = { headers: { 'X-Requested-With': 'swubase' } };
export function useSupportCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupportCheckoutInput) => {
      const response = await api.support.checkout.$post({ json: input }, options);
      if (!response.ok) throw await createApiError(response, 'Could not open checkout.');
      return (await response.json()).data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
export function useCancelSupportCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.support.checkout[':id'].cancel.$post({ param: { id } }, options);
      if (!response.ok) throw await createApiError(response, 'Could not cancel checkout.');
      return (await response.json()).data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
export function useSupportPortal() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.support.portal.$post({}, options);
      if (!response.ok)
        throw await createApiError(response, 'Could not open subscription management.');
      return (await response.json()).data;
    },
  });
}
