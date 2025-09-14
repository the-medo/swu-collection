import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus.ts';
import {
  type CollectionCardsStore,
  type CollectionStore,
  deleteCollection,
  upsertCollection,
  upsertCollectionCards,
} from '@/dexie/collections.ts';
import { db } from '@/dexie';

// Request/Response types mirroring server
export type BulkCollectionsRequestItem = {
  collectionId: string;
  lastUpdatedAt?: string;
};

export type BulkCollectionsResponse = {
  collections: CollectionStore[];
  collectionCardsMap: Record<string, any[]>; // Using any to avoid importing server card type; stored as CollectionCard[] in Dexie
  removedCollections: string[];
};

async function getAllCollectionsFromDexie(): Promise<CollectionStore[]> {
  return db.collections.toArray();
}

async function buildClientCollectionsParam(): Promise<BulkCollectionsRequestItem[]> {
  const all = await getAllCollectionsFromDexie();
  return all.map(c => ({
    collectionId: c.id as string,
    lastUpdatedAt: (c as any).updatedAt as string | undefined,
  }));
}

export async function syncFromServer(): Promise<void> {
  const clientCollections = await buildClientCollectionsParam();

  const res = await api.collection['bulk']['data'].$post({
    json: { collections: clientCollections },
  });

  if (!res.ok) {
    const err: ErrorWithStatus = new Error('Failed to sync user collections');
    (err as any).status = res.status;
    throw err;
  }

  const json = (await res.json()) as BulkCollectionsResponse;

  // Upsert returned collections and their cards
  for (const col of json.collections || []) {
    await upsertCollection(col as CollectionStore);
    const cards = json.collectionCardsMap[col.id];
    if (cards) {
      await upsertCollectionCards(col.id as string, cards as CollectionCardsStore['cards']);
    }
  }

  // Delete collections that server marked as removed
  for (const id of json.removedCollections || []) {
    await deleteCollection(id);
  }
}
