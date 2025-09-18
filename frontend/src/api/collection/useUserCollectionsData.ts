import { skipToken, useQuery } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { db } from '@/dexie/db';
import { syncFromServer } from '@/api/collection/lib/syncFromServer.ts';
import { Collection } from '../../../../types/Collection.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';
import { CollectionType } from '../../../../types/enums.ts';

type CollectionsIdArrayAndBooleanMap = {
  idArray: string[];
  map: Record<string, boolean>;
};

type CardsByCollectionType = {
  total: number;
  collectionMap: Record<string, CollectionCard[]>;
};

type UserCollectionsDataResult = {
  info: {
    map: Record<string, Collection>;
    collections: CollectionsIdArrayAndBooleanMap & {
      forSale: CollectionsIdArrayAndBooleanMap;
      forDecks: CollectionsIdArrayAndBooleanMap;
    };
    wantlists: CollectionsIdArrayAndBooleanMap;
    cardlists: CollectionsIdArrayAndBooleanMap;
  };
  cards: Record<
    string, // = cardId
    {
      [CollectionType.COLLECTION]: CardsByCollectionType & {
        forSale: number;
        forDecks: number;
      };
      [CollectionType.WANTLIST]: CardsByCollectionType;
      [CollectionType.OTHER]: CardsByCollectionType;
    }
  >;
};

export function useUserCollectionsData(skip?: boolean | undefined) {
  return useQuery<UserCollectionsDataResult, ErrorWithStatus>({
    queryKey: ['user-collections-sync'],
    queryFn: skip
      ? skipToken
      : async () => {
          await syncFromServer();

          const collections = await db.collections.toArray();
          const collectionCards = await db.collectionCards.toArray();

          // Build info maps
          const infoMap: Record<string, Collection> = {};
          const allIds: string[] = [];
          const allIdsMap: Record<string, boolean> = {};
          const forSaleIds: string[] = [];
          const forSaleMap: Record<string, boolean> = {};
          const forDecksIds: string[] = [];
          const forDecksMap: Record<string, boolean> = {};
          const wantlistIds: string[] = [];
          const wantlistMap: Record<string, boolean> = {};
          const cardlistIds: string[] = [];
          const cardlistMap: Record<string, boolean> = {};

          for (const c of collections) {
            infoMap[c.id] = c as Collection;
            allIds.push(c.id);
            allIdsMap[c.id] = true;
            if (c.forSale) {
              forSaleIds.push(c.id);
              forSaleMap[c.id] = true;
            }
            if (c.forDecks) {
              forDecksIds.push(c.id);
              forDecksMap[c.id] = true;
            }
            if (c.collectionType === CollectionType.WANTLIST) {
              wantlistIds.push(c.id);
              wantlistMap[c.id] = true;
            } else if (c.collectionType === CollectionType.OTHER) {
              cardlistIds.push(c.id);
              cardlistMap[c.id] = true;
            }
          }

          // Build cards aggregation per cardId and collection type
          const cards: UserCollectionsDataResult['cards'] = {};

          const ensureCardEntry = (cardId: string) => {
            if (!cards[cardId]) {
              cards[cardId] = {
                [CollectionType.COLLECTION]: {
                  total: 0,
                  collectionMap: {},
                  forSale: 0,
                  forDecks: 0,
                },
                [CollectionType.WANTLIST]: { total: 0, collectionMap: {} },
                [CollectionType.OTHER]: { total: 0, collectionMap: {} },
              } as any;
            }
          };

          const cardsByCollectionId: Record<string, CollectionCard[]> = {};
          for (const cc of collectionCards) {
            cardsByCollectionId[cc.collectionId] = cc.cards || [];
          }

          for (const col of collections) {
            const colCards = cardsByCollectionId[col.id] || [];
            console.log(col?.title, { col, colCards });
            if (!colCards.length) continue;
            const typeKey = col.collectionType;
            for (const card of colCards) {
              ensureCardEntry(card.cardId);
              const entry = cards[card.cardId][typeKey] as CardsByCollectionType & any;
              if (!entry.collectionMap[col.id]) entry.collectionMap[col.id] = [];
              entry.collectionMap[col.id].push(card);
              entry.total += card.amount || 0;
              if (typeKey === CollectionType.COLLECTION) {
                if (col.forSale) entry.forSale += card.amount || 0;
                if (col.forDecks) entry.forDecks += card.amount || 0;
              }
            }
          }

          const result: UserCollectionsDataResult = {
            info: {
              map: infoMap,
              collections: {
                idArray: allIds,
                map: allIdsMap,
                forSale: { idArray: forSaleIds, map: forSaleMap },
                forDecks: { idArray: forDecksIds, map: forDecksMap },
              },
              wantlists: { idArray: wantlistIds, map: wantlistMap },
              cardlists: { idArray: cardlistIds, map: cardlistMap },
            },
            cards,
          };

          return result;
        },
    staleTime: Infinity,
  });
}
