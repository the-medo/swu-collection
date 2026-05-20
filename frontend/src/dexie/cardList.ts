import { db } from './db';
import type { CardList } from '../../../lib/swu-resources/types.ts';

const OFFICIAL_DATA_KEY = 'official-card-list';
const OFFICIAL_VERSION_KEY = 'official-card-list-version';
const PREVIEW_DATA_KEY = 'preview-card-list';
const PREVIEW_VERSION_KEY = 'preview-card-list-version';

export interface CardListCacheStore {
  key: string;
  value: unknown;
}

async function get<T>(key: string): Promise<T | undefined> {
  const rec = (await db.cardListCache.get(key)) as CardListCacheStore | undefined;
  return (rec?.value as T) || undefined;
}

async function set(key: string, value: unknown): Promise<void> {
  await db.cardListCache.put({ key, value } as CardListCacheStore);
}

export async function getOfficialCardListData(): Promise<CardList | undefined> {
  return get<CardList>(OFFICIAL_DATA_KEY);
}

export async function setOfficialCardListData(data: CardList): Promise<void> {
  await set(OFFICIAL_DATA_KEY, data);
}

export async function getOfficialCardListVersion(): Promise<string | undefined> {
  return get<string>(OFFICIAL_VERSION_KEY);
}

export async function setOfficialCardListVersion(version: string): Promise<void> {
  await set(OFFICIAL_VERSION_KEY, version);
}

export async function getPreviewCardListData(): Promise<CardList | undefined> {
  return get<CardList>(PREVIEW_DATA_KEY);
}

export async function setPreviewCardListData(data: CardList): Promise<void> {
  await set(PREVIEW_DATA_KEY, data);
}

export async function getPreviewCardListVersion(): Promise<string | undefined> {
  return get<string>(PREVIEW_VERSION_KEY);
}

export async function setPreviewCardListVersion(version: string): Promise<void> {
  await set(PREVIEW_VERSION_KEY, version);
}

// Legacy accessors kept for any callers that haven't migrated yet.
export async function getCardListData(): Promise<CardList | undefined> {
  return getOfficialCardListData();
}

export async function setCardListData(data: CardList): Promise<void> {
  await setOfficialCardListData(data);
}

export async function getCardListVersion(): Promise<string | undefined> {
  return getOfficialCardListVersion();
}

export async function setCardListVersion(version: string): Promise<void> {
  await setOfficialCardListVersion(version);
}
