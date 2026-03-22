import { rotationBlocks } from '../lib/swu-resources/set-info.ts';
import type { SwuSet } from './enums.ts';
import type { CardDataWithVariants, CardListVariants } from '../lib/swu-resources/types.ts';

export type Format = {
  id: number;
  name: string;
  description: string;
  leaderCount: number;
};

export type FilterByFormat = {
  title: string;
  filterCallback: (card: CardDataWithVariants<CardListVariants>) => boolean;
};

export const formatData: Format[] = [
  {
    id: 1,
    name: 'Premier',
    description: 'Classic constructed format. One leader, one base, 50 cards in a deck is minimum.',
    leaderCount: 1,
  },
  {
    id: 6,
    name: 'Eternal',
    description: 'Constructed format with all sets allowed.',
    leaderCount: 1,
  },
  {
    id: 3,
    name: 'Sealed play',
    description: 'Limited format. Player opens 6 booster packs and builds 30+ cards deck.',
    leaderCount: 1,
  },
  {
    id: 4,
    name: 'Draft',
    description:
      'Limited format. Player opens 3 booster packs, drafts the opened cards and builds 30+ cards deck.',
    leaderCount: 1,
  },
  {
    id: 5,
    name: 'Scavenger',
    description:
      'Constructed format with only common and uncommon rarity cards. Other rules vary (banned cards, rare leaders,...)',
    leaderCount: 1,
  },
  {
    id: 7,
    name: 'Next Set Preview - Premier',
    description:
      'Constructed format with Premier rules - used during preview season (new set not released yet, but cards are spoiled)',
    leaderCount: 1,
  },
  {
    id: 8,
    name: 'Next Set Preview - Eternal',
    description:
      'Constructed format with Eternal rules - used during preview season (new set not released yet, but cards are spoiled)',
    leaderCount: 1,
  },
  {
    id: 2,
    name: 'Twin Suns',
    description:
      'Constructed format. Two leaders, one base, 80 cards in a deck is minimum (since JTL) and cannot include more than one copy of any card.',
    leaderCount: 2,
  },
];

export const formatDataById: Record<number, Format> = {};
formatData.forEach(format => {
  formatDataById[format.id] = format;
});

export const premierSetMap = {
  ...rotationBlocks[2].setMap,
  ...rotationBlocks[3].setMap,
};

export const setRestrictionByFormat: Record<number, Partial<Record<SwuSet, true | undefined>>> = {
  1: premierSetMap,
  7: premierSetMap,
};

export const cardFiltersByFormat: Record<string, FilterByFormat> = {
  premier: {
    title: 'Premier only',
    filterCallback: (card: CardDataWithVariants<CardListVariants>) => !!premierSetMap[card?.set],
  },
};

export const cardFilterByFormatId: Partial<Record<number, FilterByFormat>> = {
  1: cardFiltersByFormat.premier,
  7: cardFiltersByFormat.premier,
};
