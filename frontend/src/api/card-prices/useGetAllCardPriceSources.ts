import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

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
 * Parameters for the all card price sources query
 */
export interface AllCardPriceSourcesParams {
  cardId: string;
  variantId: string;
}

/**
 * Response from the all card price sources API
 */
export interface AllCardPriceSourcesResponse {
  success: boolean;
  data: CardVariantPrice[];
}

/**
 * Hook for fetching all card price sources for a variant
 * @param params - Parameters for the all card price sources query
 * @returns Query result with all card price sources data
 */
export const useGetAllCardPriceSources = (params: AllCardPriceSourcesParams) => {
  const { cardId, variantId } = params;

  // All parameters are required
  const isValidQuery = cardId !== undefined && variantId !== undefined;

  return useQuery<AllCardPriceSourcesResponse, ErrorWithStatus>({
    queryKey: ['all-card-price-sources', cardId, variantId],
    queryFn: isValidQuery
      ? async () => {
          // Make the API request
          const response = await api['card-prices']['sources'].$get({
            query: {
              cardId,
              variantId,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Card price sources not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as AllCardPriceSourcesResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
