import type { CardVariant } from '../types.ts';

export function mergeVariantsWithoutImages(variant: CardVariant[]): CardVariant[] {
  const finalVariants: CardVariant[] = [];
  const usedVariants: number[] = [];

  variant.forEach(p => {
    if (usedVariants.includes(p.swuId)) {
      return;
    }
    if (!p.baseSet) {
      finalVariants.push(p);
      return;
    }

    const variantPair = variant.find(
      x => x.cardNo === p.cardNo && x.set === p.set && x.swuId !== p.swuId,
    );

    if (!variantPair) {
      finalVariants.push(p);
      return;
    }

    // we want nonfoild ID, to request nonfoil image later
    const nonfoil = p.hasFoil ? variantPair : p;
    usedVariants.push(variantPair.swuId);
    finalVariants.push({
      ...variantPair,
      swuId: nonfoil.swuId,
      hasFoil: true,
      hasNonfoil: true,
    });
  });

  return finalVariants;
}
