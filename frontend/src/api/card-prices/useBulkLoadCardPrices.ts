import { useMutation } from '@tanstack/react-query';
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
 * Parameters for the bulk load card prices request
 */
export interface BulkLoadCardPricesParams {
  sourceType?: string;
  variantIds: string[];
}

/**
 * Response from the bulk load card prices API
 */
export interface BulkLoadCardPricesResponse {
  success: boolean;
  data: CardVariantPrice[];
}

/**
 * Hook for bulk loading card prices
 * @returns Mutation for bulk loading card prices
 */
export const useBulkLoadCardPrices = () => {
  return useMutation<BulkLoadCardPricesResponse, ErrorWithStatus, BulkLoadCardPricesParams>({
    mutationFn: async (params: BulkLoadCardPricesParams) => {
      const response = await api['card-prices']['bulk-load'].$post({
        json: params,
      });

      if (!response.ok) {
        if (response.status === 404) {
          const error: ErrorWithStatus = new Error('Card prices not found');
          error.status = 404;
          throw error;
        }
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data as BulkLoadCardPricesResponse;
    },
  });
};