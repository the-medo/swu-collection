import { SwuRarity, type SwuSet } from '../../../types/enums.ts';
import { cardList } from '../../db/lists.ts';

type CardsByRarity = Record<SwuRarity, string[]>;

const createEmptyCardsByRarity = () => ({
  [SwuRarity.COMMON]: [],
  [SwuRarity.UNCOMMON]: [],
  [SwuRarity.RARE]: [],
  [SwuRarity.LEGENDARY]: [],
  [SwuRarity.SPECIAL]: [],
});

export type CardPoolMap = {
  leaders: CardsByRarity;
  cards: CardsByRarity;
};

const createEmptyCardPoolMap = () => ({
  leaders: createEmptyCardsByRarity(),
  cards: createEmptyCardsByRarity(),
});

export const cardPoolMapBySet: Partial<Record<SwuSet, CardPoolMap>> = {};

export const getCardPoolMap = (set: SwuSet) => {
  if (!cardPoolMapBySet[set]) {
    cardPoolMapBySet[set] = createEmptyCardPoolMap();
    const s = cardPoolMapBySet[set];

    Object.entries(cardList).forEach(([cardId, card]) => {
      if (!card) return;
      const variant = Object.values(card.variants).find(
        variant => variant?.set === set && variant?.variantName === 'Standard',
      );
      if (!variant) return;

      const r = /* variant?.rarity ?? */ card.rarity;

      if (card.type === 'Leader') {
        s.leaders[r].push(cardId);
      } else {
        if ((card.type === 'Base' && r === SwuRarity.COMMON) || card.type.includes('Token')) {
          //we don't save common base cards in the card pool
        } else {
          s.cards[r].push(cardId);
        }
      }
    });
  }
  return cardPoolMapBySet[set];
};
