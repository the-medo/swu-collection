import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Parameters for deleting a card price source
 */
export interface DeleteCardPriceSourceParams {
  cardId: string;
  variantId: string;
  sourceType: string;
}

/**
 * Response from the delete card price source API
 */
export interface DeleteCardPriceSourceResponse {
  success: boolean;
  message: string;
}

/**
 * Hook for deleting a card price source
 * @returns Mutation for deleting card price source
 */
export const useDeleteCardPriceSource = () => {
  return useMutation<DeleteCardPriceSourceResponse, ErrorWithStatus, DeleteCardPriceSourceParams>({
    mutationFn: async (params: DeleteCardPriceSourceParams) => {
      const response = await api['card-prices'].$delete({
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
      return data as DeleteCardPriceSourceResponse;
    },
  });
};