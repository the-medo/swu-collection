import { describe, expect, test } from 'bun:test';
import { ZodError } from 'zod';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import {
  dedupeKarabastUnimplementedRows,
  fetchKarabastUnimplementedCards,
  type KarabastUnimplementedRefreshStore,
} from './fetchKarabastUnimplementedCards.ts';
import type {
  KarabastUnimplementedApiRow,
  KarabastUnimplementedStorageRow,
} from './unimplementedCards.ts';

const card = (
  cardId: string,
  options: {
    set?: string;
    cardNo?: number;
    cardUid?: string[];
    preview?: boolean;
    karabastIdToSwubaseId?: string;
  } = {},
) =>
  ({
    cardId,
    cardUid: options.cardUid ?? [],
    preview: options.preview,
    karabast_id_to_swubase_id: options.karabastIdToSwubaseId,
    variants:
      options.set && options.cardNo
        ? {
            [`${cardId}-standard`]: {
              variantId: `${cardId}-standard`,
              set: options.set,
              cardNo: options.cardNo,
            },
          }
        : {},
  }) as CardList[string];

const row = (overrides: Partial<KarabastUnimplementedApiRow>): KarabastUnimplementedApiRow => ({
  id: 'karabast-id',
  titleAndSubtitle: 'Unknown Card',
  ...overrides,
});

const jsonResponse = (data: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
    },
    ...init,
  });

function captureWarnings<T>(fn: () => T): { result: T; warnings: string[] } {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    return {
      result: fn(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

async function captureWarningsAsync<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    return {
      result: await fn(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

function createStore(): KarabastUnimplementedRefreshStore & {
  calls: number;
  refreshedAt: string | null;
  rows: KarabastUnimplementedStorageRow[] | null;
} {
  return {
    calls: 0,
    refreshedAt: null,
    rows: null,
    async replaceAll(rows, refreshedAt) {
      this.calls++;
      this.rows = rows;
      this.refreshedAt = refreshedAt;
    },
  };
}

describe('fetchKarabastUnimplementedCards', () => {
  test('fetches, maps, replaces rows, updates timestamp, and hydrates cache after storage succeeds', async () => {
    const store = createStore();
    let cacheRows: KarabastUnimplementedStorageRow[] | null = null;
    const apiRows = [
      row({
        id: 'karabast-uid',
        titleAndSubtitle: 'UID Match',
      }),
      row({
        id: 'missing-id',
        titleAndSubtitle: 'Missing Card',
      }),
    ];
    const cards = {
      'uid-match': card('uid-match', { cardUid: ['karabast-uid'] }),
    } as CardList;

    const result = await fetchKarabastUnimplementedCards({
      fetchFn: async () => jsonResponse(apiRows),
      getMergedCards: async () => cards,
      getPreviewCards: async () => ({}),
      now: () => new Date('2026-06-04T12:34:56.789Z'),
      setCacheFromRows: rows => {
        cacheRows = rows;
        return {
          'uid-match': true,
        };
      },
      store,
    });

    expect(store.calls).toBe(1);
    expect(store.refreshedAt).toBe('2026-06-04T12:34:56.789Z');
    expect(store.rows).toEqual([
      {
        title: 'UID Match',
        cardId: 'uid-match',
        data: apiRows[0],
      },
      {
        title: 'Missing Card',
        cardId: null,
        data: apiRows[1],
      },
    ]);
    expect(cacheRows === store.rows).toBe(true);
    expect(result).toEqual({
      fetchedRows: 2,
      storedRows: 2,
      matchedRows: 1,
      unmatchedRows: 1,
      refreshedAt: '2026-06-04T12:34:56.789Z',
      karabastUnimplemented: {
        'uid-match': true,
      },
    });
  });

  test('deduplicates duplicate title rows before storage', async () => {
    const store = createStore();
    const apiRows = [
      row({
        id: 'first-id',
        titleAndSubtitle: 'Duplicate Title',
      }),
      row({
        id: 'second-id',
        titleAndSubtitle: 'Duplicate Title',
      }),
    ];
    const { result, warnings } = await captureWarningsAsync(() =>
      fetchKarabastUnimplementedCards({
        fetchFn: async () => jsonResponse(apiRows),
        getMergedCards: async () => ({}),
        getPreviewCards: async () => ({}),
        setCacheFromRows: () => ({}),
        store,
      }),
    );

    expect(store.rows).toEqual([
      {
        title: 'Duplicate Title',
        cardId: null,
        data: apiRows[0],
      },
    ]);
    expect(result.storedRows).toBe(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Ignoring duplicate Karabast unimplemented row');
  });

  test('does not replace rows or hydrate cache when fetch fails', async () => {
    const store = createStore();
    let cacheHydrated = false;

    await expect(
      fetchKarabastUnimplementedCards({
        fetchFn: async () => jsonResponse({ error: 'unavailable' }, { status: 503 }),
        getMergedCards: async () => {
          throw new Error('should not load cards');
        },
        getPreviewCards: async () => ({}),
        setCacheFromRows: () => {
          cacheHydrated = true;
          return {};
        },
        store,
      }),
    ).rejects.toThrow('Karabast unimplemented fetch failed');

    expect(store.calls).toBe(0);
    expect(cacheHydrated).toBe(false);
  });

  test('does not replace rows or hydrate cache when validation fails', async () => {
    const store = createStore();
    let cacheHydrated = false;

    try {
      await fetchKarabastUnimplementedCards({
        fetchFn: async () => jsonResponse([{ id: 'missing-title' }]),
        getMergedCards: async () => {
          throw new Error('should not load cards');
        },
        getPreviewCards: async () => ({}),
        setCacheFromRows: () => {
          cacheHydrated = true;
          return {};
        },
        store,
      });

      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
    }

    expect(store.calls).toBe(0);
    expect(cacheHydrated).toBe(false);
  });

  test('does not hydrate cache when storage fails', async () => {
    let storeCalls = 0;
    let cacheHydrated = false;
    const store: KarabastUnimplementedRefreshStore = {
      async replaceAll() {
        storeCalls++;
        throw new Error('transaction failed');
      },
    };

    await expect(
      fetchKarabastUnimplementedCards({
        fetchFn: async () =>
          jsonResponse([
            row({
              id: 'karabast-uid',
              titleAndSubtitle: 'UID Match',
            }),
          ]),
        getMergedCards: async () =>
          ({
            'uid-match': card('uid-match', { cardUid: ['karabast-uid'] }),
          }) as CardList,
        getPreviewCards: async () => ({}),
        setCacheFromRows: () => {
          cacheHydrated = true;
          return {};
        },
        store,
      }),
    ).rejects.toThrow('transaction failed');

    expect(storeCalls).toBe(1);
    expect(cacheHydrated).toBe(false);
  });
});

describe('dedupeKarabastUnimplementedRows', () => {
  test('keeps the first row for duplicate titles', () => {
    const first = row({
      id: 'first-id',
      titleAndSubtitle: 'Duplicate Title',
    });
    const second = row({
      id: 'second-id',
      titleAndSubtitle: 'Duplicate Title',
    });
    const { result, warnings } = captureWarnings(() =>
      dedupeKarabastUnimplementedRows([first, second]),
    );

    expect(result).toEqual([first]);
    expect(warnings).toHaveLength(1);
  });
});
