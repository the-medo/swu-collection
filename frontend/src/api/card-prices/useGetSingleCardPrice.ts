import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { CardVariantPrice } from '../../../../server/db/schema/card_variant_price.ts';

/**
 * Parameters for the single card price query
 */
export interface SingleCardPriceParams {
  cardId: string;
  variantId: string;
  sourceType: string;
}

/**
 * Response from the single card price API
 */
export interface SingleCardPriceResponse {
  success: boolean;
  data: CardVariantPrice | undefined;
}

/**
 * Hook for fetching a single card price
 * @param params - Parameters for the single card price query
 * @returns Query result with single card price data
 */
export const useGetSingleCardPrice = (params: SingleCardPriceParams) => {
  const { cardId, variantId, sourceType } = params;

  // All parameters are required
  const isValidQuery = cardId !== undefined && variantId !== undefined && sourceType !== undefined;

  return useQuery<SingleCardPriceResponse, ErrorWithStatus>({
    queryKey: ['single-card-price', cardId, variantId, sourceType],
    queryFn: isValidQuery
      ? async () => {
          // Make the API request
          const response = await api['card-prices'].$get({
            query: {
              cardId,
              variantId,
              sourceType,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Card price not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as SingleCardPriceResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};