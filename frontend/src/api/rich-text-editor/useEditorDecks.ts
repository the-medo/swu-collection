import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useSession } from '@/lib/auth-client.ts';

// Separate session-scoped queries keep private choices out of an anonymous editor.
export function useEditorDecks(source: 'mine' | 'public') {
  const session = useSession();
  const userId = session.data?.user.id;
  return useInfiniteQuery({
    queryKey: ['editor-decks', session.data?.session.id ?? 'anonymous', source],
    enabled: !session.isPending && (source === 'public' || !!userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const response = await api.deck.$get(
        {
          query: {
            userId: source === 'mine' ? userId : undefined,
            limit: '20',
            offset: String(pageParam),
            sort: 'deck.updated_at',
            order: 'desc',
          },
        },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load decks');
      return response.json();
    },
    getNextPageParam: (last, pages) =>
      last.pagination.hasMore && last.data.length
        ? pages.reduce((count, page) => count + page.data.length, 0)
        : undefined,
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

export function useEditorDeck(deckId: string | undefined) {
  const session = useSession();
  return useQuery({
    queryKey: ['editor-deck', session.data?.session.id ?? 'anonymous', deckId],
    enabled: !session.isPending,
    queryFn: deckId
      ? async ({ signal }) => {
          const [metadata, contents] = await Promise.all([
            api.deck[':id'].$get({ param: { id: deckId } }, { init: { signal } }),
            api.deck[':id'].card.$get({ param: { id: deckId } }, { init: { signal } }),
          ]);
          if (!metadata.ok) throw await createApiError(metadata, 'This deck is unavailable');
          if (!contents.ok) throw await createApiError(contents, 'Could not load the decklist');
          const { deck } = await metadata.json();
          const { data } = await contents.json();
          return {
            deckId: deck.id,
            name: deck.name || 'Untitled deck',
            leaderIds: [deck.leaderCardId1, deck.leaderCardId2].filter((id): id is string => !!id),
            baseId: deck.baseCardId,
            cards: data
              .filter(card => card.quantity > 0)
              .map(({ cardId, quantity, board }) => ({ cardId, quantity, board })),
          };
        }
      : skipToken,
    retry: false,
    // Resolve the deck reference when the document opens; no ongoing synchronization.
    staleTime: Infinity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
  });
}
