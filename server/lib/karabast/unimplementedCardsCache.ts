import { isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { karabastUnimplementedCard } from '../../db/schema/karabast_unimplemented_card.ts';
import type { KarabastUnimplementedMap } from './unimplementedCards.ts';

const KARABAST_UNIMPLEMENTED_CACHE_TTL_MS = 15 * 60 * 1000;

type KarabastUnimplementedCache = {
  loadedAtMs: number;
  map: KarabastUnimplementedMap;
};

type KarabastUnimplementedMapRow = {
  cardId: string | null;
};

type KarabastUnimplementedRowsLoader = () => Promise<KarabastUnimplementedMapRow[]>;
type KarabastUnimplementedClock = () => number;

export function buildKarabastUnimplementedMap(
  rows: KarabastUnimplementedMapRow[],
): KarabastUnimplementedMap {
  return rows.reduce<KarabastUnimplementedMap>((map, row) => {
    if (row.cardId) {
      map[row.cardId] = true;
    }

    return map;
  }, {});
}

export function createKarabastUnimplementedMapCache(
  loadRows: KarabastUnimplementedRowsLoader,
  now: KarabastUnimplementedClock = Date.now,
  ttlMs = KARABAST_UNIMPLEMENTED_CACHE_TTL_MS,
) {
  let cache: KarabastUnimplementedCache | null = null;
  let cacheLoad: Promise<KarabastUnimplementedCache> | null = null;
  let cacheGeneration = 0;

  const loadCache = async (): Promise<KarabastUnimplementedCache> => {
    const rows = await loadRows();

    return {
      loadedAtMs: now(),
      map: buildKarabastUnimplementedMap(rows),
    };
  };

  const get = async (): Promise<KarabastUnimplementedMap> => {
    const nowMs = now();

    if (cache && nowMs - cache.loadedAtMs < ttlMs) {
      return cache.map;
    }

    const generation = cacheGeneration;
    const load = cacheLoad ?? (cacheLoad = loadCache());

    try {
      const loadedCache = await load;

      if (generation !== cacheGeneration) {
        return get();
      }

      cache = loadedCache;
      return loadedCache.map;
    } finally {
      if (cacheLoad === load) {
        cacheLoad = null;
      }
    }
  };

  const invalidate = (): void => {
    cacheGeneration++;
    cache = null;
    cacheLoad = null;
  };

  const setFromRows = (rows: KarabastUnimplementedMapRow[]): KarabastUnimplementedMap => {
    cacheGeneration++;
    const map = buildKarabastUnimplementedMap(rows);
    cache = {
      loadedAtMs: now(),
      map,
    };
    cacheLoad = null;

    return map;
  };

  return {
    get,
    invalidate,
    setFromRows,
  };
}

const karabastUnimplementedMapCache = createKarabastUnimplementedMapCache(
  loadKarabastUnimplementedRowsFromDb,
);

export function getKarabastUnimplementedMap(): Promise<KarabastUnimplementedMap> {
  return karabastUnimplementedMapCache.get();
}

export function invalidateKarabastUnimplementedCache(): void {
  karabastUnimplementedMapCache.invalidate();
}

export function setKarabastUnimplementedCacheFromRows(
  rows: KarabastUnimplementedMapRow[],
): KarabastUnimplementedMap {
  return karabastUnimplementedMapCache.setFromRows(rows);
}

async function loadKarabastUnimplementedRowsFromDb(): Promise<KarabastUnimplementedMapRow[]> {
  return (
    db
      .select({
        cardId: karabastUnimplementedCard.cardId,
      })
      .from(karabastUnimplementedCard)
      // Skip unmatched rows at the DB layer; the map builder also ignores nulls.
      .where(isNotNull(karabastUnimplementedCard.cardId))
  );
}
