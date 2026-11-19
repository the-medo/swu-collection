import { weeklyPromoSets } from '../../../../lib/swu-resources/set-info.ts';
import type { CardList, CardVariant } from '../../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../../types/enums.ts';

export type ChecklistPrinting = { set: SwuSet; number: number; token: boolean; treatment: string };
export type ChecklistCard = {
  name: string;
  first: ChecklistPrinting;
  printings: ChecklistPrinting[];
};

export function compareNumbers(a: ChecklistPrinting, b: ChecklistPrinting, set: SwuSet) {
  return (
    Number(a.token) - Number(b.token) ||
    Number(b.set === set) - Number(a.set === set) ||
    a.set.localeCompare(b.set) ||
    a.number - b.number
  );
}

function cardNumberPriority(variant: CardVariant, set: SwuSet) {
  return (
    (variant.set === set ? 0 : 4) +
    (variant.baseSet ? 0 : 2) +
    (variant.variantName === 'Standard' ? 0 : 1)
  );
}

function getTreatments(variant: CardVariant) {
  // Older sets can share a number across finishes. Homeworlds has separate
  // foil-only records named simply "Hyperspace".
  if (!variant.hasFoil || /foil/i.test(variant.variantName)) return [variant.variantName];
  const foil = `${variant.variantName} Foil`;
  return variant.hasNonfoil ? [variant.variantName, foil] : [foil];
}

export function getChecklistCards(cards: CardList, set: SwuSet): ChecklistCard[] {
  const rows: ChecklistCard[] = [];
  for (const card of Object.values(cards)) {
    if (!card) continue;
    const variants = Object.values(card.variants)
      .filter(
        (v): v is CardVariant => !!v && (v.set === set || !!weeklyPromoSets[set]?.includes(v.set)),
      )
      .sort(
        (a, b) => cardNumberPriority(a, set) - cardNumberPriority(b, set) || a.cardNo - b.cardNo,
      );
    const unique = new Map<string, ChecklistPrinting>();
    for (const variant of variants) {
      for (const treatment of getTreatments(variant)) {
        // Catalog aliases for the same physical printing need only one box.
        const key = JSON.stringify([variant.set, variant.cardNo, treatment]);
        unique.set(key, {
          set: variant.set,
          number: variant.cardNo,
          token: card.type.includes('Token'),
          treatment,
        });
      }
    }
    const printings = [...unique.values()];
    if (printings.length) rows.push({ name: card.name, first: printings[0], printings });
  }
  return rows.sort((a, b) => compareNumbers(a.first, b.first, set) || a.name.localeCompare(b.name));
}
