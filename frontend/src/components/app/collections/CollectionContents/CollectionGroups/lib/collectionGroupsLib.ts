import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionGroupBy,
  CollectionSortBy,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { groupCardsByAspectSoft } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByAspectSoft.ts';
import { groupCardsByRarity } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByRarity.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByVersionName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByVersionName.ts';
import { groupCardsByAspectHard } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByAspectHard.ts';
import { groupCardsBySet } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsBySet.ts';
import { groupCardsByCost } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCost.ts';
import { sortCardsByCardCost } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardCost.ts';
import { sortCardsByCardName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardName.ts';
import { sortCardsByCardRarity } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardRarity.ts';
import { sortCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardType.ts';
import { sortCardsByCardAspects } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import { sortCardsByVariantName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByVariantName.ts';

type CardGroup = {
  id: string;
  label: string;
  cards: CollectionCard[];
  horizontal?: boolean;
};

export type CardGroups = Record<string, CardGroup | undefined>;

export type CardGroupData = {
  groups: CardGroups;
  sortedIds: string[];
};

export const groupCardsBy = (
  cardList: CardList,
  cards: CollectionCard[],
  groupBy: CollectionGroupBy,
): CardGroupData => {
  switch (groupBy) {
    case CollectionGroupBy.RARITY:
      return groupCardsByRarity(cardList, cards);
    case CollectionGroupBy.ASPECT_SOFT:
      return groupCardsByAspectSoft(cardList, cards);
    case CollectionGroupBy.ASPECT_HARD:
      return groupCardsByAspectHard(cardList, cards);
    case CollectionGroupBy.CARD_TYPE:
      return groupCardsByCardType(cardList, cards);
    case CollectionGroupBy.VARIANT_NAME:
      return groupCardsByVersionName(cardList, cards);
    case CollectionGroupBy.SET:
      return groupCardsBySet(cardList, cards);
    case CollectionGroupBy.COST:
      return groupCardsByCost(cardList, cards);
  }
};

export type CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => (cardA: CollectionCard, cardB: CollectionCard) => number;

export const getCollectionCardSorter = (sortBy: CollectionSortBy): CollectionCardSorter => {
  switch (sortBy) {
    case CollectionSortBy.CARD_COST:
      return sortCardsByCardCost;
    case CollectionSortBy.CARD_NAME:
      return sortCardsByCardName;
    case CollectionSortBy.RARITY:
      return sortCardsByCardRarity;
    case CollectionSortBy.CARD_TYPE:
      return sortCardsByCardType;
    case CollectionSortBy.ASPECT:
      return sortCardsByCardAspects;
    case CollectionSortBy.VARIANT_NAME:
      return sortCardsByVariantName;
    default:
      return sortCardsByCardName;
  }
};

export const sortCardsBy = (
  cardList: CardList,
  cards: CollectionCard[],
  sorts: CollectionSortBy[],
) => {
  const [sortBy, ...nextSorts] = sorts;
  cards.sort(getCollectionCardSorter(sortBy)(cardList, nextSorts));
};
