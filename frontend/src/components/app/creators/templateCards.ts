import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import type { TemplateCard } from '../../../../../shared/types/ArticleTemplates.ts';

export function templateCards(catalog: CardList, set?: string): TemplateCard[] {
  return Object.values(catalog).flatMap(card => {
    if (!card || card.type.includes('Token')) return [];
    const printing = set
      ? Object.values(card.variants).find(variant => variant?.set === set && variant.baseSet)
      : undefined;
    if (set && !printing) return [];
    const variantId = printing?.variantId ?? selectDefaultVariant(card);
    return [
      {
        cardId: card.cardId,
        variantId: variantId ?? '',
        name: card.name,
        type: card.type,
        cost: card.cost,
        rarity: card.rarity,
      },
    ];
  });
}
