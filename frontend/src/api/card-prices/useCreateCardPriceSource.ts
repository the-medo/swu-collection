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
  data: string | null;
}

/**
 * Parameters for creating a card price source
 */
export interface CreateCardPriceSourceParams {
  cardId: string;
  variantId: string;
  sourceType: string;
  sourceLink: string;
}

/**
 * Response from the create card price source API
 */
export interface CreateCardPriceSourceResponse {
  success: boolean;
  data: CardVariantPrice;
}

/**
 * Hook for creating or updating a card price source
 * @returns Mutation for creating card price source
 */
export const useCreateCardPriceSource = () => {
  return useMutation<CreateCardPriceSourceResponse, ErrorWithStatus, CreateCardPriceSourceParams>({
    mutationFn: async (params: CreateCardPriceSourceParams) => {
      const response = await api['card-prices']['create-source'].$post({
        json: params,
      });

      if (!response.ok) {
        if (response.status === 404) {
          const error: ErrorWithStatus = new Error('Card price source not found');
          error.status = 404;
          throw error;
        }
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data as CreateCardPriceSourceResponse;
    },
  });
};
