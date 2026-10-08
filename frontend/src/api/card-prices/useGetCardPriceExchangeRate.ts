import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CardPriceExchangeRate } from '../../../../types/CardPrices.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useGetCardPriceExchangeRate() {
  return useQuery<{ data: CardPriceExchangeRate }, ErrorWithStatus>({
    queryKey: ['card-prices', 'exchange-rate', 'EUR', 'USD'],
    queryFn: async () => {
      const response = await api['card-prices']['exchange-rate'].$get();
      if (!response.ok)
        throw await createApiError(response, 'Failed to load the EUR/USD exchange rate');
      return response.json();
    },
    staleTime: query => (query.state.data?.data.stale ? 60_000 : 15 * 60 * 1000),
    refetchInterval: query =>
      query.state.status === 'error' || query.state.data?.data.stale ? 60_000 : 15 * 60 * 1000,
    retry: 1,
  });
}
