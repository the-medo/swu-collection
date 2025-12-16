import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

/**
 * Hook to trigger (re)computation of an entity's prices and fetch the latest data.
 * @param entityId - The ID of the entity
 * @param entityType - deck / collection
 */
export const usePostEntityPrice = (entityId: string | undefined, entityType: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!entityId) {
        throw new Error('ID is required');
      }

      let response;

      if (entityType === 'deck') {
        response = await api.deck[':id'].price.$post({
          param: { id: entityId },
        });
      } else if (entityType === 'collection') {
        // TODO
      }

      if (!response?.ok) {
        throw new Error(response?.statusText);
      }

      return await response.json();
    },
    onSuccess: (result: any) => {
      // Update caches with fresh entity prices instead of refetching
      const prices = result?.data;
      const deckId = Array.isArray(prices) && prices.length > 0 ? prices[0]?.entityId : undefined;

      if (deckId && Array.isArray(prices)) {
        // 1) Update the single deck detail cache (useGetDeck)
        queryClient.setQueryData(['deck', deckId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            // entityPrices are kept alongside the deck detail response
            entityPrices: prices,
          };
        });

        // 2) Update all cached useGetDecks queries (infinite queries)
        const queries = queryClient.getQueriesData({ queryKey: ['decks'] });
        queries.forEach(([qk, qd]: any) => {
          if (!qd?.pages) return;
          let didChange = false;
          const newPages = qd.pages.map((page: any) => {
            if (!page?.data) return page;
            let pageChanged = false;
            const newData = page.data.map((d: any) => {
              if (d?.deck?.id === deckId) {
                pageChanged = true;
                didChange = true;
                return { ...d, entityPrices: prices };
              }
              return d;
            });
            return pageChanged ? { ...page, data: newData } : page;
          });
          if (didChange) {
            queryClient.setQueryData(qk, { ...qd, pages: newPages });
          }
        });
      }

      toast({
        title: 'Prices updated',
        description: 'Latest price data has been fetched.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error updating prices',
        description: error?.toString?.() ?? 'Unknown error',
      });
    },
  });
};
