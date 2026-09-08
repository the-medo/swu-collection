import { z } from 'zod';
import { SwuArena, SwuAspect, SwuRarity, SwuSet } from '../../../../../../types/enums.ts';
import { premierSetMap } from '../../../../../../types/Format.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';

export const cardUniquenessFilterValues = ['both', 'unique', 'not-unique'] as const;
export type CardUniquenessFilter = (typeof cardUniquenessFilterValues)[number];

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCardSearchShortcutSetCodes = (currentDate: string) => ({
  premierSetCodes: (Object.keys(premierSetMap) as SwuSet[]).filter(
    set => setInfo[set].releaseDate <= currentDate,
  ),
  futureSetCodes: (Object.keys(setInfo) as SwuSet[]).filter(
    set => setInfo[set].releaseDate > currentDate,
  ),
});

export const { premierSetCodes, futureSetCodes } = getCardSearchShortcutSetCodes(
  getLocalDateString(new Date()),
);

export const isPremierOnlySetSelection = (sets: readonly SwuSet[]) =>
  sets.length === premierSetCodes.length && premierSetCodes.every(set => sets.includes(set));

export const togglePremierOnlySetSelection = (sets: readonly SwuSet[]): SwuSet[] =>
  isPremierOnlySetSelection(sets) ? [] : [...premierSetCodes];

export const areAllFutureSetsSelected = (sets: readonly SwuSet[]) =>
  futureSetCodes.length > 0 && futureSetCodes.every(set => sets.includes(set));

export const toggleFutureSetSelection = (
  sets: readonly SwuSet[],
  previewSets: readonly SwuSet[] = futureSetCodes,
): SwuSet[] => {
  const previewSetLookup = new Set(previewSets);
  const allPreviewSetsSelected =
    previewSets.length > 0 && previewSets.every(set => sets.includes(set));

  return allPreviewSetsSelected
    ? sets.filter(set => !previewSetLookup.has(set))
    : [...sets, ...previewSets.filter(set => !sets.includes(set))];
};

export const cardSearchParams = z.object({
  // Text search
  name: z.string().optional(),
  text: z.string().optional(),
  artist: z.string().optional(),

  // Set and Rarity filters
  sets: z.array(z.enum(Object.values(SwuSet) as [string, ...string[]])).optional(),
  rarities: z.array(z.enum(Object.values(SwuRarity) as [string, ...string[]])).optional(),
  uniqueness: z.enum(cardUniquenessFilterValues).optional(),

  // Type filters
  cardTypes: z.array(z.string()).optional(),

  // Attribute filters
  aspects: z.array(z.enum(Object.values(SwuAspect) as [string, ...string[]])).optional(),
  aspectsExact: z.boolean().optional(),
  includeNoAspect: z.boolean().optional(),
  arenas: z.array(z.enum(Object.values(SwuArena) as [string, ...string[]])).optional(),
  traits: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),

  // Numeric filters - represent as min-max strings that will be parsed
  cost: z.string().optional(), // format: "min-max" e.g. "2-5"
  power: z.string().optional(),
  hp: z.string().optional(),
  upgradePower: z.string().optional(),
  upgradeHp: z.string().optional(),

  // UI state
  resultsLayout: z
    .enum(['imageBig', 'imageMedium', 'imageSmall', 'tableImage', 'tableSmall'])
    .optional(),
  sort: z.enum(['name', 'cardNumber', 'cost', 'type', 'rarity', 'aspect', 'relevance']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
