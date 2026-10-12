import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';
import { invalidateDeckReferences, needsDeckReferenceFetch } from './deckCache.ts';

const data = { deck: { id: 'deck', userId: 'owner', public: 1 } } as DeckData;
const cards = { data: [] };

test('invalidating a version refreshes its parent, siblings and bulk consumers for only that viewer', async () => {
  const client = new QueryClient();
  const references = ['deck', 'sealed', 'open', 'history-only', 'new-open'];
  for (const viewer of ['owner', 'member']) {
    for (const id of references) {
      if (id !== 'history-only' && id !== 'new-open')
        client.setQueryData(deckKeys.detail(id, viewer), data);
      client.setQueryData(deckKeys.cards(id, viewer), cards);
    }
    client.setQueryData(deckKeys.versions('deck', viewer), {
      deckId: 'deck',
      data: [{ id: 'sealed' }, { id: 'open' }, { id: 'history-only' }],
    });
    client.setQueryData(deckKeys.diff('deck', 'open', viewer), {});
    client.setQueryData(deckKeys.bulk(['other', 'open'], viewer), true);
    client.setQueryData(deckKeys.bulk(['other'], viewer), true);
    client.setQueryData(deckKeys.detail('other', viewer), { deck: { id: 'other', public: 1 } });
  }
  try {
    expect(needsDeckReferenceFetch(client, 'deck', 'owner')).toBe(false);
    await invalidateDeckReferences(client, 'sealed', 'owner', ['new-open']);
    for (const id of references) {
      expect(client.getQueryState(deckKeys.cards(id, 'owner'))?.isInvalidated).toBe(true);
      expect(client.getQueryState(deckKeys.cards(id, 'member'))?.isInvalidated).toBe(false);
      expect(client.getQueryData(deckKeys.cards(id, 'owner'))).toEqual(cards);
    }
    for (const key of [
      deckKeys.versions('deck', 'owner'),
      deckKeys.diff('deck', 'open', 'owner'),
      deckKeys.bulk(['other', 'open'], 'owner'),
    ]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    for (const key of [
      deckKeys.versions('deck', 'member'),
      deckKeys.diff('deck', 'open', 'member'),
      deckKeys.bulk(['other', 'open'], 'member'),
      deckKeys.bulk(['other'], 'owner'),
      deckKeys.detail('other', 'owner'),
    ]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    }
    expect(needsDeckReferenceFetch(client, 'deck', 'owner')).toBe(true);
    expect(needsDeckReferenceFetch(client, 'deck', 'member')).toBe(false);
  } finally {
    client.clear();
  }
});

test('metadata finishes refreshing before cards, preserving the conservative save timestamp', async () => {
  const client = new QueryClient();
  client.setQueryData(deckKeys.detail('deck', 'owner'), data);
  client.setQueryData(deckKeys.cards('deck', 'owner'), cards);
  const calls: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const detail = new QueryObserver(client, {
    queryKey: deckKeys.detail('deck', 'owner'),
    staleTime: Infinity,
    queryFn: async () => {
      calls.push('detail');
      await gate;
      return data;
    },
  });
  const content = new QueryObserver(client, {
    queryKey: deckKeys.cards('deck', 'owner'),
    staleTime: Infinity,
    queryFn: async () => {
      calls.push('cards');
      return cards;
    },
  });
  const unsubscribe = [detail.subscribe(() => {}), content.subscribe(() => {})];
  const refresh = invalidateDeckReferences(client, 'deck', 'owner');
  try {
    expect(calls).toEqual(['detail']);
    release();
    await refresh;
    expect(calls).toEqual(['detail', 'cards']);
    expect(needsDeckReferenceFetch(client, 'deck', 'owner')).toBe(false);
  } finally {
    release();
    await refresh;
    unsubscribe.forEach(stop => stop());
    client.clear();
  }
});
