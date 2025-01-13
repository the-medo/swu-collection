import type { CardPrinting } from '../types.ts';

export function mergePrintingsWithoutImages(printing: CardPrinting[]): CardPrinting[] {
  const finalPrintings: CardPrinting[] = [];
  const removedPrintings: number[] = [];

  printing.forEach(p => {
    if (removedPrintings.includes(p.swuId)) {
      return;
    }
    if (!p.baseSet) {
      finalPrintings.push(p);
      return;
    }

    const printingPair = printing.find(
      x => x.cardNo === p.cardNo && x.set === p.set && x.swuId !== p.swuId,
    );

    if (!printingPair) {
      finalPrintings.push(p);
      return;
    }

    // we want nonfoild ID, to request nonfoil image later
    const nonfoil = p.hasFoil ? printingPair : p;
    removedPrintings.push(printingPair.swuId);
    finalPrintings.push({
      ...printingPair,
      swuId: nonfoil.swuId,
      hasFoil: true,
      hasNonfoil: true,
    });
  });

  return finalPrintings;
}
