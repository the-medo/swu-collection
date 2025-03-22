import type { CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../types/enums.ts';

/**
 * From JTL, there are different numbers for Standard / Hyperspace / Standard Foil and Hyperspace Foil variants...
 * In the first 3 sets, normal and hyperspace variants can be both foil and nonfoil, with the same number
 * @param variant
 * @param defaultFoil
 */
export const getFoilBasedOnVariantAndSet = (
  variant: CardVariant,
  defaultFoil: boolean,
): boolean => {
  const jtlSortValue = setInfo[SwuSet.JTL].sortValue;
  const variantSetSortValue = setInfo[variant.set].sortValue;

  if (variantSetSortValue >= jtlSortValue) {
    return variant.variantName.toLowerCase().includes('foil') || variant.variantName === 'Showcase';
  } else {
    return defaultFoil;
  }
};
