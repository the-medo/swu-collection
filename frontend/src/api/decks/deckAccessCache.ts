import type { QueryClient } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { cachedDeckDiscussionIds } from './discussionCache.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import type { DeckVersionsResponse } from './useGetDeckVersions.ts';

export function isSharedPrivateDeck(data: Pick<DeckData, 'deck'> | undefined, viewerId?: string) {
  return !!data && data.deck.public === 0 && data.deck.userId !== viewerId;
}

export async function resetDeniedDeckAccess(
  client: QueryClient,
  id: string,
  viewerId: string | undefined,
) {
  const viewer = viewerId ?? 'anonymous';
  const details = client.getQueriesData<DeckData>({
    queryKey: ['deck'],
    predicate: query => query.queryKey[2] === viewer,
  });
  const histories = client.getQueriesData<DeckVersionsResponse>({
    queryKey: ['deck-versions'],
    predicate: query => query.queryKey[2] === viewer,
  });
  const requested = details.find(([key]) => key[1] === id)?.[1];
  const canonicalId =
    requested?.reference?.deckId ??
    requested?.deck.id ??
    histories.find(([, history]) => history?.data.some(version => version.id === id))?.[1]
      ?.deckId ??
    id;
  const referenceIds = new Set([id, canonicalId]);
  for (const [key, data] of details) {
    if ((data?.reference?.deckId ?? data?.deck.id) === canonicalId && typeof key[1] === 'string')
      referenceIds.add(key[1]);
  }
  for (const [, history] of histories) {
    if (history?.deckId === canonicalId)
      history.data.forEach(version => referenceIds.add(version.id));
  }
  // Clear private data without detaching active observers; their refetch reports the denial.
  const discussionIds = new Set(
    [...referenceIds].flatMap(referenceId => [...cachedDeckDiscussionIds(client, referenceId)]),
  );
  await Promise.all([
    client.resetQueries({
      predicate: query => {
        const [kind, referenceId] = query.queryKey;
        if (typeof referenceId !== 'string' || !referenceIds.has(referenceId)) return false;
        if (kind === 'deck-version-diff') return query.queryKey[3] === viewer;
        return (
          ['deck', 'deck-content', 'deck-versions'].includes(String(kind)) &&
          query.queryKey[2] === viewer
        );
      },
    }),
    ...[...discussionIds].map(discussionId =>
      client.resetQueries({
        queryKey: discussionKeys.discussion(discussionId),
        predicate: query => query.queryKey[3] === (viewerId ?? 'anonymous'),
      }),
    ),
    ...[...referenceIds].map(referenceId =>
      client.resetQueries({
        queryKey: deckDiscussionKeys.deck(referenceId),
        predicate: query => query.queryKey[3] === viewer && query.queryKey[2] !== 'binding',
      }),
    ),
  ]);
}

export function updateDeckPricesCache(
  client: QueryClient,
  id: string,
  viewerId: string | undefined,
  prices: DeckData['entityPrices'],
) {
  client.setQueryData<DeckData>(deckKeys.detail(id, viewerId), current =>
    current ? { ...current, entityPrices: prices } : current,
  );
  void client.invalidateQueries({ queryKey: deckKeys.forCardAll });
}
