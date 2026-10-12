import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';
import {
  assertDeckReadyToSave,
  isDeckWrite,
  refreshDeckAfterWrite,
  updateDeckCardOptimistically,
} from './deckWriteState.ts';

const timestamp = '2026-10-12T00:00:00.000Z';
const initialCards = {
  data: [
    { deckId: 'deck', cardId: 'a', board: 1, quantity: 1, note: '' },
    { deckId: 'deck', cardId: 'b', board: 1, quantity: 1, note: '' },
  ],
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function createClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(deckKeys.detail('deck', 'owner'), {
    deck: { id: 'deck', updatedAt: timestamp },
  } as DeckData);
  client.setQueryData(deckKeys.cards('deck', 'owner'), initialCards);
  return client;
}

test('save requires the displayed timestamp and settled, valid queries', async () => {
  const client = createClient();
  try {
    expect(() => assertDeckReadyToSave(client, 'deck', 'owner', timestamp)).not.toThrow();
    expect(() =>
      assertDeckReadyToSave(client, 'deck', 'owner', '2000-01-01T00:00:00.000Z'),
    ).toThrow('Review');
    expect(() => assertDeckReadyToSave(client, 'deck', 'other', timestamp)).toThrow('loading');
    await client.invalidateQueries({ queryKey: deckKeys.cards('deck', 'owner') });
    expect(() => assertDeckReadyToSave(client, 'deck', 'owner', timestamp)).toThrow('loading');
  } finally {
    client.clear();
  }
});

test('simultaneous unscoped writes still refresh the displayed revision', async () => {
  const client = createClient();
  const nextTimestamp = '2026-10-12T00:00:01.000Z';
  const gate = deferred();
  const observer = new QueryObserver(client, {
    queryKey: deckKeys.detail('deck', 'owner'),
    staleTime: Infinity,
    queryFn: async () => ({ deck: { id: 'deck', updatedAt: nextTimestamp } }) as DeckData,
  });
  const unsubscribe = observer.subscribe(() => {});
  const build = () =>
    client.getMutationCache().build(client, {
      mutationKey: ['deck-write', 'deck'],
      mutationFn: () => gate.promise,
      onSettled: () => refreshDeckAfterWrite(client, 'deck', 'owner'),
    });
  const writes = [build().execute(undefined), build().execute(undefined)];
  try {
    gate.resolve();
    await Promise.all(writes);
    expect(client.getQueryData<DeckData>(deckKeys.detail('deck', 'owner'))?.deck.updatedAt).toBe(
      nextTimestamp,
    );
  } finally {
    gate.resolve();
    await Promise.allSettled(writes);
    unsubscribe();
    client.clear();
  }
});

test('pending writes block a save even when mutation gets its deck ID from variables', async () => {
  const client = createClient();
  let finish!: () => void;
  const mutation = client.getMutationCache().build(client, {
    mutationKey: ['deck-write'],
    mutationFn: async (data: { deckId: string }) => {
      expect(data.deckId).toBe('deck');
      return new Promise<void>(resolve => {
        finish = resolve;
      });
    },
  });
  const operation = mutation.execute({ deckId: 'deck' });
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(() => assertDeckReadyToSave(client, 'deck', 'owner', timestamp)).toThrow(
      'edits to finish',
    );
    expect(client.isMutating({ predicate: item => isDeckWrite(item, 'unrelated') })).toBe(0);
    expect(
      isDeckWrite(
        { options: { mutationKey: ['deck-write'] }, state: { variables: 'deck' } },
        'deck',
      ),
    ).toBe(true);
    finish();
    await operation;
    expect(() => assertDeckReadyToSave(client, 'deck', 'owner', timestamp)).not.toThrow();
  } finally {
    finish?.();
    await operation;
    client.clear();
  }
});

test('a queued optimistic failure preserves a preceding successful edit and other viewers', async () => {
  const client = createClient();
  client.setQueryData(deckKeys.cards('deck', 'other'), initialCards);
  let finishFirst!: () => void;
  let failSecond!: (error: Error) => void;
  const firstStarted = deferred();
  const secondStarted = deferred();
  const build = (cardId: string, persist: () => Promise<void>) =>
    client.getMutationCache().build(client, {
      mutationKey: ['deck-write', 'deck'],
      scope: { id: 'deck-write:deck' },
      mutationFn: () =>
        updateDeckCardOptimistically(
          client,
          'deck',
          'owner',
          { id: { cardId, board: 1 }, data: { quantity: 3 } },
          persist,
        ),
    });
  const first = build(
    'a',
    () =>
      new Promise<void>(resolve => {
        finishFirst = resolve;
        firstStarted.resolve();
      }),
  ).execute(undefined);
  const second = build(
    'b',
    () =>
      new Promise<void>((_resolve, reject) => {
        failSecond = reject;
        secondStarted.resolve();
      }),
  )
    .execute(undefined)
    .catch(error => error);
  try {
    await firstStarted.promise;
    expect(
      client
        .getQueryData<typeof initialCards>(deckKeys.cards('deck', 'owner'))
        ?.data.map(card => card.quantity),
    ).toEqual([3, 1]);
    finishFirst();
    await first;
    await secondStarted.promise;
    expect(
      client
        .getQueryData<typeof initialCards>(deckKeys.cards('deck', 'owner'))
        ?.data.map(card => card.quantity),
    ).toEqual([3, 3]);
    failSecond(new Error('Network failure'));
    expect((await second).message).toBe('Network failure');
    expect(
      client
        .getQueryData<typeof initialCards>(deckKeys.cards('deck', 'owner'))
        ?.data.map(card => card.quantity),
    ).toEqual([3, 1]);
    expect(client.getQueryData<typeof initialCards>(deckKeys.cards('deck', 'other'))).toEqual(
      initialCards,
    );
  } finally {
    finishFirst?.();
    failSecond?.(new Error('cleanup'));
    await Promise.allSettled([first, second]);
    client.clear();
  }
});
