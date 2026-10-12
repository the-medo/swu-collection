import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import {
  isSharedPrivateDeck,
  resetDeniedDeckAccess,
  updateDeckPricesCache,
} from './deckAccessCache.ts';
import { deckKeys } from './queryKeys.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import type { DeckVersionsResponse } from './useGetDeckVersions.ts';

test.each(['deck', 'version', 'expired-version'])(
  'revocation through %s clears every cached reference for that viewer',
  async deniedId => {
    const client = new QueryClient();
    const cards = { data: [{ cardId: 'fleet-lieutenant', quantity: 3 }] };
    const privateData = {
      deck: { id: 'deck', userId: 'owner', public: 0 },
      reference: { deckId: 'deck' },
    } as DeckData;
    const history = {
      deckId: 'deck',
      data: [{ id: 'version' }, { id: 'expired-version' }],
    } as DeckVersionsResponse;
    for (const viewer of ['owner', 'member']) {
      for (const id of ['deck', 'version', 'expired-version']) {
        if (id !== 'expired-version') client.setQueryData(deckKeys.detail(id, viewer), privateData);
        client.setQueryData(deckKeys.cards(id, viewer), cards);
      }
      client.setQueryData(['deck-versions', 'deck', viewer], history);
      client.setQueryData(['deck-version-diff', 'deck', 'version', viewer], cards);
    }
    const unrelatedData = { deck: { id: 'unrelated', public: 0 } } as DeckData;
    client.setQueryData(deckKeys.detail('unrelated', 'member'), unrelatedData);
    try {
      await resetDeniedDeckAccess(client, deniedId, 'member');
      for (const id of ['deck', 'version', 'expired-version']) {
        expect(client.getQueryData(deckKeys.detail(id, 'member'))).toBeUndefined();
        expect(client.getQueryData(deckKeys.cards(id, 'member'))).toBeUndefined();
        expect(client.getQueryData<typeof cards>(deckKeys.cards(id, 'owner'))).toEqual(cards);
      }
      expect(client.getQueryData(['deck-versions', 'deck', 'member'])).toBeUndefined();
      expect(
        client.getQueryData(['deck-version-diff', 'deck', 'version', 'member']),
      ).toBeUndefined();
      expect(client.getQueryData<DeckVersionsResponse>(['deck-versions', 'deck', 'owner'])).toEqual(
        history,
      );
      expect(client.getQueryData<DeckData>(deckKeys.detail('unrelated', 'member'))).toEqual(
        unrelatedData,
      );
    } finally {
      client.clear();
    }
  },
);

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
  client.setQueryData(['deck-versions', 'deck', 'member'], privateData);
  client.setQueryData(['deck-versions', 'deck', 'owner'], privateData);
  client.setQueryData(['deck-version-diff', 'deck', 'version', 'member'], privateCards);
  client.setQueryData(['deck-version-diff', 'deck', 'version', 'owner'], privateCards);
  client.setQueryData(deckKeys.detail('inactive', 'member'), privateData);
  client.setQueryData(deckKeys.cards('inactive', 'member'), privateCards);
  client.setQueryData(deckDiscussionKeys.article('deck', 'member'), privateData);
  client.setQueryData(deckDiscussionKeys.article('deck', 'owner'), privateData);
  client.setQueryData(
    discussionKeys.ownComments({ attachmentType: 'deck', attachmentId: 'deck' }, 'member'),
    privateData,
  );
  client.setQueryData(deckDiscussionKeys.discussion('deck', 'member'), { id: 'discussion' });
  client.setQueryData(discussionKeys.info('discussion', 'member'), { total: 2 });
  client.setQueryData(discussionKeys.comments('discussion', 'member'), privateData);
  client.setQueryData(discussionKeys.comments('discussion', 'member', 'parent'), privateData);
  client.setQueryData(discussionKeys.comments('discussion', 'owner'), privateData);
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
    expect(client.getQueryData(['deck-versions', 'deck', 'member'])).toBeUndefined();
    expect(client.getQueryData(['deck-version-diff', 'deck', 'version', 'member'])).toBeUndefined();
    expect(client.getQueryData<DeckData>(['deck-versions', 'deck', 'owner'])).toEqual(privateData);
    expect(
      client.getQueryData<typeof privateCards>(['deck-version-diff', 'deck', 'version', 'owner']),
    ).toEqual(privateCards);
    expect(client.getQueryData(discussionKeys.info('discussion', 'member'))).toBeUndefined();
    expect(client.getQueryData(discussionKeys.comments('discussion', 'member'))).toBeUndefined();
    expect(
      client.getQueryData(discussionKeys.comments('discussion', 'member', 'parent')),
    ).toBeUndefined();
    expect(client.getQueryData<DeckData>(discussionKeys.comments('discussion', 'owner'))).toEqual(
      privateData,
    );
    expect(client.getQueryData(deckDiscussionKeys.article('deck', 'member'))).toBeUndefined();
    expect(client.getQueryData<DeckData>(deckDiscussionKeys.article('deck', 'owner'))).toEqual(
      privateData,
    );
    expect(
      client.getQueryData<DeckData>(
        discussionKeys.ownComments({ attachmentType: 'deck', attachmentId: 'deck' }, 'member'),
      ),
    ).toEqual(privateData);
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

test('access resets retain only the viewer-scoped binding when deck metadata has expired', async () => {
  const client = new QueryClient();
  const memberBinding = deckDiscussionKeys.binding('deck', 'member');
  const ownerBinding = deckDiscussionKeys.binding('deck', 'owner');
  const memberInfo = discussionKeys.info('discussion', 'member');
  const memberReplies = discussionKeys.comments('discussion', 'member', 'parent');
  const ownerReplies = discussionKeys.comments('discussion', 'owner', 'parent');
  const privateReplies = { pages: [{ data: ['Private reply'] }] };
  client.setQueryData(memberBinding, 'discussion');
  client.setQueryData(ownerBinding, 'discussion');
  client.setQueryData(memberInfo, { id: 'discussion', total: 2 });
  client.setQueryData(memberReplies, privateReplies);
  client.setQueryData(ownerReplies, privateReplies);
  try {
    await resetDeniedDeckAccess(client, 'deck', 'member');
    expect(client.getQueryData(memberInfo)).toBeUndefined();
    expect(client.getQueryData(memberReplies)).toBeUndefined();
    expect(client.getQueryData<typeof privateReplies>(ownerReplies)).toEqual(privateReplies);
    expect(client.getQueryData<string>(memberBinding)).toBe('discussion');
    expect(client.getQueryData<string>(ownerBinding)).toBe('discussion');
    expect(client.getQueryData(deckDiscussionKeys.binding('deck'))).toBeUndefined();
  } finally {
    client.clear();
  }
});
