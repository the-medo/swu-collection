import type { InfiniteData, QueryClient } from '@tanstack/react-query';

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

export const applyDeletedDeckCaches = (
  queryClient: QueryClient,
  deckIds: string[],
  affectedCardPoolIds: string[],
) => {
  removeDecksFromListCache(queryClient, deckIds);

  deckIds.forEach(deckId => {
    queryClient.removeQueries({ queryKey: ['deck', deckId], exact: true });
    queryClient.removeQueries({ queryKey: ['deck-content', deckId], exact: true });
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
