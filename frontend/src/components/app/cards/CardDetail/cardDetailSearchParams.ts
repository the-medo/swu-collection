import { z } from 'zod';

export const cardDetailTabSchema = z.enum([
  'details',
  'variants',
  'decks',
  'price-history',
  'rules-discussion',
]);
export type CardDetailTab = z.infer<typeof cardDetailTabSchema>;

export const cardDetailVariantIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .optional()
  .catch(undefined);

export const cardDetailSearchParams = z.object({
  cardTab: cardDetailTabSchema.optional().catch(undefined),
  cardVariantId: cardDetailVariantIdSchema,
  cardComment: z.guid().optional().catch(undefined),
});

export function getCardDetailDialogSearch<T extends object>(
  previous: T,
  cardId: string,
  variantId?: string,
): Omit<T, 'modalCardId' | 'modalCardTab' | 'modalCardVariantId'> & {
  modalCardId: string;
  modalCardTab: undefined;
  modalCardVariantId: string | undefined;
} {
  return {
    ...previous,
    modalCardId: cardId,
    modalCardTab: undefined,
    modalCardVariantId: variantId,
  };
}
