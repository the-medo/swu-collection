import { desc } from 'drizzle-orm';
import { cardList } from '../../db/lists.ts';
import { db } from '../../db';
import { previewCard } from '../../db/schema/preview_card.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { normalizePreviewCardPayload } from './previewCardPayload.ts';

const EMPTY_PREVIEW_CARD_LIST_VERSION = '1970-01-01T00:00:00.000Z';
export const officialCardListVersion = new Date().toISOString();

type PreviewCardCache = {
  version: string;
  cards: CardList;
  validationErrors: PreviewCardValidationError[];
};

type MergedCardListCache = {
  version: string;
  cards: CardList;
};

export type PreviewCardValidationError = {
  id: string;
  cardId: string;
  message: string;
};

export type CardListUpdateSection = {
  needsUpdate: boolean;
  lastUpdated: string;
  cards?: CardList;
};

let previewCardCache: PreviewCardCache | null = null;
let previewCardCacheLoad: Promise<PreviewCardCache> | null = null;
let previewCardCacheGeneration = 0;
let mergedCardListCache: MergedCardListCache | null = null;

export function getOfficialCardListVersion(): string {
  return officialCardListVersion;
}

export function getOfficialCardList(): CardList {
  return cardList;
}

export async function getPreviewCardListVersion(): Promise<string> {
  const cache = await getPreviewCardCache();
  return cache.version;
}

export async function getPreviewCardList(): Promise<CardList> {
  const cache = await getPreviewCardCache();
  return cache.cards;
}

export async function getPreviewCardValidationErrors(): Promise<PreviewCardValidationError[]> {
  const cache = await getPreviewCardCache();
  return cache.validationErrors;
}

export async function getMergedCardList(): Promise<CardList> {
  const previewCache = await getPreviewCardCache();
  const version = `${officialCardListVersion}:${previewCache.version}`;

  if (mergedCardListCache?.version === version) {
    return mergedCardListCache.cards;
  }

  mergedCardListCache = {
    version,
    cards: mergeCardLists(cardList, previewCache.cards),
  };

  return mergedCardListCache.cards;
}

export function mergeCardLists(officialCards: CardList, previewCards: CardList): CardList {
  return {
    ...previewCards,
    ...officialCards,
  };
}

export function isCardListVersionStale(
  clientVersion: string | undefined,
  serverVersion: string,
): boolean {
  if (!clientVersion) return true;

  const clientTime = new Date(clientVersion).getTime();
  const serverTime = new Date(serverVersion).getTime();
  if (Number.isNaN(clientTime) || Number.isNaN(serverTime)) return true;

  return clientTime < serverTime;
}

export function buildCardListUpdateSection(
  clientVersion: string | undefined,
  serverVersion: string,
  cards: CardList,
): CardListUpdateSection {
  const needsUpdate = isCardListVersionStale(clientVersion, serverVersion);

  return {
    needsUpdate,
    lastUpdated: serverVersion,
    ...(needsUpdate ? { cards } : {}),
  };
}

export async function buildPreviewCardListUpdateSection(
  clientVersion: string | undefined,
): Promise<CardListUpdateSection> {
  const cache = await getPreviewCardCache();
  return buildCardListUpdateSection(clientVersion, cache.version, cache.cards);
}

export async function getCardFromMergedList(cardId: string) {
  const mergedCardList = await getMergedCardList();
  return mergedCardList[cardId];
}

export function invalidatePreviewCardCache(): void {
  previewCardCacheGeneration++;
  previewCardCache = null;
  previewCardCacheLoad = null;
  mergedCardListCache = null;
}

async function getPreviewCardCache(): Promise<PreviewCardCache> {
  if (previewCardCache) {
    return previewCardCache;
  }

  const generation = previewCardCacheGeneration;
  previewCardCacheLoad ??= loadPreviewCardCache();

  try {
    const loadedCache = await previewCardCacheLoad;
    if (generation !== previewCardCacheGeneration) {
      return getPreviewCardCache();
    }

    previewCardCache = loadedCache;
    return loadedCache;
  } finally {
    if (generation === previewCardCacheGeneration) {
      previewCardCacheLoad = null;
    }
  }
}

async function loadPreviewCardCache(): Promise<PreviewCardCache> {
  const rows = await db.select().from(previewCard).orderBy(desc(previewCard.updatedAt));

  const cards: CardList = {};
  const validationErrors: PreviewCardValidationError[] = [];
  const version = rows[0]?.updatedAt ?? EMPTY_PREVIEW_CARD_LIST_VERSION;

  rows.forEach(row => {
    if (row.status !== 'active') return;

    try {
      const payload = normalizePreviewCardPayload(row.payload);
      cards[row.cardId] = {
        ...payload,
        cardId: row.cardId,
        preview: true,
        previewStatus: 'active',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      validationErrors.push({
        id: row.id,
        cardId: row.cardId,
        message,
      });
      console.error(`Skipping invalid preview card ${row.cardId}:`, error);
    }
  });

  return {
    version,
    cards,
    validationErrors,
  };
}
