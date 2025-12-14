import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { batchStoreCardVariantPrices } from '@/dexie/cardPrices';
import { CardPriceSourceType } from '../../../../types/CardPrices.ts';

/**
 * Card variant price data structure
 */
export interface CardVariantPrice {
  cardId: string;
  variantId: string;
  sourceType: string;
  sourceLink: string;
  updatedAt: string | null | Date;
  data: string | null;
  price: string | null;
}

/**
 * Parameters for the bulk load card prices request
 */
export interface BulkLoadCardPricesParams {
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
      const mapBySourceType: Record<CardPriceSourceType, string[]> = {
        [CardPriceSourceType.CARDMARKET]: [],
        [CardPriceSourceType.TCGPLAYER]: [],
        [CardPriceSourceType.SWUBASE]: [],
      };

      params.variantIds.forEach(variantIdWithSourceType => {
        const [variantId, sourceType] = variantIdWithSourceType.split('|') as [
          string,
          CardPriceSourceType | undefined,
        ];
        if (!sourceType || !mapBySourceType[sourceType]) return; //unknown source type
        mapBySourceType[sourceType].push(variantId);
      });

      let finalData: CardVariantPrice[] = [];

      for (const [sourceType, variantIds] of Object.entries(mapBySourceType)) {
        if (variantIds.length === 0) continue;
        const response = await api['card-prices']['bulk-load'].$post({
          json: {
            variantIds,
            sourceType,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            const error: ErrorWithStatus = new Error('Card prices not found');
            error.status = 404;
            throw error;
          }
          throw new Error('Something went wrong');
        }

        const data = (await response.json()) as BulkLoadCardPricesResponse;

        if (data.success) {
          // Create a set of variant IDs that were found in the response
          const foundVariantIds = new Set(data.data.map(price => price.variantId));

          // Create placeholder entries for variants that were not found
          const placeholderEntries = variantIds
            .filter(variantId => !foundVariantIds.has(variantId))
            .map(variantId => ({
              cardId: '',
              variantId: variantId,
              sourceType: sourceType || '',
              sourceLink: '',
              updatedAt: new Date(),
              data: null,
              price: null,
            }));

          // Combine real entries with placeholder entries
          const allEntries = [
            ...data.data.map(price => ({
              cardId: price.cardId,
              variantId: price.variantId,
              sourceType: price.sourceType,
              sourceLink: price.sourceLink,
              updatedAt: price.updatedAt ? new Date(price.updatedAt) : null,
              data: price.data,
              price: price.price,
            })),
            ...placeholderEntries,
          ];

          // Store all entries in IndexedDB
          if (allEntries.length > 0) {
            await batchStoreCardVariantPrices(allEntries);
          }

          finalData.push(...allEntries);
        }
      }

      return { success: true, data: finalData };
    },
  });
};
