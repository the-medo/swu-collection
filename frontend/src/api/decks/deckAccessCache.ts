import type { QueryClient } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { cachedDeckDiscussionIds } from './discussionCache.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import { cachedDeckReferences, isDeckReferenceQuery } from './deckCache.ts';
export { isSharedPrivateDeck } from './deckCache.ts';

export async function resetDeniedDeckAccess(
  client: QueryClient,
  id: string,
  viewerId: string | undefined,
) {
  const viewer = viewerId ?? 'anonymous';
  const { referenceIds } = cachedDeckReferences(client, id, viewerId);
  // Clear private data without detaching active observers; their refetch reports the denial.
  const discussionIds = new Set(
    [...referenceIds].flatMap(referenceId => [...cachedDeckDiscussionIds(client, referenceId)]),
  );
  await Promise.all([
    client.resetQueries({
      predicate: query => isDeckReferenceQuery(query.queryKey, referenceIds, viewerId),
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
