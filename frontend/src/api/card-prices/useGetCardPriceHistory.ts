import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { CardVariantPriceHistory } from '../../../../server/db/schema/card_variant_price_history.ts';

/**
 * Parameters for the card price history query
 */
export interface CardPriceHistoryParams {
  cardId?: string;
  variantId?: string;
  sourceType?: string;
  days?: number;
}

/**
 * Response from the card price history API
 */
export interface CardPriceHistoryResponse {
  success: boolean;
  data: CardVariantPriceHistory[];
}

/**
 * Hook for fetching card price history
 * @param params - Parameters for the card price history query
 * @returns Query result with card price history data
 */
export const useGetCardPriceHistory = (params: CardPriceHistoryParams) => {
  const { cardId, variantId, sourceType, days } = params;

  // Either cardId or variantId must be provided
  const isValidQuery = cardId !== undefined || variantId !== undefined;

  return useQuery<CardPriceHistoryResponse, ErrorWithStatus>({
    queryKey: ['card-price-history', cardId, variantId, sourceType, days],
    queryFn: isValidQuery
      ? async () => {
          // Make the API request
          const response = await api['card-prices'].history.$get({
            query: {
              cardId,
              variantId,
              sourceType,
              days: days?.toString(),
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Card price history not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as CardPriceHistoryResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};