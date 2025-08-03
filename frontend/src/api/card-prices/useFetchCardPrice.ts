import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * CardMarket listing data structure
 */
export interface CMListingData {
  price: string;
  quantity: number;
}

/**
 * CardMarket pricing data structure
 */
export interface CMPricingData {
  availableItems: number;
  fromPrice: string;
  priceTrend: string;
  averagePrice30Days: string;
  averagePrice7Days: string;
  averagePrice1Day: string;
  topListings: CMListingData[];
}

/**
 * Parameters for fetching card price
 */
export interface FetchCardPriceParams {
  cardId: string;
  variantId: string;
  sourceType: string;
}

/**
 * Response from the fetch card price API
 */
export interface FetchCardPriceResponse {
  success: boolean;
  message?: string;
  data?: CMPricingData;
  error?: string;
}

/**
 * Hook for fetching and updating card price data
 * @returns Mutation for fetching card price
 */
export const useFetchCardPrice = () => {
  return useMutation<FetchCardPriceResponse, ErrorWithStatus, FetchCardPriceParams>({
    mutationFn: async (params: FetchCardPriceParams) => {
      const response = await api['card-prices']['fetch-price'].$post({
        json: params,
      });

      if (!response.ok) {
        if (response.status === 404) {
          const error: ErrorWithStatus = new Error('Card price record not found');
          error.status = 404;
          throw error;
        }
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data as FetchCardPriceResponse;
    },
  });
};