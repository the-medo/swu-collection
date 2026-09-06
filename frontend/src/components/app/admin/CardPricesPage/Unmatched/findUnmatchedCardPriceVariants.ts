import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../../../../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../../../../../types/enums.ts';

export type MatchedCardPriceVariant = {
  cardId: string;
  variantId: string;
};

export type UnmatchedCardPriceVariant = {
  card: CardDataWithVariants<CardListVariants>;
  cardId: string;
  variant: CardVariant;
};

const identificationKey = (cardId: string, variantId: string) => `${cardId}|${variantId}`;

export function findUnmatchedCardPriceVariants(
  cardList: CardList,
  matchedVariants: MatchedCardPriceVariant[],
  set: SwuSet | null,
): UnmatchedCardPriceVariant[] {
  const matchedKeys = new Set(
    matchedVariants.map(row => identificationKey(row.cardId, row.variantId)),
  );
  const unmatched: UnmatchedCardPriceVariant[] = [];

  Object.entries(cardList).forEach(([cardId, card]) => {
    if (!card) return;

    Object.values(card.variants).forEach(variant => {
      if (!variant || (set && variant.set !== set)) return;
      if (matchedKeys.has(identificationKey(cardId, variant.variantId))) return;

      unmatched.push({ card, cardId, variant });
    });
  });

  return unmatched.sort(
    (a, b) =>
      a.variant.set.localeCompare(b.variant.set) ||
      a.variant.cardNo - b.variant.cardNo ||
      a.card.name.localeCompare(b.card.name) ||
      a.variant.variantName.localeCompare(b.variant.variantName),
  );
}
