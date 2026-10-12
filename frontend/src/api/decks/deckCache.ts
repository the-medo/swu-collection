import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import type { DeckVersionsResponse } from './useGetDeckVersions.ts';
import { deckKeys } from './queryKeys.ts';

export function isSharedPrivateDeck(data: Pick<DeckData, 'deck'> | undefined, viewerId?: string) {
  return !!data && data.deck.public === 0 && data.deck.userId !== viewerId;
}

export function cachedDeckReferences(client: QueryClient, id: string, viewerId?: string) {
  const viewer = viewerId ?? 'anonymous';
  const details = client.getQueriesData<DeckData>({
    queryKey: deckKeys.allDetails,
    predicate: query => query.queryKey[2] === viewer,
  });
  const histories = client.getQueriesData<DeckVersionsResponse>({
    queryKey: deckKeys.allVersions,
    predicate: query => query.queryKey[2] === viewer,
  });
  const requested = details.find(([key]) => key[1] === id)?.[1];
  const deckId =
    requested?.reference?.deckId ??
    requested?.deck.id ??
    histories.find(([, history]) => history?.data?.some(version => version.id === id))?.[1]
      ?.deckId ??
    id;
  const referenceIds = new Set([id, deckId]);
  for (const [key, data] of details) {
    if ((data?.reference?.deckId ?? data?.deck.id) === deckId && typeof key[1] === 'string')
      referenceIds.add(key[1]);
  }
  for (const [, history] of histories) {
    if (history?.deckId === deckId) history.data.forEach(version => referenceIds.add(version.id));
  }
  return { deckId, referenceIds };
}

export function isDeckReferenceQuery(key: QueryKey, referenceIds: Set<string>, viewerId?: string) {
  if (typeof key[1] !== 'string' || !referenceIds.has(key[1])) return false;
  const viewer = viewerId ?? 'anonymous';
  if (key[0] === deckKeys.allDiffs[0]) return key[3] === viewer;
  return (
    [deckKeys.allDetails[0], deckKeys.allCards[0], deckKeys.allVersions[0]].some(
      kind => kind === key[0],
    ) && key[2] === viewer
  );
}

export function needsDeckReferenceFetch(client: QueryClient, id: string, viewerId?: string) {
  const detail = client.getQueryState<DeckData>(deckKeys.detail(id, viewerId));
  const cards = client.getQueryState(deckKeys.cards(id, viewerId));
  return (
    !detail?.data ||
    !cards?.data ||
    detail.isInvalidated ||
    cards.isInvalidated ||
    detail.status === 'error' ||
    cards.status === 'error' ||
    isSharedPrivateDeck(detail.data, viewerId)
  );
}

export async function invalidateDeckReferences(
  client: QueryClient,
  id: string,
  viewerId?: string,
  additionalIds: string[] = [],
) {
  const { referenceIds } = cachedDeckReferences(client, id, viewerId);
  additionalIds.forEach(referenceId => referenceIds.add(referenceId));
  const matches = (key: QueryKey) => isDeckReferenceQuery(key, referenceIds, viewerId);
  // Read metadata before cards so a concurrent server edit leaves a conservative save timestamp.
  await client.invalidateQueries({
    queryKey: deckKeys.allDetails,
    predicate: query => matches(query.queryKey),
  });
  await client.invalidateQueries({
    predicate: query => query.queryKey[0] !== deckKeys.allDetails[0] && matches(query.queryKey),
  });
  // Bulk queries populate inactive detail/card caches, so their loader must respect invalidation.
  await client.invalidateQueries({
    queryKey: deckKeys.allBulk,
    predicate: query =>
      query.queryKey[2] === (viewerId ?? 'anonymous') &&
      typeof query.queryKey[1] === 'string' &&
      query.queryKey[1].split(',').some(id => referenceIds.has(id)),
  });
}
