import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { DeckData } from '../../../../types/Deck.ts';
import { ZDeckUpdateRequest } from '../../../../types/ZDeck.ts';
import { useUser } from '@/hooks/useUser.ts';
import { deckKeys } from './queryKeys.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { invalidateBoundDiscussion } from './discussionCache.ts';
import { refreshDeckAfterWrite } from './deckWriteState.ts';
import { dailySealedKeys } from '@/api/card-pools/dailySealedKeys.ts';

export const usePutDeck = (deckId: string | undefined) => {
  const queryClient = useQueryClient();
  const viewer = useUser();

  return useMutation({
    mutationKey: ['deck-write', deckId],
    scope: deckId ? { id: `deck-write:${deckId}` } : undefined,
    mutationFn: async (data: ZDeckUpdateRequest & { deckId?: string }) => {
      if (!deckId && !data.deckId) {
        throw new Error('Deck id is required');
      }

      const response = await api.deck[':id'].$put({
        param: { id: deckId ?? data.deckId! },
        json: data,
      });

      if (!response.ok) {
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while updating the deck'
            : response.statusText,
        );
      }

      return (await response.json()) as { data: DeckData['deck'] };
    },
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: deckDiscussionKeys.deck(result.data.id) });
      void invalidateBoundDiscussion(queryClient, result.data.id);
      void queryClient.invalidateQueries({ queryKey: dailySealedKeys.all });

      // Update the single deck detail cache
      queryClient.setQueryData<DeckData>(deckKeys.detail(result.data.id, viewer?.id), oldData =>
        oldData ? { ...oldData, deck: result.data } : oldData,
      );

      // Update all cached useGetDecks queries (infinite queries with pages)
      const queries = queryClient.getQueriesData<InfiniteData<{ data: DeckData[] }>>({
        queryKey: ['decks'],
      });
      queries.forEach(([qk, qd]) => {
        if (!qd?.pages) return;
        let didChange = false;
        const newPages = qd.pages.map(page => {
          if (!page?.data) return page;
          let pageChanged = false;
          const newData = page.data.map(d => {
            if (d?.deck?.id === result.data.id) {
              pageChanged = true;
              didChange = true;
              return { ...d, deck: { ...d.deck, ...result.data } };
            }
            return d;
          });
          return pageChanged ? { ...page, data: newData } : page;
        });
        if (didChange) {
          queryClient.setQueryData(qk, { ...qd, pages: newPages });
        }
      });
      // A changed timestamp or format can alter both list order and membership.
      void queryClient.invalidateQueries({ queryKey: ['decks'] });

      void queryClient.invalidateQueries({ queryKey: ['deck-versions'] });
      void queryClient.invalidateQueries({ queryKey: ['deck-version-diff'] });

      toast({
        title: 'Deck updated successfully',
      });
    },
    onSettled: (_result, _error, variables) => {
      const id = deckId ?? variables.deckId;
      return id ? refreshDeckAfterWrite(queryClient, id, viewer?.id) : undefined;
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while updating the deck',
        description: (error as Error).toString(),
      });
    },
  });
};
