import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import {
  isSharedPrivateDeck,
  resetDeniedDeckAccess,
  updateDeckPricesCache,
} from './deckAccessCache.ts';
import { deckKeys } from './queryKeys.ts';

test('fresh access is required for private viewers while owner/public editor caches stay stable', () => {
  const data = (visibility: number) =>
    ({ deck: { userId: 'owner', public: visibility } }) as Pick<DeckData, 'deck'>;
  expect(isSharedPrivateDeck(data(0), 'owner')).toBe(false);
  expect(isSharedPrivateDeck(data(0), 'member')).toBe(true);
  expect(isSharedPrivateDeck(data(0))).toBe(true);
  expect(isSharedPrivateDeck(data(1), 'member')).toBe(false);
  expect(isSharedPrivateDeck(data(2))).toBe(false);
  expect(isSharedPrivateDeck(undefined, 'member')).toBe(false);
});

test('price refresh updates the viewer-scoped detail without leaking into another account', () => {
  const client = new QueryClient();
  const data = {
    deck: { id: 'deck', userId: 'owner', public: 0 },
    entityPrices: [],
  } as unknown as DeckData;
  client.setQueryData(deckKeys.detail('deck', 'owner'), data);
  client.setQueryData(deckKeys.detail('deck', 'member'), data);
  const cardLookupKey = deckKeys.forCard('fleet-lieutenant');
  const statisticsKey = ['card-decks', 'fleet-lieutenant', 'meta', 'tournament', 'leader', 'base'];
  const lookup = { data: [{ deck: { id: 'deck', public: 1 }, entityPrices: [] }] };
  const statistics = { data: [{ deck: { id: 'tournament-deck', public: 1 } }] };
  client.setQueryData(cardLookupKey, lookup);
  client.setQueryData(statisticsKey, statistics);
  const prices = [
    { entityId: 'deck', sourceType: 'fixture', price: 12 },
  ] as unknown as DeckData['entityPrices'];
  try {
    updateDeckPricesCache(client, 'deck', 'owner', prices);
    expect(client.getQueryData<DeckData>(deckKeys.detail('deck', 'owner'))?.entityPrices).toEqual(
      prices,
    );
    expect(client.getQueryData<DeckData>(deckKeys.detail('deck', 'member'))?.entityPrices).toEqual(
      [],
    );
    expect(client.getQueryState(cardLookupKey)?.isInvalidated).toBe(true);
    expect(client.getQueryData<typeof lookup>(cardLookupKey)).toEqual(lookup);
    expect(client.getQueryState(statisticsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryData<typeof statistics>(statisticsKey)).toEqual(statistics);
    updateDeckPricesCache(client, 'missing', 'owner', prices);
    expect(client.getQueryData(deckKeys.detail('missing', 'owner'))).toBeUndefined();
  } finally {
    client.clear();
  }
});

test('revocation clears cached private data and notifies active observers without affecting the owner', async () => {
  const client = new QueryClient();
  const privateData = { deck: { id: 'deck', userId: 'owner', public: 0 } } as DeckData;
  const privateCards = { data: [{ cardId: 'fleet-lieutenant', quantity: 3 }] };
  client.setQueryData(deckKeys.detail('deck', 'owner'), privateData);
  client.setQueryData(deckKeys.detail('deck', 'member'), privateData);
  client.setQueryData(deckKeys.cards('deck', 'member'), privateCards);
  client.setQueryData(deckKeys.detail('inactive', 'member'), privateData);
  client.setQueryData(deckKeys.cards('inactive', 'member'), privateCards);
  const observers = [deckKeys.detail('deck', 'member'), deckKeys.cards('deck', 'member')].map(
    queryKey =>
      new QueryObserver(client, {
        queryKey,
        queryFn: async () => {
          throw Object.assign(new Error('Not found'), { status: 404 });
        },
        retry: false,
        staleTime: Infinity,
      }),
  );
  const unsubscribe = observers.map(observer => observer.subscribe(() => {}));
  try {
    expect(observers.every(observer => observer.getCurrentResult().data !== undefined)).toBe(true);
    await resetDeniedDeckAccess(client, 'deck', 'member');
    for (const observer of observers) {
      expect(observer.getCurrentResult().isError).toBe(true);
      expect(observer.getCurrentResult().data).toBeUndefined();
      expect(
        client.getQueryCache().find({ queryKey: observer.options.queryKey, exact: true }),
      ).toBeDefined();
    }
    await resetDeniedDeckAccess(client, 'inactive', 'member');
    expect(client.getQueryData(deckKeys.detail('inactive', 'member'))).toBeUndefined();
    expect(client.getQueryData(deckKeys.cards('inactive', 'member'))).toBeUndefined();
    expect(client.getQueryData<DeckData>(deckKeys.detail('deck', 'owner'))).toEqual(privateData);
  } finally {
    unsubscribe.forEach(stop => stop());
    client.clear();
  }
});
