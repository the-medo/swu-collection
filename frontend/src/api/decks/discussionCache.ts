import type { QueryClient } from '@tanstack/react-query';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import type { DiscussionInfo } from '../../../../shared/types/discussions.ts';

export function cachedDeckDiscussionIds(client: QueryClient, deckId: string) {
  return new Set(
    client
      .getQueriesData<DiscussionInfo | string>({
        queryKey: deckDiscussionKeys.deck(deckId),
        predicate: query => ['discussion', 'binding'].includes(String(query.queryKey[2])),
      })
      .flatMap(([, info]) => (typeof info === 'string' ? [info] : info ? [info.id] : [])),
  );
}

export function invalidateBoundDiscussion(client: QueryClient, deckId: string) {
  return Promise.all(
    [...cachedDeckDiscussionIds(client, deckId)].map(id =>
      client.invalidateQueries({ queryKey: discussionKeys.discussion(id) }),
    ),
  );
}

export async function invalidateDeckDiscussion(
  client: QueryClient,
  deckId: string,
  articleChanged = false,
) {
  await Promise.all([
    client.invalidateQueries({
      queryKey: deckDiscussionKeys.deck(deckId),
      // Recheck guide access after writes as well as comments, including failed writes.
      predicate: query => !['discussion', 'binding'].includes(String(query.queryKey[2])),
    }),
    ...(articleChanged
      ? [...cachedDeckDiscussionIds(client, deckId)].map(id =>
          client.invalidateQueries({
            queryKey: discussionKeys.discussion(id),
            predicate: query => query.queryKey[2] === 'info',
          }),
        )
      : []),
    client.invalidateQueries({
      queryKey: ['decks'],
      predicate: query => {
        if (articleChanged) return true;
        const data = query.state.data as
          | { pages?: { data?: { deck?: { id?: string } }[] }[] }
          | undefined;
        return !!data?.pages?.some(page => page.data?.some(row => row.deck?.id === deckId));
      },
    }),
    ...(articleChanged
      ? [
          client.invalidateQueries({ queryKey: ['deck', deckId] }),
          client.invalidateQueries({ queryKey: ['decks-bulk'] }),
          client.invalidateQueries({ queryKey: ['deck-folders'] }),
          client.invalidateQueries({ queryKey: ['public-decks-for-card'] }),
          client.invalidateQueries({ queryKey: ['team-decks'] }),
          client.invalidateQueries({ queryKey: ['tournament-decks'] }),
        ]
      : []),
  ]);
}
