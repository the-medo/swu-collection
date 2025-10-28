import { db } from './db';
import type { CardList } from '../../../lib/swu-resources/types.ts';

const DATA_KEY = 'swubase-card-list';
const VERSION_KEY = 'swubase-card-list-version';

export interface CardListCacheStore {
  key: string;
  value: unknown;
}

export async function getCardListData(): Promise<CardList | undefined> {
  const rec = (await db.cardListCache.get(DATA_KEY)) as CardListCacheStore | undefined;
  return (rec?.value as CardList) || undefined;
}

export async function setCardListData(data: CardList): Promise<void> {
  await db.cardListCache.put({ key: DATA_KEY, value: data } as CardListCacheStore);
}

export async function getCardListVersion(): Promise<string | undefined> {
  const rec = (await db.cardListCache.get(VERSION_KEY)) as CardListCacheStore | undefined;
  return (rec?.value as string) || undefined;
}

export async function setCardListVersion(version: string): Promise<void> {
  await db.cardListCache.put({ key: VERSION_KEY, value: version } as CardListCacheStore);
}
