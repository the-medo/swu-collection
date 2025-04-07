import type { CardVariant } from '../../../lib/swu-resources/types.ts';

export interface VariantInfo {
  name: string;
  sortValue: number;
  shortName: string;
}

export const variantInfo: Record<string, VariantInfo> = {
  Standard: { name: 'Standard', sortValue: 0, shortName: '' },
  'Standard Foil': { name: 'Standard Foil', sortValue: 5, shortName: 'SF' },
  Hyperspace: { name: 'Hyperspace', sortValue: 10, shortName: 'HS' },
  Showcase: { name: 'Showcase', sortValue: 100, shortName: 'SC' },
  'Prerelease Promo': { name: 'Prerelease Promo', sortValue: 30, shortName: 'Prerelease' },
  'Event Exclusive': { name: 'Event Exclusive', sortValue: 40, shortName: 'Event' },
  'OP Judge': { name: 'OP Judge', sortValue: 50, shortName: 'Judge' },
  'OP Promo': { name: 'OP Promo', sortValue: 60, shortName: 'Promo' },
  'OP Promo Foil': { name: 'OP Promo Foil', sortValue: 70, shortName: 'Promo Foil' },
  'OP Champion': { name: 'OP Champion', sortValue: 80, shortName: 'Champion' },
  'OP Finalist': { name: 'OP Finalist', sortValue: 81, shortName: 'Finalist' },
  'OP Top 4': { name: 'OP Top 4', sortValue: 82, shortName: 'Top4' },
  'OP Top 8': { name: 'OP Top 8', sortValue: 83, shortName: 'Top8' },
  'OP Top 16': { name: 'OP Top 16', sortValue: 84, shortName: 'Top16' },
  'Convention Exclusive': { name: 'Convention Exclusive', sortValue: 90, shortName: 'Convention' },
};

export const variantNameSorter = (a: string, b: string) => {
  return (variantInfo[a]?.sortValue ?? 0) - (variantInfo[b]?.sortValue ?? 0);
};

export const variants = (a: CardVariant, b: CardVariant) =>
  variantNameSorter(a.variantName, b.variantName);
