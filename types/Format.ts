import { rotationBlocks, setInfo } from '../lib/swu-resources/set-info.ts';
import { SwuSet } from './enums.ts';
import type { CardDataWithVariants, CardListVariants } from '../lib/swu-resources/types.ts';

export type Format = {
  id: number;
  name: string;
  description: string;
  leaderCount: number;
  metaFormat: boolean;
};

export type FormatFilter = (format: Format) => boolean;

export type FilterByFormat = {
  title: string;
  filterCallback: (card: CardDataWithVariants<CardListVariants>) => boolean;
  setMap?: Partial<Record<SwuSet, true | undefined>>;
};

export const formatData: Format[] = [
  {
    id: 1,
    name: 'Premier',
    description: 'Classic constructed format. One leader, one base, 50 cards in a deck is minimum.',
    leaderCount: 1,
    metaFormat: true,
  },
  {
    id: 6,
    name: 'Eternal',
    description: 'Constructed format with all sets allowed.',
    leaderCount: 1,
    metaFormat: true,
  },
  {
    id: 3,
    name: 'Sealed play',
    description: 'Limited format. Player opens 6 booster packs and builds 30+ cards deck.',
    leaderCount: 1,
    metaFormat: true,
  },
  {
    id: 4,
    name: 'Draft',
    description:
      'Limited format. Player opens 3 booster packs, drafts the opened cards and builds 30+ cards deck.',
    leaderCount: 1,
    metaFormat: false,
  },
  {
    id: 5,
    name: 'Scavenger',
    description:
      'Constructed format with only common and uncommon rarity cards. Other rules vary (banned cards, rare leaders,...)',
    leaderCount: 1,
    metaFormat: false,
  },
  {
    id: 7,
    name: 'Next Set Preview - Premier',
    description:
      'Constructed format with Premier rules - used during preview season (new set not released yet, but cards are spoiled)',
    leaderCount: 1,
    metaFormat: false,
  },
  {
    id: 8,
    name: 'Next Set Preview - Eternal',
    description:
      'Constructed format with Eternal rules - used during preview season (new set not released yet, but cards are spoiled)',
    leaderCount: 1,
    metaFormat: false,
  },
  {
    id: 2,
    name: 'Twin Suns',
    description:
      'Constructed format. Two leaders, one base, 80 cards in a deck is minimum (since JTL) and cannot include more than one copy of any card.',
    leaderCount: 2,
    metaFormat: false,
  },
];

export const metaFormatFilter = (format: Format) => format.metaFormat;

export const formatDataById: Record<number, Format> = {};
formatData.forEach(format => {
  formatDataById[format.id] = format;
});

export const PREMIER_FORMAT_ID = 1;
export const limitedFormatIds = [3, 4] as const;
export const isLimitedFormat = (formatId: number) => limitedFormatIds.some(id => id === formatId);
export const dailySnapshotAdditionalFormatIds: number[] = [3, 4, 6];

export type DailySnapshotFormatBadge = 'E' | 'L';

export const dailySnapshotFormatBadgeById: Partial<Record<number, DailySnapshotFormatBadge>> = {
  3: 'L',
  4: 'L',
  6: 'E',
};

export const getDailySnapshotFormatSortOrder = (formatId: number): number => {
  if (formatId === PREMIER_FORMAT_ID) return 0;
  if (formatId === 6) return 1;
  if (formatId === 3 || formatId === 4) return 2;
  return 3;
};

// Remove a set here when promoting it from preview to the released formats.
export const previewSetMap: Partial<Record<SwuSet, true>> = {
  [SwuSet.IC27]: true,
};

const premierRotationSetMap = {
  ...rotationBlocks[2].setMap,
  ...rotationBlocks[3].setMap,
};

const withoutPreviewSets = (sets: Partial<Record<SwuSet, true>>) =>
  Object.fromEntries(
    Object.entries(sets).filter(([set]) => !previewSetMap[set as SwuSet]),
  ) as Partial<Record<SwuSet, true>>;

export const premierSetMap = withoutPreviewSets(premierRotationSetMap);
const previewPremierSetMap = { ...premierSetMap, ...previewSetMap };
const allSetMap = Object.fromEntries(Object.keys(setInfo).map(set => [set, true])) as Partial<
  Record<SwuSet, true>
>;
const eternalSetMap = withoutPreviewSets(allSetMap);

export const setRestrictionByFormat: Record<number, Partial<Record<SwuSet, true | undefined>>> = {
  1: premierSetMap,
  6: eternalSetMap,
  7: previewPremierSetMap,
  8: allSetMap,
};

const hasPrintingInSets = (
  card: CardDataWithVariants<CardListVariants>,
  sets: Partial<Record<SwuSet, true>>,
) => !!sets[card.set] || Object.values(card.variants).some(variant => variant && sets[variant.set]);

export const cardFiltersByFormat: Record<string, FilterByFormat> = {
  premier: {
    title: 'Premier only',
    filterCallback: card => hasPrintingInSets(card, premierSetMap),
    setMap: premierSetMap,
  },
  eternal: {
    title: 'Eternal only',
    filterCallback: card => hasPrintingInSets(card, eternalSetMap),
    setMap: eternalSetMap,
  },
  previewPremier: {
    title: 'Premier + preview',
    filterCallback: card => hasPrintingInSets(card, previewPremierSetMap),
    setMap: previewPremierSetMap,
  },
  previewEternal: {
    title: 'Eternal + preview',
    filterCallback: card => hasPrintingInSets(card, allSetMap),
    setMap: allSetMap,
  },
};

export const cardFilterByFormatId: Partial<Record<number, FilterByFormat>> = {
  1: cardFiltersByFormat.premier,
  6: cardFiltersByFormat.eternal,
  7: cardFiltersByFormat.previewPremier,
  8: cardFiltersByFormat.previewEternal,
};
