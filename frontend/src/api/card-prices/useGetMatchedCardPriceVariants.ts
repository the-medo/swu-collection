import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { CardPriceSourceType } from '../../../../types/CardPrices.ts';
import type { SwuSet } from '../../../../types/enums.ts';

export const matchedCardPriceVariantKeys = {
  all: ['card-prices', 'matched-variants'] as const,
  list: (sourceType: CardPriceSourceType | null, set: SwuSet | null) =>
    [...matchedCardPriceVariantKeys.all, sourceType, set] as const,
};

export function useGetMatchedCardPriceVariants(
  sourceType: CardPriceSourceType | null,
  set: SwuSet | null,
) {
  return useQuery({
    queryKey: matchedCardPriceVariantKeys.list(sourceType, set),
    queryFn: async () => {
      if (!sourceType) throw new Error('A price source is required');

      const response = await api['card-prices']['matched-variants'].$get({
        query: {
          sourceType,
          set: set ?? undefined,
        },
      });
      if (!response.ok) {
        throw await createApiError(response, 'Failed to find matched price variants');
      }

      return (await response.json()).data;
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });
}
