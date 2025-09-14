import { useQuery } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { db } from '@/dexie/db';
import { type CollectionCardsStore, type CollectionStore } from '@/dexie/collections';
import { syncFromServer } from '@/api/collection/lib/syncFromServer.ts';

export type UseUserCollectionsDataResult = {
  collections: CollectionStore[];
  collectionCards: CollectionCardsStore[];
};

export function useUserCollectionsData() {
  return useQuery<UseUserCollectionsDataResult, ErrorWithStatus>({
    queryKey: ['user-collections-sync'],
    queryFn: async () => {
      await syncFromServer();

      const collections = await db.collections.toArray();
      const collectionCards = await db.collectionCards.toArray();

      return { collections, collectionCards };
    },
    staleTime: 5 * 60 * 1000,
  });
}
