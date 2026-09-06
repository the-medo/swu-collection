import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../types/enums.ts';

export type MatchedCardPriceVariant = {
  cardId: string;
  variantId: string;
};

export function filterMatchedCardPriceVariantsBySet(
  rows: MatchedCardPriceVariant[],
  cardList: CardList,
  set: SwuSet,
): MatchedCardPriceVariant[] {
  return rows.filter(row => cardList[row.cardId]?.variants[row.variantId]?.set === set);
}
