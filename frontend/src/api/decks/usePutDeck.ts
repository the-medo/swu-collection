import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { InferResponseType } from 'hono';
import { ZDeckUpdateRequest } from '../../../../types/ZDeck.ts';

export const usePutDeck = (deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
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

      return response.json() as unknown as { data: any };
    },
    onSuccess: result => {
      const $getDeck = api.deck[':id'].$get;
      type ResType = InferResponseType<typeof $getDeck>;

      // Update the single deck detail cache
      queryClient.setQueryData(['deck', result.data.id], (oldData: ResType) => ({
        ...oldData,
        deck: {
          ...result.data,
        },
      }));

      // Update all cached useGetDecks queries (infinite queries with pages)
      const queries = queryClient.getQueriesData({ queryKey: ['decks'] });
      queries.forEach(([qk, qd]: any) => {
        if (!qd?.pages) return;
        let didChange = false;
        const newPages = qd.pages.map((page: any) => {
          if (!page?.data) return page;
          let pageChanged = false;
          const newData = page.data.map((d: any) => {
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

      toast({
        title: 'Deck updated successfully',
      });
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
