import { skipToken, useQuery } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { CardVariantPriceStore, getStoredCardVariantPrice } from '@/dexie/cardPrices';

/**
 * Card variant price data structure
 */
export interface CardVariantPrice {
  cardId: string;
  variantId: string;
  sourceType: string;
  sourceLink: string;
  updatedAt: string | null;
  data: string;
  price: string;
}

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
  data: CardVariantPriceStore | undefined;
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
    queryKey: ['single-card-price', variantId, sourceType],
    queryFn: isValidQuery
      ? async () => {
          // Fetch from IndexedDB
          const result = await getStoredCardVariantPrice(cardId, variantId, sourceType);

          if (!result) {
            // If not found in IndexedDB, throw a 404 error
            const error: ErrorWithStatus = new Error('Card price not found');
            error.status = 404;
            throw error;
          }

          // Transform the result to match the expected format
          return {
            success: true,
            data: result,
          } as SingleCardPriceResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
