import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionGroupBy,
  CollectionSortBy,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { groupCardsByAspectSoft } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByAspectSoft.ts';
import { groupCardsByRarity } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByRarity.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByVariantName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByVariantName.ts';
import { groupCardsByAspectHard } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByAspectHard.ts';
import { groupCardsBySet } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsBySet.ts';
import { groupCardsByCost } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCost.ts';
import { sortCardsByCardCost } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardCost.ts';
import { sortCardsByCardName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardName.ts';
import { sortCardsByCardRarity } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardRarity.ts';
import { sortCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardType.ts';
import { sortCardsByCardAspects } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import { sortCardsByVariantName } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByVariantName.ts';
import { sortCardsByCardNumber } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardNumber.ts';
import { sortCardsByPrice } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByPrice.ts';
import { sortCardsByQty } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByQty.ts';
import {
  CardGroupInfo,
  CardGroupInfoData,
  CollectionCardExtended,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CardListResponse } from '@/api/lists/useCardList.ts';

export const getCardKey = (card: CollectionCard) =>
  `${card.cardId}|${card.variantId}|${card.foil}|${card.condition}|${card.language}`;

type CardGroup<T = CollectionCard> = {
  id: string;
  label: string;
  cards: T[];
  horizontal?: boolean;
};

export type CardGroups<T = CollectionCard> = Record<string, CardGroup<T> | undefined>;

export type CardGroupData<T = CollectionCard> = {
  groups: CardGroups<T>;
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
      return groupCardsByVariantName(cardList, cards);
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
    case CollectionSortBy.CARD_NUMBER:
      return sortCardsByCardNumber;
    case CollectionSortBy.PRICE:
      return sortCardsByPrice;
    case CollectionSortBy.QUANTITY:
      return sortCardsByQty;
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
  return [...cards].sort(getCollectionCardSorter(sortBy)(cardList, nextSorts));
};

export const ROOT_GROUP_ID = 'root';

/**
 * Processes collection data and returns structured data for the collection store
 * @param cards The collection cards data
 * @param cardList The card list data
 * @param groupBy The grouping functions by level
 * @returns Object with groupInfo, collectionCards, and groupCards
 */
export const processCollectionData = (
  cards: CollectionCard[],
  cardList: CardListResponse,
  groupBy: CollectionGroupBy[],
) => {
  // Create a map of card keys to cards
  const cardMap: Record<string, CollectionCardExtended> = {};
  const rootCardsArray: string[] = [];
  cards.forEach(collectionCard => {
    const key = getCardKey(collectionCard);
    const card = cardList.cards[collectionCard.cardId];
    cardMap[key] = {
      collectionCard: collectionCard,
      card,
      variant: card?.variants[collectionCard.variantId],
    };
    rootCardsArray.push(key);
  });

  const rootGroup: CardGroupInfoData = {
    id: ROOT_GROUP_ID,
    label: undefined,
    cardCount: cards.length,
    subGroupIds: [],
    level: 0,
  };

  const cardGroupInfo: CardGroupInfo = {
    [ROOT_GROUP_ID]: rootGroup,
  };

  const groupCards: Record<string, string[]> = {
    root: rootCardsArray,
  };

  const groupIdsToProcess = [ROOT_GROUP_ID];

  const processGroup = (groupId: string, c: CollectionCard[] | undefined) => {
    const groupInfo = cardGroupInfo[groupId];
    if (!groupInfo) return;
    if (!c) {
      c =
        groupCards[groupId]?.map(collectionCardKey => cardMap[collectionCardKey].collectionCard) ??
        [];
    }
    const groupingFunctionByLevel = groupBy[groupInfo.level];
    if (groupingFunctionByLevel) {
      const subgroups = groupCardsBy(cardList.cards, c, groupingFunctionByLevel);
      // console.log({ subgroups });

      subgroups.sortedIds.forEach(sgId => {
        const newGroupId = `${groupId}_${sgId}`;
        const cardCount = subgroups.groups[sgId]?.cards?.length ?? 0;
        if (cardCount > 0) {
          cardGroupInfo[newGroupId] = {
            id: newGroupId,
            label:
              groupInfo.level > 0
                ? `${groupInfo.label} - ${subgroups.groups[sgId]?.label}`
                : subgroups.groups[sgId]?.label,
            cardCount,
            subGroupIds: [],
            level: groupInfo?.level + 1,
          };
          groupInfo.subGroupIds.push(newGroupId);
          groupIdsToProcess.push(newGroupId);
          groupCards[newGroupId] = subgroups.groups[sgId]?.cards?.map(getCardKey) ?? [];
        }
      });
    }
  };

  while (groupIdsToProcess.length > 0) {
    const process = groupIdsToProcess.pop();
    if (process) processGroup(process, process === ROOT_GROUP_ID ? cards : undefined);
  }

  return {
    groupInfo: cardGroupInfo,
    collectionCards: cardMap,
    groupCards,
  };
};
