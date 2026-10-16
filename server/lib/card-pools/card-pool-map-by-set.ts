import { SwuRarity, type SwuSet } from '../../../types/enums.ts';
import { cardList } from '../../db/lists.ts';
import { getBoosterPackRules } from './booster-pack-rules.ts';

type CardsByRarity = Record<SwuRarity, string[]>;

const createEmptyCardsByRarity = () => ({
  [SwuRarity.COMMON]: [],
  [SwuRarity.UNCOMMON]: [],
  [SwuRarity.RARE]: [],
  [SwuRarity.LEGENDARY]: [],
  [SwuRarity.SPECIAL]: [],
});

export type CardPoolMap = {
  set: SwuSet;
  leaders: CardsByRarity;
  cards: CardsByRarity;
  hyperspace: CardsByRarity;
  foil: CardsByRarity;
  prestige: string[];
};

const createEmptyCardPoolMap = (set: SwuSet): CardPoolMap => ({
  set,
  leaders: createEmptyCardsByRarity(),
  cards: createEmptyCardsByRarity(),
  hyperspace: createEmptyCardsByRarity(),
  foil: createEmptyCardsByRarity(),
  prestige: [],
});

export const cardPoolMapBySet: Partial<Record<SwuSet, CardPoolMap>> = {};

export const getCardPoolMap = (set: SwuSet) => {
  if (!cardPoolMapBySet[set]) {
    const rules = getBoosterPackRules(set);
    const s = createEmptyCardPoolMap(set);

    Object.entries(cardList).forEach(([cardId, card]) => {
      if (!card) return;
      const variants = Object.values(card.variants).filter(variant => variant?.set === set);
      const standard = variants.some(v => v?.variantName === 'Standard');
      const r = card.rarity;

      if (card.type === 'Leader') {
        if (standard) s.leaders[r].push(cardId);
      } else {
        if ((card.type === 'Base' && r === SwuRarity.COMMON) || card.type.includes('Token')) {
          //we don't save common base cards in the card pool
        } else {
          if (standard) s.cards[r].push(cardId);
          // Older imports have false/false finish flags: their explicit names
          // remain authoritative. HMW folds both finishes into "Hyperspace".
          if (variants.some(v => v?.variantName === 'Hyperspace' && (!v.hasFoil || v.hasNonfoil))) {
            s.hyperspace[r].push(cardId);
          }
          if (
            variants.some(v => {
              if (!v) return false;
              // HMW uses "Hyperspace" plus hasFoil, while older sets use
              // "Hyperspace Foil". Neither foil Prestige nor promos belong here.
              return (
                v.variantName === 'Hyperspace Foil' ||
                (v.variantName === 'Hyperspace' && v.hasFoil) ||
                (!rules.hyperspaceFoilOnly &&
                  (v.variantName === 'Standard Foil' ||
                    (v.variantName === 'Standard' && v.hasFoil)))
              );
            })
          ) {
            s.foil[r].push(cardId);
          }
          if (variants.some(v => v?.variantName === 'Standard Prestige')) {
            s.prestige.push(cardId);
          }
        }
      }
    });
    cardPoolMapBySet[set] = s;
  }
  return cardPoolMapBySet[set];
};
