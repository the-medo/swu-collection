import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { deckFolderKeys } from '@/api/deck-folders/queryKeys.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { cachedDeckDiscussionIds } from './discussionCache.ts';
import { removeDiscussionCaches } from '../discussions/cache.ts';

type DeckListCache = InfiniteData<{
  data?: { deck?: { id?: string } }[];
}>;

export const removeDecksFromListCache = (queryClient: QueryClient, deckIds: Iterable<string>) => {
  const deletedDeckIds = new Set(deckIds);

  queryClient.setQueriesData<DeckListCache>({ queryKey: ['decks'] }, current => {
    if (!current) return current;

    let didChange = false;
    const pages = current.pages.map(page => {
      if (!page.data) return page;

      const data = page.data.filter(item => {
        const deckId = item.deck?.id;
        return !deckId || !deletedDeckIds.has(deckId);
      });
      if (data.length === page.data.length) return page;

      didChange = true;
      return { ...page, data };
    });

    return didChange ? { ...current, pages } : current;
  });
};

export const removeDeckFromListCache = (queryClient: QueryClient, deckId: string) => {
  removeDecksFromListCache(queryClient, [deckId]);
};

export const invalidateDeckListCaches = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });

export const applyDeletedDeckCaches = (
  queryClient: QueryClient,
  deckIds: string[],
  affectedCardPoolIds: string[],
) => {
  removeDecksFromListCache(queryClient, deckIds);
  void queryClient.invalidateQueries({ queryKey: deckFolderKeys.all });

  deckIds.forEach(deckId => {
    removeDiscussionCaches(queryClient, cachedDeckDiscussionIds(queryClient, deckId), {
      attachmentType: 'deck',
      attachmentId: deckId,
    });
    queryClient.removeQueries({ queryKey: deckDiscussionKeys.deck(deckId) });
    queryClient.removeQueries({ queryKey: ['deck', deckId], exact: false });
    queryClient.removeQueries({ queryKey: ['deck-content', deckId], exact: false });
    queryClient.removeQueries({ queryKey: ['deck-tournament', deckId], exact: true });
    queryClient.removeQueries({ queryKey: ['deck-collection-data', deckId], exact: true });
  });

  queryClient.removeQueries({ queryKey: ['decks-bulk'], exact: false });

  affectedCardPoolIds.forEach(cardPoolId => {
    void queryClient.invalidateQueries({
      queryKey: ['card-pool-decks', cardPoolId],
      exact: false,
    });
    void queryClient.invalidateQueries({ queryKey: ['card-pool', cardPoolId], exact: true });
    queryClient.removeQueries({
      queryKey: ['card-pool-deck-cards', cardPoolId],
      exact: false,
    });
  });
};

export const applyBulkDeletedDeckCaches = async (
  queryClient: QueryClient,
  deckIds: string[],
  affectedCardPoolIds: string[],
) => {
  applyDeletedDeckCaches(queryClient, deckIds, affectedCardPoolIds);
  await invalidateDeckListCaches(queryClient);
};
