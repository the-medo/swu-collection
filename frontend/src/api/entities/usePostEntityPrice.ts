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
        response = await api.collection[':id'].price.$post({
          param: { id: entityId },
        });
      }

      if (!response?.ok) {
        throw new Error(response?.statusText);
      }

      return await response.json();
    },
    onSuccess: (result: any) => {
      // Update caches with fresh entity prices instead of refetching
      const prices = result?.data;
      const updatedEntityId =
        Array.isArray(prices) && prices.length > 0 ? prices[0]?.entityId : undefined;

      // Helper to upsert by sourceType for a specific entityId
      const upsertBySourceType = (
        existing: any[] | null | undefined,
        incoming: any[],
        entityIdToMatch: string,
      ) => {
        if (!Array.isArray(incoming) || incoming.length === 0) return existing ?? [];
        const relevant = incoming.filter(p => p?.entityId === entityIdToMatch);
        if (relevant.length === 0) return existing ?? [];
        const sourceTypes = new Set(relevant.map(p => p?.sourceType));
        const base = Array.isArray(existing)
          ? existing.filter(
              p => !(p?.entityId === entityIdToMatch && sourceTypes.has(p?.sourceType)),
            )
          : [];
        return [...base, ...relevant];
      };

      if (updatedEntityId && Array.isArray(prices)) {
        if (entityType === 'deck') {
          // 1) Update the single deck detail cache (useGetDeck)
          queryClient.setQueryData(['deck', updatedEntityId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              entityPrices: prices,
            };
          });

          // 2) Update all cached useGetDecks queries (infinite queries)
          const deckQueries = queryClient.getQueriesData({ queryKey: ['decks'] });
          deckQueries.forEach(([qk, qd]: any) => {
            if (!qd?.pages) return;
            let didChange = false;
            const newPages = qd.pages.map((page: any) => {
              if (!page?.data) return page;
              let pageChanged = false;
              const newData = page.data.map((d: any) => {
                if (d?.deck?.id === updatedEntityId) {
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

        if (entityType === 'collection') {
          const collectionId = updatedEntityId;

          // 1) Update the single collection detail cache (useGetCollection)
          queryClient.setQueryData(['collection', collectionId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              entityPrices: upsertBySourceType(oldData?.entityPrices, prices, collectionId),
            };
          });

          // 2) Update all cached public collections queries (useGetCollections - infinite queries)
          const publicQueries = queryClient.getQueriesData({ queryKey: [] as any });
          publicQueries.forEach(([qk, qd]: any) => {
            // qk is an array like ["public-collections-..."]
            const first = Array.isArray(qk) ? qk[0] : undefined;
            if (typeof first !== 'string' || !first.startsWith('public-collections-')) return;
            if (!qd?.pages) return;

            let didChange = false;
            const newPages = qd.pages.map((page: any) => {
              if (!Array.isArray(page)) return page;
              let pageChanged = false;
              const newPage = page.map((item: any) => {
                const id = item?.collection?.id;
                if (id === collectionId) {
                  pageChanged = true;
                  didChange = true;
                  const merged = upsertBySourceType(item?.entityPrices, prices, collectionId);
                  return { ...item, entityPrices: merged };
                }
                return item;
              });
              return pageChanged ? newPage : page;
            });
            if (didChange) {
              queryClient.setQueryData(qk, { ...qd, pages: newPages });
            }
          });

          // 3) Update all cached user collections queries (useGetUserCollections)
          const userCollectionsQueries = queryClient.getQueriesData({ queryKey: ['collections'] });
          userCollectionsQueries.forEach(([qk, qd]: any) => {
            if (!qd) return;
            const newEntityPrices = upsertBySourceType(qd?.entityPrices, prices, collectionId);
            if (newEntityPrices !== qd?.entityPrices) {
              queryClient.setQueryData(qk, { ...qd, entityPrices: newEntityPrices });
            }
          });
        }
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
