import { SwuAspect, SwuArena, SwuRarity, SwuSet } from '../../../../../../types/enums';
import { RangeFilterType } from '../../global/RangeFilter/RangeFilter';
import { CardList } from '../../../../../../lib/swu-resources/types.ts';

interface SearchFilters {
  name?: string;
  text?: string;
  sets?: SwuSet[];
  rarities?: SwuRarity[];
  cardTypes?: string[];
  aspects?: SwuAspect[];
  arenas?: SwuArena[];
  traits?: string[];
  keywords?: string[];
  variants?: string[];
  cost?: RangeFilterType;
  power?: RangeFilterType;
  hp?: RangeFilterType;
  upgradePower?: RangeFilterType;
  upgradeHp?: RangeFilterType;
}

/**
 * Filter cards based on search criteria
 * This function uses the optimized map properties for faster filtering
 */
export const filterCards = async (
  cardList: CardList,
  cardIds: string[],
  filters: SearchFilters,
): Promise<string[]> => {
  return new Promise(resolve => {
    // Use setTimeout to make the search non-blocking
    setTimeout(() => {
      const results = cardIds.filter(cardId => {
        const card = cardList[cardId];
        if (!card) return false;

        // Check name filter
        if (filters.name && !card.name.toLowerCase().includes(filters.name.toLowerCase())) {
          return false;
        }

        // Check text filter
        if (filters.text) {
          const textLower = filters.text.toLowerCase();
          const cardText = [card.text, card.rules, card.deployBox, card.epicAction]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!cardText.includes(textLower)) {
            return false;
          }
        }

        // Check sets filter
        if (filters.sets && filters.sets.length > 0) {
          // Check if any variant of this card is from one of the filtered sets
          const hasMatchingSet = Object.values(card.variants).some(
            variant => variant && filters.sets!.includes(variant.set),
          );

          if (!hasMatchingSet) {
            return false;
          }
        }

        // Check rarity filter
        if (filters.rarities && filters.rarities.length > 0) {
          if (!filters.rarities.includes(card.rarity)) {
            return false;
          }
        }

        // Check card type filter
        if (filters.cardTypes && filters.cardTypes.length > 0) {
          if (!filters.cardTypes.includes(card.type)) {
            return false;
          }
        }

        // Check aspects filter - similar to LeaderSelector approach
        if (filters.aspects && filters.aspects.length > 0) {
          if (card.aspects.length === 0) return false;
          // Find aspects from the card that aren't in the filter
          const notFoundAspects = card.aspects.filter(
            cardAspect => !filters.aspects!.includes(cardAspect),
          );

          // If any aspect is missing, fail the filter unless it's the specific Heroism/Villainy exception
          if (notFoundAspects.length > 0) {
            // Special handling for Heroism + Villainy (like Chancellor Palpatine)
            if (notFoundAspects.length === 1) {
              const notFoundAspect = notFoundAspects[0];

              if (
                (notFoundAspect === SwuAspect.HEROISM &&
                  card.aspects.includes(SwuAspect.VILLAINY) &&
                  filters.aspects.includes(SwuAspect.VILLAINY)) ||
                (notFoundAspect === SwuAspect.VILLAINY &&
                  card.aspects.includes(SwuAspect.HEROISM) &&
                  filters.aspects.includes(SwuAspect.HEROISM))
              ) {
                // This is fine - special case for Heroism/Villainy
              } else {
                return false;
              }
            } else {
              return false;
            }
          }
        }

        // Check arenas filter using the optimized arenaMap
        if (filters.arenas && filters.arenas.length > 0) {
          const hasRequiredArena = filters.arenas.some(arena => card.arenaMap[arena] === true);

          if (!hasRequiredArena) {
            return false;
          }
        }

        // Check traits filter using the optimized traitMap
        if (filters.traits && filters.traits.length > 0 && card.traitMap) {
          const hasRequiredTrait = filters.traits.some(trait => card.traitMap![trait] === true);

          if (!hasRequiredTrait) {
            return false;
          }
        }

        // Check keywords filter using the optimized keywordMap
        if (filters.keywords && filters.keywords.length > 0 && card.keywordMap) {
          const hasRequiredKeyword = filters.keywords.some(
            keyword => card.keywordMap![keyword] === true,
          );

          if (!hasRequiredKeyword) {
            return false;
          }
        }

        // Check variants filter using the optimized variantMap
        if (filters.variants && filters.variants.length > 0 && card.variantMap) {
          const hasRequiredVariant = filters.variants.some(
            variant => card.variantMap![variant] !== undefined,
          );

          if (!hasRequiredVariant) {
            return false;
          }
        }

        // Check numeric range filters
        if (filters.cost && (filters.cost.min !== undefined || filters.cost.max !== undefined)) {
          if (card.cost === null) return false;
          if (filters.cost.min !== undefined && card.cost < filters.cost.min) return false;
          if (filters.cost.max !== undefined && card.cost > filters.cost.max) return false;
        }

        if (filters.power && (filters.power.min !== undefined || filters.power.max !== undefined)) {
          if (card.power === null) return false;
          if (filters.power.min !== undefined && card.power < filters.power.min) return false;
          if (filters.power.max !== undefined && card.power > filters.power.max) return false;
        }

        if (filters.hp && (filters.hp.min !== undefined || filters.hp.max !== undefined)) {
          if (card.hp === null) return false;
          if (filters.hp.min !== undefined && card.hp < filters.hp.min) return false;
          if (filters.hp.max !== undefined && card.hp > filters.hp.max) return false;
        }

        if (
          filters.upgradePower &&
          (filters.upgradePower.min !== undefined || filters.upgradePower.max !== undefined)
        ) {
          if (card.upgradePower === null) return false;
          if (
            filters.upgradePower.min !== undefined &&
            card.upgradePower < filters.upgradePower.min
          )
            return false;
          if (
            filters.upgradePower.max !== undefined &&
            card.upgradePower > filters.upgradePower.max
          )
            return false;
        }

        if (
          filters.upgradeHp &&
          (filters.upgradeHp.min !== undefined || filters.upgradeHp.max !== undefined)
        ) {
          if (card.upgradeHp === null) return false;
          if (filters.upgradeHp.min !== undefined && card.upgradeHp < filters.upgradeHp.min)
            return false;
          if (filters.upgradeHp.max !== undefined && card.upgradeHp > filters.upgradeHp.max)
            return false;
        }

        // If all filters pass, include this card
        return true;
      });

      resolve(results);
    }, 0); // Execute asynchronously to not block the UI
  });
};
