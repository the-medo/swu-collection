import type { CardVariant } from '../types.ts';
import { setInfo } from '../set-info.ts';

export function processVariantWithoutImages(variant: any): CardVariant {
  const id = variant.id;

  const expansion = variant.expansion.code.toLowerCase();
  const variantType = variant.variantTypes[0];
  const cardCount = variant.cardCount;
  let setName = variant.expansion.name;
  let baseSet = true;
  let variantName = variantType.name;
  let hasFoil = false;
  let hasNonfoil = false;

  const swubaseExpansion = setInfo[expansion];

  if (swubaseExpansion) {
    if (cardCount === swubaseExpansion.cardCount) {
      variantName = variantName.replace(' Foil', '');
      if (variantType.foil) {
        hasFoil = true;
      } else {
        hasNonfoil = true;
      }
    } else {
      setName = `${setName} - ${variantName}`;
      baseSet = false;
    }
  }

  return {
    variantId: '', //filled later
    swuId: id,
    set: expansion,
    fullSetName: setName,
    cardNo: variant.cardNumber,
    baseSet,
    hasNonfoil,
    hasFoil,
    variantName,
    artist: variant.artist,
    front: undefined,
    back: undefined,
    image: {
      front: '', //filled later
      back: '', //filled later
    },
  };
}
