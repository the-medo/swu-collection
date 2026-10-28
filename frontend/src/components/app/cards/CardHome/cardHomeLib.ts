import { z } from 'zod';
import type { CardList, CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import { setArraySorted, setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import { SwuRarity, SwuSet } from '../../../../../../types/enums.ts';
import {
  indexCardPrintings,
  type CardPrinting,
} from '../../../../../../shared/lib/cardGroupPrintings.ts';

export const setGalleryCategory = z.enum(['all', 'leaders', 'prestige', 'weekly']);
export type SetGalleryCategory = z.infer<typeof setGalleryCategory>;
// Showcase is a shortcut to Leaders / Showcase, including in older shared links.
export const setGalleryShortcut = z.enum(['all', 'leaders', 'showcases', 'prestige', 'weekly']);
export type SetGalleryShortcut = z.infer<typeof setGalleryShortcut>;
export const setGalleryLabels: Record<SetGalleryShortcut, string> = {
  all: 'All cards',
  leaders: 'Leaders',
  showcases: 'Showcases',
  prestige: 'Prestige',
  weekly: 'Weekly promo',
};
export const setGalleryVariant = z.enum([
  'standard',
  'standard-foil',
  'hyperspace',
  'hyperspace-foil',
  'showcase',
  'standard-prestige',
  'foil-prestige',
  'serialized-prestige',
  'weekly-play',
  'weekly-play-foil',
]);
export type SetGalleryVariant = z.infer<typeof setGalleryVariant>;
export const setGalleryVariantLabels: Record<SetGalleryVariant, string> = {
  standard: 'Standard',
  'standard-foil': 'Standard Foil',
  hyperspace: 'Hyperspace',
  'hyperspace-foil': 'Hyperspace Foil',
  showcase: 'Showcase',
  'standard-prestige': 'Standard Prestige',
  'foil-prestige': 'Foil Prestige',
  'serialized-prestige': 'Serialized Prestige',
  'weekly-play': 'Weekly Play',
  'weekly-play-foil': 'Weekly Play Foil',
};
export const setGalleryVariants: Record<SetGalleryCategory, readonly SetGalleryVariant[]> = {
  all: ['standard', 'standard-foil', 'hyperspace', 'hyperspace-foil'],
  leaders: ['standard', 'hyperspace', 'showcase'],
  prestige: ['standard-prestige', 'foil-prestige', 'serialized-prestige'],
  weekly: ['weekly-play', 'weekly-play-foil'],
};
export const setGallerySearchSchema = z.object({
  csCategory: setGalleryShortcut.default('all').catch('all'),
  csVariant: setGalleryVariant.optional().catch(undefined),
});

export function resolveSetGallerySelection(
  shortcut: SetGalleryShortcut,
  variant?: SetGalleryVariant,
): { category: SetGalleryCategory; variant: SetGalleryVariant } {
  const category = shortcut === 'showcases' ? 'leaders' : shortcut;
  return {
    category,
    variant:
      variant && setGalleryVariants[category].includes(variant)
        ? variant
        : shortcut === 'showcases'
          ? 'showcase'
          : setGalleryVariants[category][0],
  };
}

const weeklyPromoSets: Partial<Record<SwuSet, readonly string[]>> = {
  [SwuSet.SOR]: ['sor'],
  [SwuSet.SHD]: ['shd'],
  [SwuSet.TWI]: ['twi'],
  [SwuSet.JTL]: ['jtlw', 'jtlp'],
  [SwuSet.LOF]: ['lofw', 'lofp'],
  [SwuSet.SEC]: ['secw', 'secp'],
  [SwuSet.LAW]: ['lawp'],
  [SwuSet.ASH]: ['ashp'],
  [SwuSet.HMW]: ['hmwp'],
};

function matchesTreatment(variant: CardVariant, treatment: SetGalleryVariant) {
  const name = variant.variantName;
  // Earlier sets share a variant ID for both finishes. HMW also uses the
  // Hyperspace name for separate foil-only printings, distinguished by these flags.
  const nonfoil = !variant.hasFoil || variant.hasNonfoil;
  switch (treatment) {
    case 'standard':
      return name === 'Standard' && nonfoil;
    case 'standard-foil':
      return name === 'Standard Foil' || (name === 'Standard' && variant.hasFoil);
    case 'hyperspace':
      return name === 'Hyperspace' && nonfoil;
    case 'hyperspace-foil':
      return name === 'Hyperspace Foil' || (name === 'Hyperspace' && variant.hasFoil);
    case 'showcase':
      return name === 'Showcase';
    case 'standard-prestige':
      return name === 'Standard Prestige';
    case 'foil-prestige':
      return name === 'Foil Prestige';
    case 'serialized-prestige':
      return name.startsWith('Serialized Prestige');
    case 'weekly-play':
      return (name === 'Weekly Play' || name === 'OP Promo') && nonfoil;
    case 'weekly-play-foil':
      return (
        name === 'Weekly Play Foil' ||
        name === 'OP Promo Foil' ||
        ((name === 'Weekly Play' || name === 'OP Promo') && variant.hasFoil)
      );
  }
}

export function getGalleryVariantLabel(variant: CardVariant, treatment?: SetGalleryVariant) {
  const sharedFinishName = ['Standard', 'Hyperspace', 'Weekly Play', 'OP Promo'].includes(
    variant.variantName,
  );
  const showingFoil = treatment?.endsWith('-foil') || (variant.hasFoil && !variant.hasNonfoil);
  return sharedFinishName && showingFoil ? `${variant.variantName} Foil` : variant.variantName;
}

export function getSetPrintings(
  printings: CardPrinting[],
  set: SwuSet,
  shortcut: SetGalleryShortcut,
  treatment?: SetGalleryVariant,
) {
  const { category, variant: selectedVariant } = resolveSetGallerySelection(shortcut, treatment);
  const matching = printings
    .filter(({ card, variant }) => {
      if (card.type === 'Token') return false;
      const belongsToSet =
        category === 'weekly' ? weeklyPromoSets[set]?.includes(variant.set) : variant.set === set;
      return (
        belongsToSet &&
        (category !== 'leaders' || card.type === 'Leader') &&
        matchesTreatment(variant, selectedVariant)
      );
    })
    .sort(
      (a, b) =>
        a.variant.cardNo - b.variant.cardNo ||
        a.variant.variantId.localeCompare(b.variant.variantId),
    );
  if (category !== 'all' && category !== 'leaders') return matching;
  // Older catalog entries can contain duplicate IDs for the same printing.
  const seenCards = new Set<string>();
  return matching.filter(({ card }) => {
    if (seenCards.has(card.cardId)) return false;
    seenCards.add(card.cardId);
    return true;
  });
}

// Fixed artwork. ASH and older picks were chosen once using stored Cardmarket prices.
const featuredCardSelections: Record<SwuSet, readonly string[]> = {
  [SwuSet.IC27]: ['i-ve-got-a-bad-feeling', 'jar-jar-binks--bumbling-representative'],
  [SwuSet.HMW]: [
    'nightbrother--maul-s-gauntlet',
    'sando-aqua-monster',
    'emperor-palpatine--consolidating-power',
  ],
  [SwuSet.TS26]: [
    'darth-sidious--under-a-cloak-of-darkness',
    'obi-wan-kenobi--steadfast-knight',
    'fives--i-have-proof-',
  ],
  [SwuSet.IBH]: ['rogue-squadron-speeder', 'blizzard-one--veers-at-the-helm', 'rampaging-wampa'],
  [SwuSet.ASH]: [
    'chimaera--a-frightening-reality',
    'pre-vizsla--strong-willed-ruler',
    'ninth-sister--hulking-inquisitor',
  ],
  [SwuSet.LAW]: ['single-reactor-ignition', 'rey--skywalker', 'the-stranger--no-survivors'],
  [SwuSet.SEC]: [
    'darth-nihilus--lord-of-hunger',
    'queen-amidala--championing-her-people',
    'lightmaker--i-have-an-idea',
  ],
  [SwuSet.LOF]: [
    'anakin-skywalker--champion-of-mortis',
    'constructed-lightsaber',
    'the-legacy-run--doomed-debris',
  ],
  [SwuSet.JTL]: [
    'stolen-at-hauler',
    'darth-vader--scourge-of-squadrons',
    'devastator--hunting-the-rebellion',
  ],
  [SwuSet.TWI]: [
    'cad-bane--hostage-taker',
    'darth-maul--revenge-at-last',
    'ki-adi-mundi--composed-and-confident',
  ],
  [SwuSet.SHD]: ['the-darksaber', 'krayt-dragon', 'poe-dameron--quick-to-improvise'],
  [SwuSet.SOR]: [
    'luke-skywalker--jedi-knight',
    'darth-vader--commanding-the-first-legion',
    'boba-fett--disintegrator',
  ],
};

export function getCardHomeSets(cards: CardList) {
  const printings = [...indexCardPrintings(cards).values()];
  return setArraySorted.flatMap(code => {
    const all = getSetPrintings(printings, code, 'all');
    if (!all.length) return [];
    const leaders = getSetPrintings(printings, code, 'leaders');
    // Use Standard artwork for these supplemental sets.
    const artworkPrintings =
      code === SwuSet.TS26 || code === SwuSet.IBH || code === SwuSet.IC27
        ? all
        : getSetPrintings(printings, code, 'all', 'hyperspace').filter(
            p => p.card.rarity === SwuRarity.LEGENDARY,
          );
    const featured = featuredCardSelections[code].flatMap(id =>
      artworkPrintings.filter(p => p.card.cardId === id),
    );
    return [
      {
        code,
        info: setInfo[code],
        leaders,
        featured,
        counts: Object.fromEntries(
          setGalleryShortcut.options.map(category => [
            category,
            getSetPrintings(printings, code, category).length,
          ]),
        ) as Record<SetGalleryShortcut, number>,
      },
    ];
  });
}
