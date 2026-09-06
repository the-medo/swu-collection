import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { applicationConfiguration } from '../../db/schema/application_configuration.ts';
import { karabastUnimplementedCard } from '../../db/schema/karabast_unimplemented_card.ts';
import { getMergedCardList, getPreviewCardList } from '../cards/cardListProvider.ts';
import { setKarabastUnimplementedCacheFromRows } from './unimplementedCardsCache.ts';
import {
  buildKarabastUnimplementedMappingContext,
  karabastUnimplementedApiResponseSchema,
  transformKarabastUnimplementedRowsForStorage,
  type KarabastUnimplementedApiRow,
  type KarabastUnimplementedMap,
  type KarabastUnimplementedStorageRow,
} from './unimplementedCards.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';

const KARABAST_UNIMPLEMENTED_ENDPOINT = 'https://api.karabast.net/api/get-unimplemented';
const KARABAST_UNIMPLEMENTED_FETCH_TIMEOUT_MS = 30_000;
const KARABAST_UNIMPLEMENTED_DATETIME_CONFIGURATION_KEY = 'karabast_unimplemented_datetime';

type KarabastUnimplementedFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type KarabastUnimplementedRefreshStore = {
  replaceAll: (rows: KarabastUnimplementedStorageRow[], refreshedAt: string) => Promise<void>;
};

export type FetchKarabastUnimplementedCardsOptions = {
  fetchFn?: KarabastUnimplementedFetch;
  getMergedCards?: () => Promise<CardList>;
  getPreviewCards?: () => Promise<CardList>;
  now?: () => Date;
  setCacheFromRows?: (rows: KarabastUnimplementedStorageRow[]) => KarabastUnimplementedMap;
  store?: KarabastUnimplementedRefreshStore;
  timeoutMs?: number;
};

export type FetchKarabastUnimplementedCardsResult = {
  fetchedRows: number;
  storedRows: number;
  matchedRows: number;
  unmatchedRows: number;
  refreshedAt: string;
  karabastUnimplemented: KarabastUnimplementedMap;
};

const defaultStore: KarabastUnimplementedRefreshStore = {
  async replaceAll(rows, refreshedAt) {
    await db.transaction(async tx => {
      await tx.delete(karabastUnimplementedCard);

      if (rows.length > 0) {
        await tx.insert(karabastUnimplementedCard).values(rows);
      }

      await tx
        .insert(applicationConfiguration)
        .values({
          key: KARABAST_UNIMPLEMENTED_DATETIME_CONFIGURATION_KEY,
          value: refreshedAt,
        })
        .onConflictDoUpdate({
          target: applicationConfiguration.key,
          set: {
            value: sql`excluded.value`,
          },
        });
    });
  },
};

export function dedupeKarabastUnimplementedRows(
  rows: KarabastUnimplementedApiRow[],
): KarabastUnimplementedApiRow[] {
  const rowsByTitle = new Map<string, KarabastUnimplementedApiRow>();

  rows.forEach(row => {
    if (rowsByTitle.has(row.titleAndSubtitle)) {
      console.warn(
        `Ignoring duplicate Karabast unimplemented row for title ${row.titleAndSubtitle}`,
      );
      return;
    }

    rowsByTitle.set(row.titleAndSubtitle, row);
  });

  return [...rowsByTitle.values()];
}

async function fetchKarabastUnimplementedRows(
  fetchFn: KarabastUnimplementedFetch,
  timeoutMs: number,
): Promise<KarabastUnimplementedApiRow[]> {
  const response = await fetchFn(KARABAST_UNIMPLEMENTED_ENDPOINT, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Karabast unimplemented fetch failed with ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return karabastUnimplementedApiResponseSchema.parse(data);
}

export async function fetchKarabastUnimplementedCards(
  options: FetchKarabastUnimplementedCardsOptions = {},
): Promise<FetchKarabastUnimplementedCardsResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? KARABAST_UNIMPLEMENTED_FETCH_TIMEOUT_MS;
  const rows = await fetchKarabastUnimplementedRows(fetchFn, timeoutMs);
  const dedupedRows = dedupeKarabastUnimplementedRows(rows);
  const [cards, previewCards] = await Promise.all([
    (options.getMergedCards ?? getMergedCardList)(),
    (options.getPreviewCards ?? getPreviewCardList)(),
  ]);
  const context = buildKarabastUnimplementedMappingContext(cards, previewCards);
  const storageRows = transformKarabastUnimplementedRowsForStorage(dedupedRows, context);
  const refreshedAt = (options.now ?? (() => new Date()))().toISOString();

  await (options.store ?? defaultStore).replaceAll(storageRows, refreshedAt);

  const karabastUnimplemented = (options.setCacheFromRows ?? setKarabastUnimplementedCacheFromRows)(
    storageRows,
  );

  return {
    fetchedRows: rows.length,
    storedRows: storageRows.length,
    matchedRows: storageRows.filter(row => row.cardId !== null).length,
    unmatchedRows: storageRows.filter(row => row.cardId === null).length,
    refreshedAt,
    karabastUnimplemented,
  };
}
