import type { CardDataWithVariants, CardListVariants } from '../../lib/swu-resources/types.ts';

export const isBasicBase = (card: CardDataWithVariants<CardListVariants> | undefined) => {
  if (!card) return false;
  return (card.text === '' || !card.text) && card.hp === 30;
};
