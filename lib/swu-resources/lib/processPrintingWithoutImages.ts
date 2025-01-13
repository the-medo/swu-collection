import type { CardPrinting } from '../types.ts';
import { setInfo } from '../set-info.ts';

export function processPrintingWithoutImages(printing: any): CardPrinting {
  const id = printing.id;

  const expansion = printing.expansion.code.toLowerCase();
  const variantType = printing.variantTypes[0];
  const cardCount = printing.cardCount;
  let setName = printing.expansion.name;
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
    swuId: id,
    set: expansion,
    fullSetName: setName,
    cardNo: printing.cardNumber,
    baseSet,
    hasNonfoil,
    hasFoil,
    variantName,
    artist: printing.artist,
    image: {
      front: '',
      back: '',
    },
  };
}
