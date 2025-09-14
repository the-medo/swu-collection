import { db } from './db';
import { Collection } from '../../../types/Collection.ts';
import { CollectionCard } from '../../../types/CollectionCard.ts';

export interface CollectionStore extends Collection {}

export interface CollectionCardsStore {
  collectionId: string;
  cards: CollectionCard[];
}

export async function getCollection(id: string): Promise<CollectionStore | undefined> {
  return await db.collections.get(id);
}

export async function upsertCollection(collection: CollectionStore): Promise<void> {
  await db.collections.put(collection);
}

export async function deleteCollection(id: string): Promise<void> {
  await db.collections.delete(id);
  await db.collectionCards.delete(id);
}

export async function getCollectionCards(
  collectionId: string,
): Promise<CollectionCardsStore | undefined> {
  return (await db.collectionCards.get(collectionId)) as CollectionCardsStore | undefined;
}

export async function upsertCollectionCards(
  collectionId: string,
  cards: CollectionCard[],
): Promise<void> {
  await db.collectionCards.put({
    collectionId,
    cards,
  } as CollectionCardsStore);
}

export async function deleteCollectionCards(collectionId: string): Promise<void> {
  await db.collectionCards.delete(collectionId);
}
