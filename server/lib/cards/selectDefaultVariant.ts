import type { CardDataWithVariants, CardListVariants } from '../../../lib/swu-resources/types.ts';

export const selectDefaultVariant = (
  card: CardDataWithVariants<CardListVariants>,
  defaultVariantName: string = 'Standard',
) => {
  const variantIds = Object.keys(card.variants);

  if (variantIds.length === 0) return undefined;

  let defaultVariant = variantIds.find(id => card.variants[id]?.variantName === defaultVariantName);
  if (!defaultVariant) {
    defaultVariant = variantIds.find(id => card.variants[id]?.baseSet === true) ?? variantIds[0];
  }

  return defaultVariant;
};
