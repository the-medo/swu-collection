import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionGroupBy } from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import { groupCardsByAspect } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByAspect.ts';
import { groupCardsByRarity } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByRarity.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByVersionName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByVersionName.ts';

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
    case CollectionGroupBy.ASPECT:
      return groupCardsByAspect(cardList, cards);
    case CollectionGroupBy.CARD_TYPE:
      return groupCardsByCardType(cardList, cards);
    case CollectionGroupBy.VARIANT_NAME:
      return groupCardsByVersionName(cardList, cards);
  }
};
