import type { CardListVariants, CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../types/enums.ts';

/**
 * From JTL, there are different numbers for Standard / Hyperspace / Standard Foil and Hyperspace Foil variants...
 * In the first 3 sets, normal and hyperspace variants can be both foil and nonfoil, with the same number
 * @param variant
 * @param defaultFoil
 * @param variants Other printings of this card, including paired foil promos.
 */
export const getFoilBasedOnVariantAndSet = (
  variant: CardVariant,
  defaultFoil: boolean,
  variants?: CardListVariants,
): boolean => {
  const jtlSortValue = setInfo[SwuSet.JTL].sortValue;
  const variantSetSortValue = setInfo[variant.set]?.sortValue;
  const foilPrinting =
    variant.variantName.toLowerCase().includes('foil') || variant.variantName === 'Showcase';

  // Auxiliary promo codes aren't playable expansions and may have no set metadata.
  if (variantSetSortValue === undefined) {
    if (foilPrinting) return true;
    const foilName = `${variant.variantName} Foil`.toLowerCase();
    const hasFoilCounterpart = Object.values(variants ?? {}).some(
      sibling => sibling?.set === variant.set && sibling.variantName.toLowerCase() === foilName,
    );
    return hasFoilCounterpart ? false : defaultFoil;
  }

  if (variantSetSortValue >= jtlSortValue) {
    return foilPrinting;
  } else {
    return defaultFoil;
  }
};
