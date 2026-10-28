import { setInfo } from '../set-info.ts';
import type { SwuSet } from '../../../types/enums.ts';
import { processVariantWithoutImages } from './processVariantWithoutImages.ts';
import { mergeVariantsWithoutImages } from './mergeVariantsWithoutImages.ts';

export function processPrintings(
  printings: { original: any; printings: any[] },
  initialSet: SwuSet,
) {
  const allPrintings = [printings.original, ...printings.printings];
  const publishedPrintings = allPrintings.filter(printing => printing.publishedAt !== null);
  if (publishedPrintings.length === 0) {
    throw new Error(`No published printings for ${initialSet}`);
  }
  let newestSet = initialSet;

  for (const printing of publishedPrintings) {
    const set = printing.expansion?.code?.toLowerCase() as SwuSet;
    if ((setInfo[set]?.sortValue ?? 0) > (setInfo[newestSet]?.sortValue ?? 0)) {
      newestSet = set;
    }
  }

  // A published promo can precede its original printing. Use the original's
  // playable set only when no published printing establishes one.
  if (!setInfo[newestSet]) {
    newestSet = printings.original.expansion?.code?.toLowerCase() as SwuSet;
  }

  if (!setInfo[newestSet]) {
    throw new Error(`No known playable set for printings from ${initialSet}`);
  }

  const variants = mergeVariantsWithoutImages(publishedPrintings.map(processVariantWithoutImages));
  const cardUid = [
    ...new Set(
      [printings.original, ...publishedPrintings].flatMap(printing =>
        printing.cardUid == null ? [] : [String(printing.cardUid)],
      ),
    ),
  ];

  return { set: newestSet, variants, cardUid };
}
