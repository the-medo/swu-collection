import { CardVariant } from '../../../lib/swu-resources/types.ts';

const variantSortValue: Record<string, number | undefined> = {
  Standard: 0,
  'Standard Foil': 5, // only some special cases, this shouldn't happen often
  Hyperspace: 10,
  Showcase: 20,
  'Prerelease Promo': 30,
  'Event Exclusive': 40,
  'OP Judge': 50,
  'OP Promo': 60,
  'OP Promo Foil': 70,
  'OP Champion': 80,
  'OP Finalist': 81,
  'OP Top 4': 82,
  'OP Top 8': 83,
  'OP Top 16': 84,
  'Convention Exclusive': 90,
};

export const variantNameSorter = (a: string, b: string) => {
  return (variantSortValue[a] ?? 0) - (variantSortValue[b] ?? 0);
};

export const variantSorter = (a: CardVariant, b: CardVariant) =>
  variantNameSorter(a.variantName, b.variantName);
