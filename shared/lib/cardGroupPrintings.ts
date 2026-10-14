import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../lib/swu-resources/types.ts';

export type CardPrinting = { card: CardDataWithVariants<CardListVariants>; variant: CardVariant };

export function indexCardPrintings(cards: CardList): Map<string, CardPrinting> {
  const index = new Map<string, CardPrinting>();
  for (const card of Object.values(cards)) {
    if (!card) continue;
    for (const variant of Object.values(card.variants)) {
      if (variant) index.set(variant.variantId, { card, variant });
    }
  }
  return index;
}

// Preserve the editor's order, including different versions of the same logical card.
export function resolveCardGroupPrintings(index: Map<string, CardPrinting>, variantIds: string[]) {
  return variantIds.flatMap(id => {
    const printing = index.get(id);
    return printing ? [printing] : [];
  });
}
